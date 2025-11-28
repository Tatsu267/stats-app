import { getApiKey } from './db';
import { CATEGORY_CONFIG } from '../utils/categories';
import { ROLES } from '../utils/roles';

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

// 解説生成
export async function getInitialExplanation(question, selectedOptionIndex, correctOptionIndex) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");

    // オプション配列の安全な取得
    const options = Array.isArray(question.options) ? question.options : [];
    const selectedOption = options[selectedOptionIndex] || "不明";
    const correctOption = options[correctOptionIndex] || "不明";

    const prompt = `
    あなたは統計検定準1級レベルの専門知識を持つチューターです。
    以下の問題の解説を作成してください。挨拶は不要です。

    【問題】${question.text}
    【選択肢】${options.join(', ')}
    【回答】${selectedOption} (正解: ${correctOption})
    ${question.role ? `【シチュエーション】この問題は「${ROLES[question.role]?.name}」の実務シチュエーションとして出題されました。解説もその視点を盛り込んでください。` : ''}

    【ルール】
    - 正誤判定から始める
    - 数式はLaTeX形式 ($$または$)
    - **重要: 数式ブロック($$ ... $$)内で改行(\\\\)を使う場合は、必ず \\begin{aligned} ... \\end{aligned} 環境を使用してください。単独の \\\\ はエラーになります。**
    - 重要箇所は太字(**)や赤字(__)
    - 図解が必要な場合は矢印などを使ったテキスト図で
    - 表が必要な場合はMarkdownの表形式を使用してください
    `;

    return callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    }, apiKey);
}

// チャット応答
export async function sendChatMessage(history, newMessage) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");
    
    const reminder = "\n(挨拶不要。数式はLaTeX形式。改行を含む数式は aligned 環境を使うこと。表はMarkdown形式)";
    const nextMessages = [...history, { role: "user", parts: [{ text: newMessage + reminder }] }];

    return callGeminiApi({
        contents: nextMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    }, apiKey);
}

// 通常のAI問題生成
export async function generateAiQuestion(category) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const subcategories = CATEGORY_CONFIG[category]?.subcategories || [];
    const randomSub = subcategories.length > 0 
        ? subcategories[Math.floor(Math.random() * subcategories.length)] 
        : category;

    const prompt = `
    統計検定準1級レベルの「${category}」分野、特に「${randomSub}」に関する、4択または5択の選択式問題を1問作成してください。
    前回とは違う問題を作ってください。
    
    【重要：記述ルール】
    - **可読性**: 問題文が長くなる場合は、適度な位置（前提条件の区切り、問いの直前など）で**改行コード (\\n)** を挿入して見やすくしてください。
    - **数式**: LaTeX形式 ($...$) で記述してください。
    - **表**: 分布表などが必要な場合は、**Markdownの表形式** ( | x | P(x) | ... ) を使ってください。
    - **JSONエスケープ**: JSON文字列として出力するため、バックスラッシュ（\\）は必ず二重（\\\\）にエスケープしてください。
      例: LaTeXの $\\lambda$ -> "$\\\\lambda$", 改行 -> "\\\\n"
    
    【出力フォーマット】
    以下のJSON形式**のみ**を出力してください。Markdownのcode blockは不要です。
    
    {
      "text": "問題文... (数式やMarkdown表を含み、適宜改行を入れる)",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4", "選択肢5"],
      "correctIndex": 0,
      "difficulty": "Medium", 
      "category": "${category}",
      "subcategory": "${randomSub}"
    }
    `;

    const jsonString = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            temperature: 1.0,
            response_mime_type: "application/json" 
        }
    }, apiKey);

    try {
        let result = JSON.parse(jsonString);
        
        if (Array.isArray(result)) {
            if (result.length === 0) throw new Error("AIが空のデータを返しました");
            result = result[0];
        }

        if (!result || !result.text || !Array.isArray(result.options) || result.options.length < 2 || typeof result.correctIndex !== 'number') {
            console.warn("AI generated invalid format:", result);
            throw new Error("AIが不完全なデータを生成しました。再生成します。");
        }

        return result;
    } catch (e) {
        console.error("JSON Parse Error:", e, jsonString);
        throw new Error("問題生成に失敗しました: " + e.message);
    }
}

// ロールプレイ問題生成
export async function generateRolePlayQuestion(roleId) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const role = ROLES[roleId];
    if (!role) throw new Error("無効なロールIDです。");

    const prompt = `
    あなたは「${role.name}」のメンターです。
    ユーザーは新人の${role.name}として、実務で直面する課題を統計学で解決しようとしています。
    
    【設定】
    ${role.description}
    
    【指示】
    統計検定準1級レベルの知識（特に${role.focus}など）を必要とする、
    **実務的で具体的なシチュエーション**に基づいた4択または5択の問題を1問作成してください。
    「ある工場で...」のような抽象的な表現ではなく、「WebサイトのCVR改善施策において...」や「新薬Aの第3相臨床試験において...」のように具体的にしてください。
    
    【重要：記述ルール】
    - **可読性**: 状況説明、データ提示、問いかけの間などに**改行コード (\\n)** を入れて、長文でも読みやすくしてください。
    - **数式**: LaTeX形式 ($...$) で記述してください。
    - **表**: データの提示が必要な場合は、**Markdownの表形式** ( | x | y | ... ) を使ってください。
    - **JSONエスケープ**: JSON文字列として出力するため、バックスラッシュ（\\）は必ず二重（\\\\）にエスケープしてください。
      例: $\\mu$ -> "$\\\\mu$", 改行 -> "\\\\n"
    
    【出力フォーマット】
    以下のJSON形式**のみ**を出力してください。Markdownのcode blockは不要です。
    
    {
      "text": "シチュエーションを含めた問題文... (適宜改行を入れる)",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctIndex": 0,
      "difficulty": "Medium", 
      "category": "統計的推測", // 問題の内容に合ったカテゴリを自動判定
      "subcategory": "実務応用",
      "role": "${roleId}"
    }
    `;

    const jsonString = await callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            temperature: 1.0,
            response_mime_type: "application/json" 
        }
    }, apiKey);

    try {
        let result = JSON.parse(jsonString);
        
        if (Array.isArray(result)) {
            if (result.length === 0) throw new Error("AIが空のデータを返しました");
            result = result[0];
        }

        if (!result || !result.text || !Array.isArray(result.options) || result.options.length < 2 || typeof result.correctIndex !== 'number') {
            console.warn("AI generated invalid format:", result);
            throw new Error("AIが不完全なデータを生成しました。再生成します。");
        }

        return result;
    } catch (e) {
        console.error("JSON Parse Error:", e, jsonString);
        throw new Error("問題生成に失敗しました: " + e.message);
    }
}

// 総括生成
export async function generateSessionFeedback(sessionData) {
    const apiKey = await getApiKey();
    if (!apiKey) return "APIキーが設定されていないため、分析を実行できません。";

    const summary = sessionData.map((item, i) => ({
        q: item.question.text.substring(0, 50) + "...",
        category: item.question.category,
        role: item.question.role ? ROLES[item.question.role]?.name : null,
        isCorrect: item.isCorrect,
        time: item.timeTaken,
        chatCount: item.chatLog ? item.chatLog.length : 0,
        userQuestions: item.chatLog ? item.chatLog.filter(m => m.role === 'user').map(m => m.text) : []
    }));

    const prompt = `
    あなたは専属の学習コーチです。
    ユーザーが「${summary.length}問」の演習を完了しました。以下のデータに基づいて、今回の演習の総括とフィードバックを行ってください。
    ロールプレイ演習が含まれる場合は、その職種への適性についてもポジティブにコメントしてください。

    【演習データ】
    ${JSON.stringify(summary, null, 2)}

    【指示】
    以下の構成で、Markdown形式で出力してください。
    1. **全体評価**: 正答率や回答時間に基づいた励ましと評価。
    2. **弱点分析**: ユーザーが「どこで躓いているか」「理解が浅い点」を推測して指摘。
    3. **今後のアクション**: 次に何を学習すべきか、具体的なアドバイス。

    ※重要箇所は太字(**)や赤字(__)を使って強調してください。
    `;

    return callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
    }, apiKey);
}