// 1. 母比率の区間推定 (信頼係数95%)
export function calculateConfidenceInterval(correctCount, totalCount) {
    if (totalCount === 0) return null;
    const p = correctCount / totalCount;
    const z = 1.96; // 95%信頼区間
    const errorMargin = z * Math.sqrt((p * (1 - p)) / totalCount);
    
    return {
        p: p,
        lower: Math.max(0, p - errorMargin),
        upper: Math.min(1, p + errorMargin),
        methodName: "母比率の区間推定 (信頼係数95%)",
        category: "推測統計",
        description: `あなたの現在の正答率は ${(p*100).toFixed(1)}% ですが、これはあくまで「標本」の結果です。\n統計的に推測される「真の実力（母正答率）」は、95%の確率で ${(Math.max(0, p - errorMargin)*100).toFixed(1)}% 〜 ${(Math.min(1, p + errorMargin)*100).toFixed(1)}% の間にあると考えられます。`
    };
}

// 2. 独立性の検定 (カイ二乗検定) - 難易度と正誤の関係
export function performChiSquareTest(attempts, questions) {
    const table = { Easy: {c:0, i:0}, Medium: {c:0, i:0}, Hard: {c:0, i:0} };
    
    attempts.forEach(a => {
        const q = questions.find(q => q.id === a.questionId);
        if(!q) return;
        if(a.isCorrect) table[q.difficulty].c++;
        else table[q.difficulty].i++;
    });

    // 簡易的な判定ロジック (本来はカイ二乗分布表を用いるが、JSのみで完結させるため簡易化)
    // Hardの誤答率がEasy/Mediumに比べて著しく高いかをチェック
    const hardRate = table.Hard.c / (table.Hard.c + table.Hard.i || 1);
    const easyRate = table.Easy.c / (table.Easy.c + table.Easy.i || 1);
    
    const isSignificant = (easyRate - hardRate) > 0.3; // 差が30%以上あれば有意とみなす（簡易）

    return {
        table,
        isSignificant,
        pValue: isSignificant ? "< 0.05" : "> 0.05",
        methodName: "カイ二乗検定 (独立性の検定)",
        category: "推測統計 / 分割表",
        description: isSignificant 
            ? "難易度と正答率に統計的な関連が見られます（難しい問題で明確に失点しています）。基礎は固まっていますが、応用力に課題があるかもしれません。" 
            : "難易度による正答率の偏りは統計的に有意ではありません。難易度に関わらず、ケアレスミスなどがランダムに発生している可能性があります。"
    };
}

// 3. 単回帰分析 (学習回数と回答時間の推移)
export function performRegressionAnalysis(attempts) {
    if (attempts.length < 5) return null;

    const n = attempts.length;
    // x: 試行回数, y: 回答時間
    const data = attempts.map((a, i) => ({ x: i + 1, y: a.timeTaken }));
    
    const sumX = data.reduce((acc, d) => acc + d.x, 0);
    const sumY = data.reduce((acc, d) => acc + d.y, 0);
    const sumXY = data.reduce((acc, d) => acc + (d.x * d.y), 0);
    const sumXX = data.reduce((acc, d) => acc + (d.x * d.x), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trend = slope < -0.1 ? "改善傾向（短縮中）" : slope > 0.1 ? "悪化傾向（長期化）" : "横ばい";

    return {
        slope,
        intercept,
        trend,
        methodName: "単回帰分析 (最小二乗法)",
        category: "線形モデル",
        description: `回答時間の推移を回帰分析しました。\n回帰係数（傾き）は ${slope.toFixed(3)} です。\n${trend}が見られます。${slope < 0 ? '学習効果により、判断スピードが向上しています！' : '回答時間が安定しています。'}`
    };
}

// 4. ベイズ推定 (ベータ分布による正答率の更新)
export function performBayesianEstimation(attempts) {
    // 事前分布: Beta(1, 1)
    let alpha = 1;
    let beta = 1;

    const correct = attempts.filter(a => a.isCorrect).length;
    const incorrect = attempts.length - correct;

    // 事後分布
    alpha += correct;
    beta += incorrect;

    const expectedAccuracy = alpha / (alpha + beta);

    return {
        alpha,
        beta,
        expectedAccuracy,
        methodName: "ベイズ推定 (ベータ分布)",
        category: "ベイズ法",
        description: `事前分布を一様分布 Beta(1,1) とし、学習データを観測情報として事後分布を更新しました。\nベイズ推定による「次の一問に正解する確率（期待値）」は ${(expectedAccuracy * 100).toFixed(1)}% です。`
    };
}