import { getApiKey } from './db';

// 解説・チャット生成の共通エンドポイント処理
async function callGeminiApi(messages, apiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: messages,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Detail:", errorData);
            throw new Error(errorData.error?.message || "AIからの応答取得に失敗しました");
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("テキストが生成されませんでした。");
        }
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}

// 初回の解説生成
export async function getInitialExplanation(question, selectedOptionIndex, correctOptionIndex) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。設定画面で入力してください。");

    const selectedOption = question.options[selectedOptionIndex];
    const correctOption = question.options[correctOptionIndex];

    const prompt = `
    あなたは統計検定準1級レベルの専門知識を持つ、親切で分かりやすいチューターです。
    ユーザーが以下の問題に回答しました。

    【問題】
    ${question.text}
    
    【選択肢】
    ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
    
    【ユーザーの回答】
    ${selectedOption}
    
    【正解】
    ${correctOption}
    
    【重要：出力の制約】
    - 「はい、承知いたしました」「解説します」などの前置きや挨拶は**一切出力しないでください**。
    - 必ず正誤判定から書き始めてください。

    【解説フォーマットの指示】
    1. **数式**:
       - 数式は必ず **LaTeX形式** で記述してください。
       - 数式のブロックは \`$$\` (ドルマーク2つ) で囲んでください。
       - インライン数式は \`$\` (ドルマーク1つ) で囲んでください。
       - 例: 
         $$
         P(X=k) = {}_{n}C_{k} p^k (1-p)^{n-k}
         $$
    2. **強調**:
       - 重要な単語は **太字** (\`**単語**\`) で。
       - 注意点は __赤字__ (\`__注意点__\`) で。
    3. **図解**:
       - スマホでも崩れないよう、矢印などを使ったフロー図(\`\`\`diagram ... \`\`\`) で表現してください。
    4. **構成**:
       - 正誤判定 -> 論理的解説 -> 補足図解 -> 質問の促し

    挨拶は省き、わかりやすく、かつ数学的に正確な解説をお願いします。
    `;

    const messages = [{ role: "user", parts: [{ text: prompt }] }];
    
    return callGeminiApi(messages, apiKey);
}

// 続けて質問するための関数
export async function sendChatMessage(history, newMessage) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    // 会話の途中でも挨拶が出ないように念押し
    const reminder = "\n(挨拶不要。数式はLaTeX形式で $$...$$ または $...$ で囲んでください)";

    const nextMessages = [
        ...history,
        { role: "user", parts: [{ text: newMessage + reminder }] }
    ];

    return callGeminiApi(nextMessages, apiKey);
}