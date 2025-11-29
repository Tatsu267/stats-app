import Dexie from 'dexie';

export const db = new Dexie('StatsGrade1DB');

// バージョン6: 
// - attempts テーブルに 'confidence' カラムを追加
// - settings テーブルはKey-Value形式で 'userLevel', 'userExp' などを保存
db.version(6).stores({
    scores: '++id, score, timestamp',
    attempts: '++id, questionId, isCorrect, timeTaken, timestamp, chatLog, confidence', // confidence追加
    settings: 'key, value',
    customQuestions: '++id, text, options, correctIndex, difficulty, category, timestamp',
    learningState: 'questionId, nextReviewDate'
});

// --- Scores Helpers ---

export const addScore = async (score) => {
    return await db.scores.add({ score, timestamp: new Date() });
};

export const getLatestScore = async () => {
    const latest = await db.scores.orderBy('timestamp').last();
    return latest ? latest.score : 40;
};

// --- Attempts Helpers ---

/**
 * 学習履歴を追加する
 * @param {string|number} questionId 
 * @param {boolean} isCorrect 
 * @param {number} timeTaken 
 * @param {Array} chatLog 
 * @param {number|null} confidence - 1(Again) ~ 4(Easy), nullなら未設定
 */
export const addAttempt = async (questionId, isCorrect, timeTaken, chatLog = [], confidence = null) => {
    return await db.attempts.add({ 
        questionId, 
        isCorrect, 
        timeTaken, 
        chatLog,
        confidence, // 自信度を保存
        timestamp: new Date() 
    });
};

export const getAttempts = async () => {
    return await db.attempts.toArray();
};

// --- Settings Helpers ---

export const saveApiKey = async (apiKey) => {
    return await db.settings.put({ key: 'apiKey', value: apiKey });
};

export const getApiKey = async () => {
    const setting = await db.settings.get('apiKey');
    return setting ? setting.value : null;
};

export const saveTargetScore = async (score) => {
    return await db.settings.put({ key: 'targetScore', value: score });
};

export const getTargetScore = async () => {
    const setting = await db.settings.get('targetScore');
    return setting ? parseInt(setting.value, 10) : 80;
};

// --- Leveling Helpers (New) ---

export const getUserLevel = async () => {
    const setting = await db.settings.get('userLevel');
    return setting ? parseInt(setting.value, 10) : 1;
};

export const saveUserLevel = async (level) => {
    return await db.settings.put({ key: 'userLevel', value: level });
};

export const getUserExp = async () => {
    const setting = await db.settings.get('userExp');
    return setting ? parseInt(setting.value, 10) : 0;
};

export const saveUserExp = async (exp) => {
    return await db.settings.put({ key: 'userExp', value: exp });
};

// --- Custom Question Helpers (AI Generated) ---

export const addCustomQuestion = async (question) => {
    const id = await db.customQuestions.add({
        ...question,
        timestamp: new Date()
    });
    return id;
};

export const getCustomQuestions = async () => {
    return await db.customQuestions.toArray();
};

// --- SRS (Spaced Repetition) Helpers ---

export const getLearningState = async (questionId) => {
    return await db.learningState.get(questionId);
};

export const updateLearningState = async (questionId, newState) => {
    return await db.learningState.put({
        questionId,
        ...newState
    });
};

export const getDueReviewQuestionIds = async () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueItems = await db.learningState
        .where('nextReviewDate')
        .belowOrEqual(today.getTime())
        .toArray();
        
    return dueItems.map(item => item.questionId);
};

// --- Data Management (Export/Import/Reset) ---

export const exportAllData = async () => {
    const scores = await db.scores.toArray();
    const attempts = await db.attempts.toArray();
    const customQuestions = await db.customQuestions.toArray();
    const settings = await db.settings.toArray();
    const learningState = await db.learningState.toArray();

    return {
        version: 6, // スキーマバージョンに合わせて更新
        timestamp: new Date().toISOString(),
        data: { scores, attempts, customQuestions, settings, learningState }
    };
};

export const importData = async (jsonData) => {
    const { data } = jsonData;
    
    await db.transaction('rw', db.scores, db.attempts, db.customQuestions, db.settings, db.learningState, async () => {
        await db.scores.clear();
        await db.attempts.clear();
        await db.customQuestions.clear();
        await db.settings.clear();
        await db.learningState.clear();

        if (data.scores?.length) await db.scores.bulkAdd(data.scores);
        if (data.attempts?.length) await db.attempts.bulkAdd(data.attempts);
        if (data.customQuestions?.length) await db.customQuestions.bulkAdd(data.customQuestions);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
        if (data.learningState?.length) await db.learningState.bulkAdd(data.learningState);
    });
};

export const resetAllData = async () => {
    await db.transaction('rw', db.scores, db.attempts, db.customQuestions, db.settings, db.learningState, async () => {
        await db.scores.clear();
        await db.attempts.clear();
        await db.customQuestions.clear();
        await db.learningState.clear();
        
        // APIキーだけは保持する（ユーザー体験のため）
        const apiKeyData = await db.settings.get('apiKey');
        await db.settings.clear();
        if (apiKeyData) await db.settings.put(apiKeyData);
        
        // レベル情報などもリセットされる（settings.clear()に含まれるため）
        // 必要ならここで初期値を再設定するが、get関数でデフォルト値(Lv1, Exp0)を返すので問題ない
    });
};