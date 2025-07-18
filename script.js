// script.js

// --- サービス設定 ---
// Firebaseの初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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


// --- グローバル変数 ---
// 現在表示している人物の情報を保持する変数
let currentProfile = null;
// 表示するプロフィールのIDリストと、現在のインデックスを管理する変数
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

// 人物切り替えボタンがクリックされたときの処理
switchPersonBtn.addEventListener('click', () => {
    // 次のプロフィールのインデックスに更新（リストの最後に達したら最初に戻る）
    currentProfileIndex = (currentProfileIndex + 1) % profileIds.length;
    
    // 次のプロフィールIDを取得
    const nextProfileId = profileIds[currentProfileIndex];
    
    // 新しいプロフィールを読み込む
    loadProfile(nextProfileId);
});


// --- 関数の定義 ---

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

    // Firestoreから取得した知識を元にプロンプトを作成
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
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

    // 7秒後に自動で吹き出しを隠す
    setTimeout(() => {
        speechBubble.classList.add('hidden');
    }, 7000);
}


// --- 初期化処理 ---
// ページが読み込まれたら、リストの最初のプロフィールを読み込む
loadProfile(profileIds[currentProfileIndex]);
