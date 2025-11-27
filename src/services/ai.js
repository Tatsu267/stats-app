import { getApiKey } from './db';

// 共通リクエスト処理
async function callGeminiApi(payload, apiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "AIエラーが発生しました");
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error("テキストが生成されませんでした");
}

// 解説生成（既存）
export async function getInitialExplanation(question, selectedOptionIndex, correctOptionIndex) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");

    const selectedOption = question.options[selectedOptionIndex];
    const correctOption = question.options[correctOptionIndex];

    const prompt = `
    あなたは統計検定準1級レベルの専門知識を持つチューターです。
    以下の問題の解説を作成してください。挨拶は不要です。

    【問題】${question.text}
    【選択肢】${question.options.join(', ')}
    【回答】${selectedOption} (正解: ${correctOption})

    【ルール】
    - 正誤判定から始める
    - 数式はLaTeX形式 ($$または$)
    - 重要箇所は太字(**)や赤字(__)
    `;

    return callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    }, apiKey);
}

// チャット応答（既存）
export async function sendChatMessage(history, newMessage) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");
    
    const reminder = "\n(挨拶不要。数式はLaTeX形式)";
    const nextMessages = [...history, { role: "user", parts: [{ text: newMessage + reminder }] }];

    return callGeminiApi({
        contents: nextMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    }, apiKey);
}

// ▼▼▼ 新規追加: 問題生成機能 ▼▼▼
export async function generateAiQuestion(category) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const prompt = `
    統計検定準1級レベルの「${category}」に関する、4択または5択の選択式問題を1問作成してください。
    
    【出力フォーマット】
    以下のJSON形式**のみ**を出力してください。Markdownのcode block (\`\`\`json) も含めないでください。純粋なJSON文字列のみを返してください。
    
    {
      "text": "問題文...",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4", "選択肢5"],
      "correctIndex": 0,
      "difficulty": "Medium",
      "category": "${category}"
    }
    
    【制約】
    - 難易度は "Easy", "Medium", "Hard" のいずれか。
    - 正解(correctIndex)はランダムに設定すること。
    - 数式が必要な場合はLaTeX形式 ($$...$$ または $...$) を使用すること。
    `;

    const jsonString = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            temperature: 0.9, // 創造性を上げる
            response_mime_type: "application/json" // GeminiにJSONモードを強制
        }
    }, apiKey);

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON Parse Error:", e, jsonString);
        throw new Error("AIが不正なデータを返しました。もう一度試してください。");
    }
}