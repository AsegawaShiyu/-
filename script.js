// script.js

// --- サービス設定（重要：ここは後で自分の情報に書き換えてください） ---
// Firebaseの初期化（firebaseConfig.jsからインポートするのが望ましいですが、ここでは直接記述）
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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


// --- DOM要素の取得（変更なし） ---
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatLog = document.getElementById('chat-log');
const speechBubble = document.getElementById('speech-bubble');
const aiResponseText = document.getElementById('ai-response-text');

// --- イベントリスナー（変更なし） ---
chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = userInput.value.trim();
    if (userMessage) {
        appendMessage('user', userMessage);
        getAIResponse(userMessage); // この関数がAIを呼び出すように変わる
        userInput.value = '';
    }
});


// --- 関数の定義 ---

/**
 * チャットログにメッセージを追加する関数（変更なし）
 */
function appendMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * ✅ AIからの返信を取得して表示する（Gemini APIを呼び出すように変更）
 * @param {string} userMessage - ユーザーが入力したメッセージ
 */
async function getAIResponse(userMessage) {
    // AIに与える役割や知識（プロンプト）
    // 将来的にはこの部分をFirestoreから取得した人物データに置き換えます
    const prompt = `
        あなたは、とある人物のAIアシスタントです。
        以下の制約を守って、ユーザーからの質問に答えてください。

        # 制約
        - あなたはフレンドリーで、少しユーモアのある性格です。
        - 簡潔に、2〜3文で回答してください。

        # ユーザーからの質問
        ${userMessage}
    `;

    // 吹き出しに「考え中...」と表示
    showSpeechBubble('考え中...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error('APIからの応答が正常ではありません。');
        }

        const data = await response.json();
        const aiMessage = data.candidates[0].content.parts[0].text;
        
        // 実際の返信を吹き出しに表示
        showSpeechBubble(aiMessage.trim());

    } catch (error) {
        console.error('APIリクエストエラー:', error);
        showSpeechBubble('申し訳ありません、エラーが発生しました。');
    }
}

/**
 * 吹き出しにテキストを表示する関数（変更なし）
 */
function showSpeechBubble(text) {
    aiResponseText.textContent = text;
    speechBubble.classList.remove('hidden');

    // 7秒後に自動で吹き出しを隠す（少し長めに変更）
    setTimeout(() => {
        speechBubble.classList.add('hidden');
    }, 7000);
}


// --- 初期化処理 ---
// ページが読み込まれたときに、簡単な挨拶を表示（変更なし）
showSpeechBubble('こんにちは！僕について何でも質問してください。');
