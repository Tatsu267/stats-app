import Dexie from 'dexie';

export const db = new Dexie('StatsGrade1DB');

// バージョンを2に上げ、新しいテーブルを追加
db.version(2).stores({
    scores: '++id, score, timestamp',
    attempts: '++id, questionId, isCorrect, timeTaken, timestamp',
    settings: 'key, value',
    customQuestions: '++id, text, options, correctIndex, difficulty, category, timestamp' // 新規追加
});

// --- Existing Helpers ---
export const addScore = async (score) => {
    return await db.scores.add({ score, timestamp: new Date() });
};

export const getLatestScore = async () => {
    const latest = await db.scores.orderBy('timestamp').last();
    return latest ? latest.score : 40;
};

export const addAttempt = async (questionId, isCorrect, timeTaken) => {
    return await db.attempts.add({ questionId, isCorrect, timeTaken, timestamp: new Date() });
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

// --- Custom Question Helpers (New) ---
export const addCustomQuestion = async (question) => {
    // idは自動採番されるので除外して追加
    const id = await db.customQuestions.add({
        ...question,
        timestamp: new Date()
    });
    return id;
};

export const getCustomQuestions = async () => {
    return await db.customQuestions.toArray();
};