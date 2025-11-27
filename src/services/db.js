import Dexie from 'dexie';

export const db = new Dexie('StatsGrade1DB');

db.version(1).stores({
    scores: '++id, score, timestamp', // History of total scores
    attempts: '++id, questionId, isCorrect, timeTaken, timestamp', // History of individual question attempts
    settings: 'key, value' // Key-value store for settings (e.g. API Key)
});

// Helper to add a score entry
export const addScore = async (score) => {
    return await db.scores.add({
        score,
        timestamp: new Date()
    });
};

// Helper to get latest score
export const getLatestScore = async () => {
    const latest = await db.scores.orderBy('timestamp').last();
    return latest ? latest.score : 40; // Default initial score
};

// Helper to add an attempt
export const addAttempt = async (questionId, isCorrect, timeTaken) => {
    return await db.attempts.add({
        questionId,
        isCorrect,
        timeTaken,
        timestamp: new Date()
    });
};

// Helper to get all attempts
export const getAttempts = async () => {
    return await db.attempts.toArray();
};

// Helper to save API Key
export const saveApiKey = async (apiKey) => {
    return await db.settings.put({ key: 'apiKey', value: apiKey });
};

// Helper to get API Key
export const getApiKey = async () => {
    const setting = await db.settings.get('apiKey');
    return setting ? setting.value : null;
};
