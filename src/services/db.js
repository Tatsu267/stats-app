import Dexie from 'dexie';

export const db = new Dexie('StatsGrade1DB');

// バージョン4: chatLog を attempts に追加
db.version(4).stores({
    scores: '++id, score, timestamp',
    attempts: '++id, questionId, isCorrect, timeTaken, timestamp, chatLog', // chatLog追加
    settings: 'key, value',
    customQuestions: '++id, text, options, correctIndex, difficulty, category, timestamp',
    learningState: 'questionId, nextReviewDate'
}).upgrade(trans => {
    // 既存データへのマイグレーション（必要なら）
});

// ... (Existing Helpers) ...
// ※変更なし部分は省略。addAttemptのみ更新

export const addScore = async (score) => {
    return await db.scores.add({ score, timestamp: new Date() });
};

export const getLatestScore = async () => {
    const latest = await db.scores.orderBy('timestamp').last();
    return latest ? latest.score : 40;
};

export const addAttempt = async (questionId, isCorrect, timeTaken, chatLog = []) => {
    return await db.attempts.add({ 
        questionId, 
        isCorrect, 
        timeTaken, 
        chatLog, // チャットログも保存
        timestamp: new Date() 
    });
};

export const getAttempts = async () => {
    return await db.attempts.toArray();
};

// ... (Settings, CustomQuestion, SRS, DataManagement Helpers は変更なし、そのまま維持) ...
// 以前のコードをそのまま貼り付けてください。addAttempt だけ引数を増やしています。
// 以下、省略せず記載します

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

export const exportAllData = async () => {
    const scores = await db.scores.toArray();
    const attempts = await db.attempts.toArray();
    const customQuestions = await db.customQuestions.toArray();
    const settings = await db.settings.toArray();
    const learningState = await db.learningState.toArray();

    return {
        version: 3,
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
        
        const apiKeyData = await db.settings.get('apiKey');
        await db.settings.clear();
        if (apiKeyData) await db.settings.put(apiKeyData);
    });
};