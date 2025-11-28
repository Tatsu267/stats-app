import questionsData from '../data/questions.json';
import { db } from '../services/db';

// AI生成問題のIDプレフィックス
export const CUSTOM_PREFIX = 'custom-';
// 固定問題のIDプレフィックス（新規追加）
export const FIXED_PREFIX = 'fixed-';

/**
 * 固定問題とAI生成問題を統合して全問題リストを取得する
 */
export async function getAllQuestions() {
    const customQuestions = await db.customQuestions.toArray();
    
    // 固定問題にIDがない場合や重複を防ぐため、プレフィックス付きIDを強制割り当て
    const formattedFixedQuestions = questionsData.map((q, index) => ({
        ...q,
        // もしJSONにidがあればそれを使うが、文字列化してプレフィックスをつける
        // idがなければインデックスを使う
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
}

/**
 * 履歴データと問題を紐付けて返す
 */
export async function getAttemptsWithQuestions() {
    const attempts = await db.attempts.toArray();
    const allQuestions = await getAllQuestions();
    
    // IDをキーにしたMapを作成
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));

    // 過去の履歴データ（数値IDで保存されている可能性があるもの）との互換性対応
    // 古い履歴のIDが "1" なら、新しい "1" (または "fixed-0") とマッチさせる必要があるが、
    // ここではシンプルに「IDが一致するもの」を探す
    
    const results = attempts.map(attempt => {
        let question = questionMap.get(attempt.questionId);
        
        // フォールバック: もしIDが数値で保存されていて、Mapのキーが文字列の場合の救済
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