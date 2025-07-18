// script.js

// --- サービス設定 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
// ✅ addDoc, collection を追加でインポート
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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


// --- グローバル変数 ---
let currentProfile = null;
const profileIds = ['person_01', 'person_02'];
let currentProfileIndex = 0;
let lastUserMessage = ''; // ✅ ユーザーの最後の質問を保持する変数


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


// --- イベントリスナー ---
chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = userInput.value.trim();
    if (userMessage) {
        lastUserMessage = userMessage; // ✅ 質問をグローバル変数に保存
        appendMessage('user', userMessage);
        getAIResponse(userMessage);
        userInput.value = '';
    }
});

// ✅ chatLog全体にイベントリスナーを設定（イベント委任）
chatLog.addEventListener('click', async (event) => {
    // クリックされたのがBadボタンかどうかを判定
    if (event.target.classList.contains('bad-feedback-btn')) {
        const button = event.target;
        const badAnswer = button.dataset.answer;
        const question = button.dataset.question;
        const profileId = profileIds[currentProfileIndex];

        try {
            // Firestoreの'feedback'コレクションにデータを追加
            await addDoc(collection(db, "feedback"), {
                profileId: profileId,
                question: question,
                badAnswer: badAnswer,
                timestamp: serverTimestamp() // ✅ サーバーのタイムスタンプを記録
            });
            alert('フィードバックを送信しました。ありがとうございます！');
            button.textContent = '送信済';
            button.disabled = true; // ボタンを無効化
        } catch (error) {
            console.error("フィードバックの保存エラー:", error);
            alert("フィードバックの送信に失敗しました。");
        }
    }
});

switchPersonBtn.addEventListener('click', () => {
    currentProfileIndex = (currentProfileIndex + 1) % profileIds.length;
    const nextProfileId = profileIds[currentProfileIndex];
    loadProfile(nextProfileId);
});

personalizeBtn.addEventListener('click', async () => {
    const profileIdToEdit = profileIds[currentProfileIndex];
    const email = prompt("編集するプロフィールのメールアドレスを入力してください:", `${profileIdToEdit}@example.com`);
    if (!email) return;
    const password = prompt("パスワードを入力してください:");
    if (!password) return;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert(`認証に成功しました。「${currentProfile.name}」のパーソナライズを開始します。`);
        startPersonalization();
    } catch (error) {
        alert("認証に失敗しました。メールアドレスまたはパスワードが正しくありません。");
        console.error("認証エラー:", error);
    }
});

savePersonalizationBtn.addEventListener('click', async () => {
    const profileIdToUpdate = profileIds[currentProfileIndex];
    let newKnowledge = '';

    // ✅ 修正されたフィードバックから知識を生成
    const feedbackItems = personalizationQuestions.querySelectorAll('.feedback-item');
    const feedbackIdsToDelete = [];
    feedbackItems.forEach(item => {
        const question = item.querySelector('.feedback-question').textContent;
        const correctAnswer = item.querySelector('textarea').value.trim();
        if (correctAnswer) {
            newKnowledge += `質問: ${question}\n回答: ${correctAnswer}\n\n`;
            feedbackIdsToDelete.push(item.dataset.feedbackId); // 削除するIDを記録
        }
    });

    // ✅ 新しい質問への回答から知識を生成
    const questionItems = personalizationQuestions.querySelectorAll('.question-item');
    questionItems.forEach(item => {
        const question = item.querySelector('label').textContent;
        const answer = item.querySelector('textarea').value.trim();
        if (answer) {
            newKnowledge += `質問: ${question}\n回答: ${answer}\n\n`;
        }
    });

    if (!newKnowledge && currentProfile.knowledge) {
        newKnowledge = currentProfile.knowledge; // 何も入力されなかった場合は元の知識を維持
    } else if (!newKnowledge && !currentProfile.knowledge) {
        alert('少なくとも1つの質問に回答してください。');
        return;
    }

    try {
        // Firestoreのドキュメントを更新
        const docRef = doc(db, "profiles", profileIdToUpdate);
        await updateDoc(docRef, { knowledge: newKnowledge });

        // ✅ 修正済みのフィードバックを削除
        for (const id of feedbackIdsToDelete) {
            await deleteDoc(doc(db, "feedback", id));
        }
        
        alert('知識ベースが正常に更新されました！');
        
        // パーソナライズ画面を閉じてメイン画面に戻る
        personalizationScreen.classList.add('hidden');
        mainContent.style.display = 'flex';
        chatFooter.style.display = 'flex';
        
        loadProfile(profileIdToUpdate);

    } catch (error) {
        console.error("知識ベースの更新エラー:", error);
        alert("保存中にエラーが発生しました。");
    }
});

// chatLog全体にイベントリスナーを設定
chatLog.addEventListener('click', async (event) => {
    
    // 1. クリックされた要素が「Bad」ボタンか確認
    if (event.target.classList.contains('bad-feedback-btn')) {
        const button = event.target;
        
        // 2. ボタンに保存しておいた質問と回答のデータを取得
        const badAnswer = button.dataset.answer;
        const question = button.dataset.question;
        const profileId = profileIds[currentProfileIndex];

        // 3. Firestoreにフィードバック内容を非同期で保存
        try {
            await addDoc(collection(db, "feedback"), {
                profileId: profileId,
                question: question,
                badAnswer: badAnswer,
                timestamp: serverTimestamp()
            });
            
            // 4. 成功したらユーザーに通知し、ボタンを無効化
            alert('フィードバックを送信しました。ありがとうございます！');
            button.textContent = '送信済';
            button.disabled = true;
            
        } catch (error) {
            // エラー処理
            console.error("フィードバックの保存エラー:", error);
            alert("フィードバックの送信に失敗しました。");
        }
    }
});
// --- 関数の定義 ---

/**
 * チャットログにメッセージを追加する関数
 * @param {string} sender - 'user' または 'ai'
 * @param {string} message - 表示するメッセージ
 */
function appendMessage(sender, message) {
    // 1. メッセージ全体を囲むコンテナ(div)を作成
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', `${sender}-message`);

    // 2. メッセージ本文(p)を作成
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);

    // 3. AIのメッセージの場合、Badボタンを追加
    if (sender === 'ai') {
        const badButton = document.createElement('button');
        badButton.textContent = 'Bad';
        badButton.classList.add('bad-feedback-btn');
        // ボタンに質問と回答の情報を保持させる
        badButton.dataset.question = lastUserMessage;
        badButton.dataset.answer = message;
        messageContainer.appendChild(badButton);
    }
    
    // 4. 作成したメッセージをチャットログに追加して画面に表示
    chatLog.appendChild(messageContainer);
    // 5. 常に最新のメッセージが見えるように、一番下まで自動スクロール
    chatLog.scrollTop = chatLog.scrollHeight;
}

async function startPersonalization() {
    mainContent.style.display = 'none';
    chatFooter.style.display = 'none';
    personalizationScreen.classList.remove('hidden');
    personalizationQuestions.innerHTML = '<p>フィードバックと質問を準備中...</p>';

    let feedbackHTML = '';
    // ✅ まず、未解決のフィードバックを取得
    const feedbackQuery = query(collection(db, "feedback"), where("profileId", "==", profileIds[currentProfileIndex]));
    const feedbackSnapshot = await getDocs(feedbackQuery);

    if (!feedbackSnapshot.empty) {
        feedbackHTML += '<h3>不評だった回答の修正</h3>';
        feedbackSnapshot.forEach(feedbackDoc => {
            const feedback = feedbackDoc.data();
            feedbackHTML += `
                <div class="feedback-item" data-feedback-id="${feedbackDoc.id}">
                    <p class="feedback-question">以前の質問: ${feedback.question}</p>
                    <p class="feedback-bad-answer">不評だった回答: 「${feedback.badAnswer}」</p>
                    <label for="corr-${feedbackDoc.id}">この質問に対する理想的な回答を入力してください:</label>
                    <textarea id="corr-${feedbackDoc.id}" rows="3"></textarea>
                </div>
                <hr>
            `;
        });
    }

    // AIにインタビューのための質問を生成させる
    const promptForQuestions = `あなたは優秀なインタビュアーです...`; // ...変更なし
    try {
        const response = await fetch(/* ... */);
        if (!response.ok) { throw new Error('APIからの応答が正常ではありません。'); }
        const data = await response.json();
        const questionsText = data.candidates[0].content.parts[0].text;
        
        // 取得したフィードバックと新しい質問を合わせて表示
        personalizationQuestions.innerHTML = feedbackHTML;
        personalizationQuestions.innerHTML += '<h3>新しい知識の追加</h3>';

        const questions = questionsText.split('\n').filter(q => q.trim() !== '');
        questions.forEach((question, index) => { /* ... */ });

    } catch (error) { /* ... */ }
}

async function loadProfile(profileId) {
    try {
        const docRef = doc(db, "profiles", profileId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentProfile = docSnap.data();
            personImage.src = currentProfile.imageUrl || './placeholder.png';
            showSpeechBubble(`こんにちは！${currentProfile.name}です。何でも質問してください。`);
        } else {
            console.error("プロフィールが見つかりません:", profileId);
            showSpeechBubble("エラー: プロフィールが見つかりません。");
        }
    } catch (error) { console.error("プロフィールの読み込みエラー:", error); }
}

async function getAIResponse(userMessage) {
    if (!currentProfile) {
        showSpeechBubble("最初にプロフィールを読み込んでください。");
        return;
    }
    const prompt = `
        あなたは「${currentProfile.name}」という人物のAIです。
        以下の「知識」に基づいて、あなた自身の言葉としてユーザーからの質問に答えてください。
        # 知識
        ${currentProfile.knowledge}
        # ユーザーからの質問
        ${userMessage}
    `;
    showSpeechBubble('考え中...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) {
            console.error('API Response Error:', response.status, response.statusText);
            throw new Error('APIからの応答が正常ではありません。');
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0]) {
             const aiMessage = data.candidates[0].content.parts[0].text;
             showSpeechBubble(aiMessage.trim());
            // ✅ AIのメッセージをログにも追加
             appendMessage('ai', aiMessage.trim());
        } else {
            console.error('無効なレスポンス形式:', data);
            throw new Error('AIからの応答形式が正しくありません。');
        }
    } catch (error) {
        console.error('APIリクエストエラー:', error);
        showSpeechBubble('申し訳ありません、エラーが発生しました。');
    }
}

function showSpeechBubble(text) {
    aiResponseText.textContent = text;
    speechBubble.classList.remove('hidden');
    setTimeout(() => {
        speechBubble.classList.add('hidden');
    }, 7000);
}


// --- 初期化処理 ---
loadProfile(profileIds[currentProfileIndex]);
