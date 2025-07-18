// script.js

// --- DOM要素の取得 ---
// このように、最初に使う要素をまとめて取得しておくと便利です。
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatLog = document.getElementById('chat-log');
const personImage = document.getElementById('person-image');
const speechBubble = document.getElementById('speech-bubble');
const aiResponseText = document.getElementById('ai-response-text');

// --- イベントリスナーの設定 ---

// チャットフォームが送信されたときの処理
chatForm.addEventListener('submit', (event) => {
    // フォームのデフォルトの送信動作（ページのリロード）を防ぐ
    event.preventDefault();

    // 入力されたテキストを取得し、前後の空白を削除
    const userMessage = userInput.value.trim();

    // メッセージが空でなければ処理を実行
    if (userMessage) {
        // ユーザーのメッセージをチャットログに表示する（この関数は後で作成します）
        appendMessage('user', userMessage);

        // AIからの返信を処理する（この関数は後で作成します）
        getAIResponse(userMessage);

        // 入力欄をクリアする
        userInput.value = '';
    }
});


// --- 関数の定義 ---

/**
 * チャットログにメッセージを追加する関数
 * @param {string} sender - 'user' または 'ai'
 * @param {string} message - 表示するメッセージ
 */
function appendMessage(sender, message) {
    // 新しいdiv要素を作成
    const messageElement = document.createElement('div');
    // 'message' と 'user-message' または 'ai-message' というクラスを追加
    messageElement.classList.add('message', `${sender}-message`);
    // メッセージのテキストを設定
    messageElement.textContent = message;
    
    // チャットログに新しいメッセージ要素を追加
    chatLog.appendChild(messageElement);

    // チャットログを一番下までスクロールする
    chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * AIからの返信を取得して表示する（今はダミーの返信）
 * @param {string} userMessage - ユーザーが入力したメッセージ
 */
function getAIResponse(userMessage) {
    // 現時点では、AIの代わりに固定のメッセージを返す
    const dummyResponse = `「${userMessage}」についてですね。興味深い質問です！`;

    // 吹き出しにAIの返信を表示する（この関数も後で作成します）
    showSpeechBubble(dummyResponse);
}

/**
 * 吹き出しにテキストを表示する関数
 * @param {string} text - 表示するテキスト
 */
function showSpeechBubble(text) {
    aiResponseText.textContent = text;
    speechBubble.classList.remove('hidden');

    // 5秒後に自動で吹き出しを隠す
    setTimeout(() => {
        speechBubble.classList.add('hidden');
    }, 5000);
}


// --- 初期化処理 ---
// ページが読み込まれたときに、簡単な挨拶を表示
showSpeechBubble('こんにちは！僕について何でも質問してください。');
