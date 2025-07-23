// script.js (全文・修正版)

// --- サービス設定 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, query, where, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEcwh528U2-e8MTENHHsQAny2ES3Jnm40",
    authDomain: "jikoshokai-9f75c.firebaseapp.com",
    projectId: "jikoshokai-9f75c",
    storageBucket: "jikoshokai-9f75c.firebasestorage.app",
    messagingSenderId: "701041971815",
    appId: "1:701041971815:web:1bc7c96abfa0a398d0fac2"
  };

// Gemini APIキー
const GEMINI_API_KEY = 'AIzaSyCodqLp1f3AvMlqaRXfuA8JBCglkObbK8k'; // あなたのGemini APIキーをここに貼り付け


// --- Firebaseの初期化 ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);


// --- グローバル変数 ---
let profiles = [];
let currentProfileIndex = 0;
let currentProfile = null;
let lastUserMessage = '';


// --- DOM要素の取得 ---
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatLog = document.getElementById('chat-log');
const personImage = document.getElementById('person-image');
const speechBubble = document.getElementById('speech-bubble');
const aiResponseText = document.getElementById('ai-response-text');
const switchPersonBtn = document.getElementById('switch-person-btn');
const personalizeBtn = document.getElementById('personalize-btn');
const mainContent = document.getElementById('main-content');
const chatFooter = document.getElementById('chat-footer');
const personalizationScreen = document.getElementById('personalization-screen');
const personalizationQuestions = document.getElementById('personalization-questions');
const savePersonalizationBtn = document.getElementById('save-personalization-btn');
const addPersonBtn = document.getElementById('add-person-btn');
const addPersonModal = document.getElementById('add-person-modal');
const addPersonForm = document.getElementById('add-person-form');
const cancelAddPersonBtn = document.getElementById('cancel-add-person-btn');


// --- イベントリスナー ---
chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = userInput.value.trim();
    if (userMessage) {
        lastUserMessage = userMessage;
        appendMessage('user', userMessage);
        getAIResponse(userMessage);
        userInput.value = '';
    }
});

switchPersonBtn.addEventListener('click', () => {
    if (profiles.length === 0) return;
    currentProfileIndex = (currentProfileIndex + 1) % profiles.length;
    const nextProfileId = profiles[currentProfileIndex].id;
    loadProfile(nextProfileId);
});

personalizeBtn.addEventListener('click', async () => {
    if (!currentProfile) return;
    const profileIdToEdit = profiles[currentProfileIndex].id;
    const email = prompt("編集するプロフィールのメールアドレスを入力してください:", `${profiles[currentProfileIndex].email || ''}`);
    if (!email) return;
    const password = prompt("パスワードを入力してください:");
    if (!password) return;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert(`認証に成功しました。「${currentProfile.name}」のパーソナライズを開始します。`);
        startPersonalization();
    } catch (error) {
        alert("認証に失敗しました。");
        console.error("認証エラー:", error);
    }
});

savePersonalizationBtn.addEventListener('click', async () => {
    const profileIdToUpdate = profiles[currentProfileIndex].id;
    let newKnowledge = '';
    const feedbackItems = personalizationQuestions.querySelectorAll('.feedback-item');
    const feedbackIdsToDelete = [];
    feedbackItems.forEach(item => {
        const question = item.querySelector('.feedback-question').textContent.replace('以前の質問: ', '');
        const correctAnswer = item.querySelector('textarea').value.trim();
        if (correctAnswer) {
            newKnowledge += `質問: ${question}\n回答: ${correctAnswer}\n\n`;
            feedbackIdsToDelete.push(item.dataset.feedbackId);
        }
    });
    const questionItems = personalizationQuestions.querySelectorAll('.question-item');
    questionItems.forEach(item => {
        const question = item.querySelector('label').textContent;
        const answer = item.querySelector('textarea').value.trim();
        if (answer) {
            newKnowledge += `質問: ${question}\n回答: ${answer}\n\n`;
        }
    });
    if (!newKnowledge && currentProfile.knowledge) {
        newKnowledge = currentProfile.knowledge;
    } else if (!newKnowledge && !currentProfile.knowledge) {
        alert('少なくとも1つの質問に回答してください。');
        return;
    }
    try {
        const docRef = doc(db, "profiles", profileIdToUpdate);
        await updateDoc(docRef, { knowledge: newKnowledge });
        for (const id of feedbackIdsToDelete) {
            await deleteDoc(doc(db, "feedback", id));
        }
        alert('知識ベースが正常に更新されました！');
        personalizationScreen.classList.add('hidden');
        mainContent.style.display = 'flex';
        chatFooter.style.display = 'flex';
        loadProfile(profileIdToUpdate);
    } catch (error) {
        console.error("知識ベースの更新エラー:", error);
        alert("保存中にエラーが発生しました。");
    }
});

chatLog.addEventListener('click', async (event) => {
    if (event.target.classList.contains('bad-feedback-btn')) {
        const button = event.target;
        const profileId = profiles[currentProfileIndex].id;
        try {
            await addDoc(collection(db, "feedback"), {
                profileId: profileId,
                question: button.dataset.question,
                badAnswer: button.dataset.answer,
                timestamp: serverTimestamp()
            });
            alert('フィードバックを送信しました。');
            button.textContent = '送信済';
            button.disabled = true;
        } catch (error) {
            console.error("フィードバックの保存エラー:", error);
            alert("フィードバックの送信に失敗しました。");
        }
    }
});

addPersonBtn.addEventListener('click', () => {
    addPersonModal.classList.remove('hidden');
});
cancelAddPersonBtn.addEventListener('click', () => {
    addPersonModal.classList.add('hidden');
});

addPersonForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('new-person-name').value;
    const email = document.getElementById('new-person-email').value;
    const password = document.getElementById('new-person-password').value;
    const imageFile = document.getElementById('new-person-image').files[0];
    const blurAmount = document.getElementById('new-person-blur').value;

    if (!name || !email || !password || !imageFile) {
        alert('すべての項目を入力してください。');
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        const storageRef = ref(storage, `profile_images/${userId}`);
        await uploadBytes(storageRef, imageFile);
        const imageUrl = await getDownloadURL(storageRef);
        await setDoc(doc(db, "profiles", userId), {
            name: name,
            imageUrl: imageUrl,
            email: email, // メールアドレスも保存
            knowledge: `こんにちは、${name}です。よろしくお願いします。`,
            blurAmount: Number(blurAmount)
        });
        alert('新しい人物が追加されました！');
        addPersonForm.reset();
        addPersonModal.classList.add('hidden');
        loadAllProfiles();
    } catch (error) {
        console.error("人物の追加エラー:", error);
        alert("エラーが発生しました: " + error.message);
    }
});


// --- 関数の定義 ---

async function loadAllProfiles() {
    try {
        const querySnapshot = await getDocs(collection(db, "profiles"));
        profiles = [];
        querySnapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        if (profiles.length > 0) {
            currentProfileIndex = 0;
            loadProfile(profiles[currentProfileIndex].id);
        } else {
            alert("プロフィールが1件も登録されていません。");
        }
    } catch (error) {
        console.error("全プロフィールの読み込みエラー:", error);
    }
}

async function loadProfile(profileId) {
    try {
        const docRef = doc(db, "profiles", profileId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentProfile = docSnap.data();
            personImage.src = currentProfile.imageUrl || './placeholder.png';
            personImage.style.filter = `blur(${currentProfile.blurAmount || 0}px)`;
            chatLog.innerHTML = ''; // ログをクリア
            appendMessage('ai', `こんにちは！${currentProfile.name}です。何でも質問してください。`);
        } else {
            console.error("プロフィールが見つかりません:", profileId);
        }
    } catch (error) {
        console.error("プロフィールの読み込みエラー:", error);
    }
}

async function startPersonalization() {
    mainContent.style.display = 'none';
    chatFooter.style.display = 'none';
    personalizationScreen.classList.remove('hidden');
    personalizationQuestions.innerHTML = '<p>準備中...</p>';
    let feedbackHTML = '';
    const profileId = profiles[currentProfileIndex].id;
    const feedbackQuery = query(collection(db, "feedback"), where("profileId", "==", profileId));
    const feedbackSnapshot = await getDocs(feedbackQuery);
    if (!feedbackSnapshot.empty) {
        feedbackHTML += '<h3>不評だった回答の修正</h3>';
        feedbackSnapshot.forEach(feedbackDoc => {
            const feedback = feedbackDoc.data();
            feedbackHTML += `
                <div class="feedback-item" data-feedback-id="${feedbackDoc.id}">
                    <p class="feedback-question">以前の質問: ${feedback.question}</p>
                    <p class="feedback-bad-answer">不評だった回答: 「${feedback.badAnswer}」</p>
                    <label for="corr-${feedbackDoc.id}">理想的な回答:</label>
                    <textarea id="corr-${feedbackDoc.id}" rows="3"></textarea>
                </div><hr>`;
        });
    }
    const promptForQuestions = `あなたは友達です。人物の個性、スキル、趣味、経歴などを理解するための5つの質問を考えてください。番号付きリストで出力してください。`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptForQuestions }] }] })
        });
        if (!response.ok) { throw new Error('API Error'); }
        const data = await response.json();
        const questionsText = data.candidates[0].content.parts[0].text;
        personalizationQuestions.innerHTML = feedbackHTML;
        personalizationQuestions.innerHTML += '<h3>新しい知識の追加</h3>';
        const questions = questionsText.split('\n').filter(q => q.trim() !== '');
        questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.classList.add('question-item');
            questionItem.innerHTML = `<label for="q-${index}">${question}</label><textarea id="q-${index}" rows="3"></textarea>`;
            personalizationQuestions.appendChild(questionItem);
        });
    } catch (error) {
        console.error("質問の生成エラー:", error);
        personalizationQuestions.innerHTML = '<p>エラーが発生しました。</p>';
    }
}

function appendMessage(sender, message) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', `${sender}-message`);
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
    if (sender === 'ai') {
        const badButton = document.createElement('button');
        badButton.textContent = 'Bad';
        badButton.classList.add('bad-feedback-btn');
        badButton.dataset.question = lastUserMessage;
        badButton.dataset.answer = message;
        messageContainer.appendChild(badButton);
    }
    chatLog.appendChild(messageContainer);
    chatLog.scrollTop = chatLog.scrollHeight;
}

async function getAIResponse(userMessage) {
    if (!currentProfile) { return; }
    const prompt = `あなたは「${currentProfile.name}」という人物のAIです。以下の「知識」に基づき、あなた自身の言葉としてユーザーの質問に答えてください。# 知識\n${currentProfile.knowledge}\n# ユーザーからの質問\n${userMessage}`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) { throw new Error('API Error'); }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0]) {
             const aiMessage = data.candidates[0].content.parts[0].text;
             appendMessage('ai', aiMessage.trim());
        } else { throw new Error('Invalid response format'); }
    } catch (error) {
        console.error('APIリクエストエラー:', error);
        appendMessage('ai', '申し訳ありません、エラーが発生しました。');
    }
}


// --- 初期化処理 ---
loadAllProfiles();
