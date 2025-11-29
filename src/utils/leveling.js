import { SRS_RATINGS } from './srs';

// レベルごとの必要経験値 (調整なし)
export const getNextLevelExp = (level) => {
    return Math.floor(100 * Math.pow(level, 1.2));
};

/**
 * 獲得経験値を計算する
 * ★修正: 不正解時にマイナスの経験値を返すように変更
 */
export function calculateExpGain(difficulty, confidenceRating) {
    // 不正解 (AGAIN) の場合: ペナルティ発生
    if (confidenceRating === SRS_RATINGS.AGAIN) {
        // 難易度が高いほどペナルティは軽く、低いほど重くする（ケアレスミス防止）
        if (difficulty === 'Hard') return -5;
        if (difficulty === 'Medium') return -10;
        return -15; // Easyでのミスは痛い
    }
    
    // 正解時 (変更なし)
    let baseExp = 10;
    if (difficulty === 'Medium') baseExp = 15;
    if (difficulty === 'Hard') baseExp = 25;

    let multiplier = 1.0;
    if (confidenceRating === SRS_RATINGS.EASY) multiplier = 1.2;
    if (confidenceRating === SRS_RATINGS.HARD) multiplier = 0.8;

    return Math.round(baseExp * multiplier);
}

/**
 * 難易度分布の計算
 * ★修正: 低レベル帯でのEasy率を100%にし、確実にEasyが出るように調整
 */
export function getDifficultyDistribution(level) {
    // Lv.1 ~ 3: チュートリアル期間として 100% Easy
    if (level <= 3) {
        return { Easy: 1.0, Medium: 0.0, Hard: 0.0 };
    }

    // Lv.4 ~ 19: 徐々に難しくする
    // Easy: 100% -> 10%
    // Hard: 0% -> 60%
    const MAX_MASTERY_LEVEL = 20;
    const progress = Math.min(level, MAX_MASTERY_LEVEL) / MAX_MASTERY_LEVEL;

    // 補間計算を少し調整
    let easyRatio = Math.max(0.1, 1.0 - (0.9 * progress)); // 1.0 -> 0.1
    let hardRatio = Math.min(0.6, 0.6 * progress);         // 0.0 -> 0.6
    let mediumRatio = 1.0 - easyRatio - hardRatio;

    // 丸め誤差対策
    return {
        Easy: Math.round(easyRatio * 100) / 100,
        Medium: Math.round(mediumRatio * 100) / 100,
        Hard: Math.round(hardRatio * 100) / 100
    };
}

/**
 * 問題リストからレベルに応じた抽選を行う (変更なし)
 */
export function selectQuestionsByLevel(questions, level, count = 5) {
    const dist = getDifficultyDistribution(level);
    
    const easyQs = questions.filter(q => q.difficulty === 'Easy');
    const mediumQs = questions.filter(q => q.difficulty === 'Medium');
    const hardQs = questions.filter(q => q.difficulty === 'Hard');

    let eCount = Math.round(count * dist.Easy);
    let hCount = Math.round(count * dist.Hard);
    let mCount = count - eCount - hCount;

    const pickRandom = (arr, num) => {
        if (num <= 0) return [];
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, num);
    };

    const selected = [
        ...pickRandom(easyQs, eCount),
        ...pickRandom(mediumQs, mCount),
        ...pickRandom(hardQs, hCount)
    ];

    if (selected.length < count) {
        const remaining = count - selected.length;
        const usedIds = new Set(selected.map(q => q.id));
        const unused = questions.filter(q => !usedIds.has(q.id));
        selected.push(...pickRandom(unused, remaining));
    }

    return selected.sort(() => 0.5 - Math.random());
}