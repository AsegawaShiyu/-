// script.js

// --- サービス設定 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
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
        appendMessage('user', userMessage);
        getAIResponse(userMessage);
        userInput.value = '';
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


// --- 関数の定義 ---

/**
 * パーソナライズを開始する関数
 */
async function startPersonalization() {
    mainContent.style.display = 'none';
    chatFooter.style.display = 'none';
    personalizationScreen.classList.remove('hidden');
    personalizationQuestions.innerHTML = '<p>質問を生成中...</p>';

    const promptForQuestions = `
        あなたは優秀なインタビュアーです。
        ある人物の個性、スキル、趣味、価値観などを深く理解するために、最も重要な5つの質問を考えてください。
        質問は改行して、番号付きリスト（例: 1. ...）で出力してください。
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptForQuestions }] }] })
        });

        if (!response.ok) {
            throw new Error('APIからの応答が正常ではありません。');
        }

        const data = await response.json();
        const questionsText = data.candidates[0].content.parts[0].text;
        
        personalizationQuestions.innerHTML = '';
        const questions = questionsText.split('\n').filter(q => q.trim() !== '');
        
        questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.classList.add('question-item');
            questionItem.innerHTML = `
                <label for="q-${index}">${question}</label>
                <textarea id="q-${index}" rows="3"></textarea>
            `;
            personalizationQuestions.appendChild(questionItem);
        });

    } catch (error) {
        console.error("質問の生成エラー:", error);
        personalizationQuestions.innerHTML = '<p>エラーが発生しました。もう一度お試しください。</p>';
    }
}

/**
 * 指定されたIDのプロフィールをFirestoreから読み込む関数
 * @param {string} profileId - FirestoreのドキュメントID (例: 'person_01')
 */
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
    } catch (error) {
        console.error("プロフィールの読み込みエラー:", error);
    }
}

/**
 * チャットログにメッセージを追加する関数
 * @param {string} sender - 'user' または 'ai'
 * @param {string} message - 表示するメッセージ
 */
function appendMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * AIからの返信を取得して表示する
 * @param {string} userMessage - ユーザーが入力したメッセージ
 */
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
        } else {
            console.error('無効なレスポンス形式:', data);
            throw new Error('AIからの応答形式が正しくありません。');
        }

    } catch (error) {
        console.error('APIリクエストエラー:', error);
        showSpeechBubble('申し訳ありません、エラーが発生しました。');
    }
}

/**
 * 吹き出しにテキストを表示する関数
 * @param {string} text - 表示するテキスト
 */
function showSpeechBubble(text) {
    aiResponseText.textContent = text;
    speechBubble.classList.remove('hidden');

    setTimeout(() => {
        speechBubble.classList.add('hidden');
    }, 7000);
}


// --- 初期化処理 ---
// ページが読み込まれたら、リストの最初のプロフィールを読み込む
loadProfile(profileIds[currentProfileIndex]);
