import { db } from '../services/db';

// AI生成問題のIDプレフィックス
export const CUSTOM_PREFIX = 'custom-';

/**
 * 全問題リストを取得する（AI生成問題のみ）
 */
export async function getAllQuestions() {
    const customQuestions = await db.customQuestions.toArray();
    
    // AI問題のIDを整形
    const formattedCustomQuestions = customQuestions.map(q => ({
        ...q,
        id: `${CUSTOM_PREFIX}${q.id}`, 
        isCustom: true 
    }));

    return formattedCustomQuestions;
}

/**
 * 履歴データと問題を紐付けて返す
 */
export async function getAttemptsWithQuestions() {
    const attempts = await db.attempts.toArray();
    const allQuestions = await getAllQuestions();
    
    // IDをキーにしたMapを作成
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));

    const results = attempts.map(attempt => {
        const question = questionMap.get(attempt.questionId);
        return {
            ...attempt,
            question
        };
    });

    // 問題データが存在する履歴のみを返す（削除された固定問題の履歴は除外される）
    return results.filter(item => item.question);
}