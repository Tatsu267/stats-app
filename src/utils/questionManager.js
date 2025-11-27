import questionsData from '../data/questions.json';
import { db } from '../services/db';

// AI生成問題のIDにつけるプレフィックス（重複防止用）
export const CUSTOM_PREFIX = 'custom-';

/**
 * 固定問題とAI生成問題を統合して全問題リストを取得する
 */
export async function getAllQuestions() {
    const customQuestions = await db.customQuestions.toArray();
    
    // AI問題のIDを一意にするためにプレフィックスを付与して整形
    const formattedCustomQuestions = customQuestions.map(q => ({
        ...q,
        id: `${CUSTOM_PREFIX}${q.id}`, // 例: 1 -> "custom-1"
        isCustom: true // 識別用フラグ
    }));

    // 固定問題と結合して返す
    return [...questionsData, ...formattedCustomQuestions];
}

/**
 * 履歴データと問題を紐付けて返すヘルパー関数
 * (Review.jsxやAnalysis.jsxで使用)
 */
export async function getAttemptsWithQuestions() {
    const attempts = await db.attempts.toArray();
    const customQuestions = await db.customQuestions.toArray();
    
    // 高速化のためにMapを作成
    const fixedMap = new Map(questionsData.map(q => [q.id, q]));
    // custom-1 形式のIDをキーにする
    const customMap = new Map(customQuestions.map(q => [`${CUSTOM_PREFIX}${q.id}`, { ...q, isCustom: true }]));

    // 履歴に問題データを結合
    const results = attempts.map(attempt => {
        // まず固定問題から探す
        let question = fixedMap.get(attempt.questionId);
        
        // なければAI問題から探す
        if (!question) {
            question = customMap.get(attempt.questionId);
        }

        return {
            ...attempt,
            question // 問題が見つからない場合は undefined になる
        };
    });

    // 問題データが存在するものだけを返す（削除された問題の履歴などを除外）
    return results.filter(item => item.question);
}