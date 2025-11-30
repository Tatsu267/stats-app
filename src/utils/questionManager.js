import questionsData from '../data/questions.json';
import { db } from '../services/db';

// AI生成問題のIDプレフィックス
export const CUSTOM_PREFIX = 'custom-';
// 固定問題のIDプレフィックス
export const FIXED_PREFIX = 'fixed-';

/**
 * 全問題リストを取得する
 */
export async function getAllQuestions() {
    try {
        const customQuestions = await db.customQuestions.toArray();
        
        // 固定問題の安全な読み込み（データがない場合は空配列）
        const safeQuestionsData = Array.isArray(questionsData) ? questionsData : [];
        
        const formattedFixedQuestions = safeQuestionsData.map((q, index) => ({
            ...q,
            id: q.id ? `${q.id}` : `${FIXED_PREFIX}${index}`,
            isCustom: false
        }));

        // AI問題のIDを整形
        const formattedCustomQuestions = customQuestions.map(q => ({
            ...q,
            id: `${CUSTOM_PREFIX}${q.id}`, 
            isCustom: true 
        }));

        return [...formattedFixedQuestions, ...formattedCustomQuestions];
    } catch (error) {
        console.error("Failed to load questions:", error);
        return []; // エラー時は空配列を返してクラッシュを防ぐ
    }
}

/**
 * 履歴データと問題を紐付けて返す
 */
export async function getAttemptsWithQuestions() {
    const attempts = await db.attempts.toArray();
    const allQuestions = await getAllQuestions();
    
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));

    const results = attempts.map(attempt => {
        let question = questionMap.get(attempt.questionId);
        
        if (!question && typeof attempt.questionId === 'number') {
             question = questionMap.get(`${attempt.questionId}`);
        }

        return {
            ...attempt,
            question
        };
    });

    return results.filter(item => item.question);
}