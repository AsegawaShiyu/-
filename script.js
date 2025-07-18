// script.js

// --- サービス設定（変更なし） ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
// ✅ docとgetDocを追加でインポート
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEcwh528U2-e8MTENHHsQAny2ES3Jnm40",
    authDomain: "jikoshokai-9f75c.firebaseapp.com",
    projectId: "jikoshokai-9f75c",
    storageBucket: "jikoshokai-9f75c.firebasestorage.app",
    messagingSenderId: "701041971815",
    appId: "1:701041971815:web:1bc7c96abfa0a398d0fac2"
};
const GEMINI_API_KEY = 'AIzaSyCodqLp1f3AvMlqaRXfuA8JBCglkObbK8k';

// --- Firebaseの初期化（変更なし） ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- グローバル変数 ---
// ✅ 現在表示している人物の情報を保持する変数を追加
let currentProfile = null;

// --- DOM要素の取得（変更なし） ---
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const personImage = document.getElementById('person-image'); // ✅ 画像要素も取得
const speechBubble = document.getElementById('speech-bubble');
const aiResponseText = document.getElementById('ai-response-text');

// --- イベントリスナー（変更なし） ---
chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = userInput.value.trim();
    if (userMessage) {
        appendMessage('user', userMessage);
        getAIResponse(userMessage);
        userInput.value = '';
    }
});

// --- 関数の定義 ---

/**
 * ✅ 指定されたIDのプロフィールをFirestoreから読み込む関数
 * @param {string} profileId - FirestoreのドキュメントID (例: 'person_01')
 */
async function loadProfile(profileId) {
    try {
        const docRef = doc(db, "profiles", profileId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProfile = docSnap.data();
            // プロフィール情報でページを更新
            personImage.src = currentProfile.imageUrl || './placeholder.png'; // 画像を更新
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
 * チャットログにメッセージを追加する関数（変更なし）
 */
function appendMessage(sender, message) { /* ...変更なし... */ }

/**
 * ✅ AIからの返信を取得する関数（プロンプトを動的に生成するように変更）
 */
async function getAIResponse(userMessage) {
    if (!currentProfile) {
        showSpeechBubble("最初にプロフィールを読み込んでください。");
        return;
    }

    // ✅ Firestoreから取得した知識を元にプロンプトを作成
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`, {
            /* ...APIリクエストの বাকি অংশ পরিবর্তন করা হয়নি... */
        });
        
        // ... (APIレスポンスの処理部分は変更なし) ...

    } catch (error) { /* ...変更なし... */ }
}

/**
 * 吹き出しにテキストを表示する関数（変更なし）
 */
function showSpeechBubble(text) { /* ...変更なし... */ }


// --- 初期化処理 ---
// ✅ ページが読み込まれたら、デフォルトのプロフィールを読み込む
loadProfile('person_01');
