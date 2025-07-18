// script.js

// --- サービス設定 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// ✅ Firebase Authenticationの関数をインポート
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
const auth = getAuth(app); // ✅ Authサービスを初期化


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
const personalizeBtn = document.getElementById('personalize-btn'); // ✅ ボタン要素を取得


// --- イベントリスナー ---
chatForm.addEventListener('submit', (event) => { /* ...変更なし... */ });
switchPersonBtn.addEventListener('click', () => { /* ...変更なし... */ });

// ✅ パーソナライズボタンがクリックされたときの処理を追加
personalizeBtn.addEventListener('click', async () => {
    // 現在表示しているプロフィールのIDを取得
    const profileIdToEdit = profileIds[currentProfileIndex];

    // 簡易的な入力ダイアログでメールとパスワードを要求
    const email = prompt("編集するプロフィールのメールアドレスを入力してください:", `${profileIdToEdit}@example.com`);
    if (!email) return; // キャンセルされた場合

    const password = prompt("パスワードを入力してください:");
    if (!password) return; // キャンセルされた場合

    try {
        // Firebase Authenticationでサインインを試みる
        await signInWithEmailAndPassword(auth, email, password);

        // ログイン成功
        alert(`認証に成功しました。「${currentProfile.name}」のパーソナライズを開始します。`);
        
        // ここにパーソナライズ（AIからの質問など）の処理を書いていく
        startPersonalization();

    } catch (error) {
        // ログイン失敗
        alert("認証に失敗しました。メールアドレスまたはパスワードが正しくありません。");
        console.error("認証エラー:", error);
    }
});


// --- 関数の定義 ---

/**
 * ✅ パーソナライズを開始する関数（今はアラートのみ）
 */
function startPersonalization() {
    // 次のステップで、ここにAIからの質問を表示するUIの処理などを追加します。
    console.log("パーソナライズモードに移行します。");
}

/* loadProfile, appendMessage, getAIResponse, showSpeechBubble の各関数は変更ありません。
  以下に全文を記載します。
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
    } catch (error) { console.error("プロフィールの読み込みエラー:", error); }
}

function appendMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight;
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
