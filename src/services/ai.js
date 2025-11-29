import { getApiKey } from './db';
import { CATEGORY_CONFIG } from '../utils/categories';
import { ROLES } from '../utils/roles';

// 使用するモデルの優先順位リスト
const AVAILABLE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

// 共通リクエスト処理
async function callGeminiApi(payload, apiKey) {
    let lastError = null;

    for (const model of AVAILABLE_MODELS) {
        try {
            console.log(`Trying AI model: ${model}...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const status = response.status;
                const errorData = await response.json().catch(() => ({})); 

                if (status === 429 || status === 404 || status === 503) {
                    console.warn(`Model ${model} failed with status ${status}. Switching to next model...`);
                    lastError = new Error(errorData.error?.message || `AI Model ${model} error: ${status}`);
                    continue; 
                }

                throw new Error(errorData.error?.message || "AIエラーが発生しました");
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
            throw new Error("テキストが生成されませんでした");

        } catch (error) {
            console.warn(`Error with model ${model}:`, error);
            lastError = error;
        }
    }

    console.error("All models failed.");
    throw lastError || new Error("すべてのAIモデルで生成に失敗しました。しばらく待ってから再度お試しください。");
}

// 解説生成
export async function getInitialExplanation(question, selectedOptionIndex, correctOptionIndex) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");

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

    【重要：記述ルール】
    - **構造化**: ポイントや手順を説明する際は、Markdownのリスト形式（"- "）を積極的に使ってください。
    - **強調**: 重要な用語や結論は太字（**...**）にしてください。
    - **数式**: 数式はLaTeX形式 ($$または$) で記述してください。
      改行を含む数式は \\begin{aligned} ... \\end{aligned} 環境を使用してください。
    - **表**: 比較が必要な場合はMarkdownの表形式を使用してください。
    
    【構成案】
    1. **正誤判定**: まず正解か不正解かを明示。
    2. **ポイント**: この問題の核心となる概念を簡潔に。
    3. **詳細解説**: 数式やロジックを用いて丁寧に解説。
    4. **実務での意義**: (ロールプレイの場合) この知識が現場でどう役立つか。
    `;

    return callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
    }, apiKey);
}

// チャット応答
export async function sendChatMessage(history, newMessage) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーを設定してください");
    
    const reminder = `
    (挨拶不要。以下のルールを守ってください)
    - 数式はLaTeX形式。改行を含む数式は aligned 環境を使う。
    - 箇条書きは見やすいMarkdownリスト形式 ("- ") を使う。
    - 重要な単語は太字 (**...**) にする。
    - 表はMarkdown形式。
    `;
    const nextMessages = [...history, { role: "user", parts: [{ text: newMessage + reminder }] }];

    return callGeminiApi({
        contents: nextMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
    }, apiKey);
}

// 通常のAI問題生成
export async function generateAiQuestion(category, difficulty = 'Medium') {
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
    - **可読性（箇条書き）**: 条件や変数の定義は、Markdownのリスト形式（"- "）を使用し、**過剰な入れ子（ネスト）は避けてください**。
      項目名（「要因A」など）は太字（**...**）で強調してください。
      悪い例: 
        - 要因A
          - 水準1
          - 水準2
      良い例: 
        - **要因A**: 水準1（...）、水準2（...）
        - **要因B**: 水準1（...）、水準2（...）
    - **数式**: 変数名（例: X, Y, n, p）、添字付き文字（例: X_1）、数式は**必ず** LaTeX形式 ($...$) で記述してください。
      悪い例: X_1, beta_0
      良い例: $X_1$, $\\beta_0$
    - **表**: 分布表などが必要な場合は、**Markdownの表形式** ( | x | P(x) | ... ) を使ってください。
    - **JSONエスケープ**: JSON文字列として出力するため、バックスラッシュ（\\）は必ず二重（\\\\）にエスケープしてください。
      例: LaTeXの $\\lambda$ -> "$\\\\lambda$", 改行 -> "\\\\n"
    
    【出力フォーマット】
    以下のJSON形式**のみ**を出力してください。Markdownのcode blockは不要です。
    
    {
      "text": "問題文... (Markdownリスト形式や数式を含み、適宜改行を入れる)",
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

        // 文字列としての "\n" を実際の改行コードに置換
        if (result.text) {
            result.text = result.text
                .replace(/\\n/g, '\n')
                .replace(/\\\*\\\*/g, '**')
                .replace(/\\textbf\{(.+?)\}/g, '**$1**'); 
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
export async function generateRolePlayQuestion(roleId, difficulty = 'Medium') {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const role = ROLES[roleId];
    if (!role) throw new Error("無効なロールIDです。");

    const focusTopics = role.focus ? role.focus.split('、') : [];
    const randomTopic = focusTopics.length > 0 
        ? focusTopics[Math.floor(Math.random() * focusTopics.length)]
        : "";

    const prompt = `
    あなたは「${role.name}」のメンターです。
    ユーザーは新人の${role.name}として、実務で直面する課題を統計学で解決しようとしています。
    
    **指定難易度: ${difficulty}**
    
    【設定】
    ${role.description}
    
    【指示】
    統計検定準1級レベルの知識、特に**「${randomTopic}」**に関連する知識を必要とする、
    **実務的で具体的なシチュエーション**に基づいた4択または5択の問題を1問作成してください。
    
    ※注意点:
    - **毎回同じような問題（例: A/Bテストばかりなど）にならないよう、${randomTopic}の観点から多様なシチュエーションを考えてください。**
    - 「ある工場で...」のような抽象的な表現ではなく、「WebサイトのCVR改善施策において...」や「新薬Aの第3相臨床試験において...」のように具体的にしてください。
    
    【重要：記述ルール】
    - **可読性（箇条書き）**: 条件、変数定義、仮説などを列挙する場合は、必ずMarkdownのリスト形式（"- "）を使用し、**過剰な入れ子（ネスト）は避けてください**。
      項目名（「説明変数A」など）は太字（**...**）で強調してください。
      悪い例: 
        - 説明変数
          - $X_1$: 広告費
          - $X_2$: 訪問数
      良い例: 
        - **説明変数 $X_1$**: 広告費
        - **説明変数 $X_2$**: 訪問数
    - **数式**: 変数名（例: X, Y）、添字（例: _1, _i）、ギリシャ文字などは**必ず** LaTeX形式 ($...$) で記述してください。
      悪い例: Y = b_0 + b_1X_1
      良い例: $Y = \\beta_0 + \\beta_1 X_1$
    - **表**: データの提示が必要な場合は、**Markdownの表形式** ( | x | y | ... ) を使ってください。
    - **JSONエスケープ**: JSON文字列として出力するため、バックスラッシュ（\\）は必ず二重（\\\\）にエスケープしてください。
      例: $\\mu$ -> "$\\\\mu$", 改行 -> "\\\\n"
    
    【出力フォーマット】
    以下のJSON形式**のみ**を出力してください。Markdownのcode blockは不要です。
    
    {
      "text": "シチュエーションを含めた問題文... (Markdownリストや数式を含み、適宜改行を入れる)",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctIndex": 0,
      "difficulty": "${difficulty}", 
      "category": "統計的推測", 
      "subcategory": "具体的な統計手法名（例：${randomTopic}、ロジスティック回帰、主成分分析など）",
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

        // 文字列としての "\n" を実際の改行コードに置換
        if (result.text) {
            result.text = result.text
                .replace(/\\n/g, '\n')
                .replace(/\\\*\\\*/g, '**')
                .replace(/\\textbf\{(.+?)\}/g, '**$1**'); 
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

    ※重要箇所は太字(**...**)を使って強調してください（アンダースコア __...__ は使用しないでください）。
    `;

    return callGeminiApi({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 5000 }
    }, apiKey);
}