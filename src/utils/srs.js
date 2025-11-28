/**
 * 分散学習（SRS）の次回スケジュールを計算する
 * @param {object} currentState - 現在の状態 { interval: number, easeFactor: number }
 * @param {boolean} isCorrect - 正解したかどうか
 * @returns {object} 次の状態 { interval, easeFactor, nextReviewDate }
 */
export function calculateNextReview(currentState, isCorrect) {
    // 初期状態
    const state = currentState || { interval: 0, easeFactor: 2.5 };
    
    let { interval, easeFactor } = state;

    if (isCorrect) {
        // 正解: 間隔を広げる
        if (interval === 0) {
            interval = 1;
        } else if (interval === 1) {
            interval = 3;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        easeFactor = Math.max(1.3, easeFactor + 0.1);
    } else {
        // 不正解: 即時復習
        interval = 0;
        easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    nextReviewDate.setHours(0, 0, 0, 0);

    return {
        interval,
        easeFactor,
        nextReviewDate: nextReviewDate.getTime()
    };
}