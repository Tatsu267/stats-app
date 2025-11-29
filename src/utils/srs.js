export const SRS_RATINGS = {
    AGAIN: 1, // 間違えた・忘れていた
    HARD: 2,  // 難しかった
    GOOD: 3,  // 普通・適切
    EASY: 4   // 簡単だった
};

/**
 * SM-2アルゴリズムをベースにした次回の復習スケジュール計算
 * @param {object} currentState - { interval, easeFactor, repetitions }
 * @param {number} rating - 1(Again) ~ 4(Easy)
 */
export function calculateNextReview(currentState, rating) {
    // 初期状態のデフォルト値
    let { interval, easeFactor, repetitions } = currentState || { 
        interval: 0, 
        easeFactor: 2.5, 
        repetitions: 0 
    };

    if (rating === SRS_RATINGS.AGAIN) {
        // 間違えた場合: 初回に戻す（即時復習）
        repetitions = 0;
        interval = 0; // 今日中に復習
        // 易しさ係数を少し下げる（難しかった問題としてマーク）
        easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else {
        // 正解した場合 (Hard, Good, Easy)
        
        // 1. 間隔（Interval）の計算
        if (repetitions === 0) {
            interval = 1; // 1日後
        } else if (repetitions === 1) {
            interval = 6; // 6日後
        } else {
            // Hardの場合は間隔の伸びを抑える補正
            const effectiveMultiplier = rating === SRS_RATINGS.HARD ? 1.2 : easeFactor;
            interval = Math.round(interval * effectiveMultiplier);
        }
        repetitions++;

        // 2. 易しさ係数（Ease Factor）の更新
        // Easyなら大きく上がり、Hardなら下がる
        if (rating === SRS_RATINGS.EASY) {
            easeFactor += 0.15;
        } else if (rating === SRS_RATINGS.HARD) {
            easeFactor -= 0.15;
        }
        // Goodの場合はそのまま（または微増）
        
        // 1.3を下回らないように制限
        if (easeFactor < 1.3) easeFactor = 1.3;
    }

    // 次回日付の計算
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    nextReviewDate.setHours(0, 0, 0, 0);

    return {
        interval,
        easeFactor,
        repetitions,
        nextReviewDate: nextReviewDate.getTime()
    };
}