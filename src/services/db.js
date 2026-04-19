import Dexie from 'dexie';

export const db = new Dexie('StatsGrade1DB');

// Keep schema version for compatibility with existing local data.
db.version(7).stores({
  scores: '++id, score, timestamp',
  attempts: '++id, questionId, isCorrect, timeTaken, timestamp, chatLog, confidence',
  settings: 'key, value',
  customQuestions: '++id, text, options, correctIndex, difficulty, category, timestamp',
  learningState: 'questionId, nextReviewDate',
  userBadges: 'badgeId, unlockedAt',
});

db.version(8).stores({
  scores: '++id, score, timestamp',
  attempts: '++id, questionId, isCorrect, timeTaken, timestamp, chatLog, confidence',
  settings: 'key, value',
  customQuestions: '++id, text, options, correctIndex, difficulty, category, timestamp',
  learningState: 'questionId, nextReviewDate',
  userBadges: 'badgeId, unlockedAt',
  tutorMemory: 'id, content, updatedAt',
});

const SYNC_META_PREFIX = '__sync_';
const localDataChangeListeners = new Set();

let suppressLocalChangeTracking = false;

const nowIso = () => new Date().toISOString();

const notifyLocalDataChanged = () => {
  for (const listener of localDataChangeListeners) {
    try {
      listener();
    } catch (error) {
      console.error('local data change listener failed', error);
    }
  }
};

const setSyncMetaInternal = async (key, value) => {
  await db.settings.put({ key: `${SYNC_META_PREFIX}${key}`, value });
};

const markLocalDataChanged = async () => {
  if (suppressLocalChangeTracking) return;

  try {
    await setSyncMetaInternal('local_changed_at', nowIso());
  } catch (error) {
    console.error('failed to update local change metadata', error);
  }

  notifyLocalDataChanged();
};

export const subscribeToLocalDataChanges = (listener) => {
  localDataChangeListeners.add(listener);
  return () => localDataChangeListeners.delete(listener);
};

export const setSyncMeta = async (key, value) => {
  await setSyncMetaInternal(key, value);
};

export const getSyncMeta = async (key) => {
  const setting = await db.settings.get(`${SYNC_META_PREFIX}${key}`);
  return setting ? setting.value : null;
};

export const removeSyncMeta = async (key) => {
  await db.settings.delete(`${SYNC_META_PREFIX}${key}`);
};

export const runWithoutLocalChangeTracking = async (fn) => {
  suppressLocalChangeTracking = true;
  try {
    return await fn();
  } finally {
    suppressLocalChangeTracking = false;
  }
};

// --- Scores helpers ---
export const addScore = async (score) => {
  const id = await db.scores.add({ score, timestamp: new Date() });
  await markLocalDataChanged();
  return id;
};

export const getLatestScore = async () => {
  const latest = await db.scores.orderBy('timestamp').last();
  return latest ? latest.score : 40;
};

// --- Attempts helpers ---
export const addAttempt = async (questionId, isCorrect, timeTaken, chatLog = [], confidence = null) => {
  const id = await db.attempts.add({
    questionId,
    isCorrect,
    timeTaken,
    chatLog,
    confidence,
    timestamp: new Date(),
  });

  await markLocalDataChanged();
  return id;
};

export const getAttempts = async () => {
  return await db.attempts.toArray();
};

// --- Settings helpers ---
export const saveApiKey = async (apiKey) => {
  await db.settings.put({ key: 'apiKey', value: apiKey });
  await markLocalDataChanged();
};

export const getApiKey = async () => {
  const setting = await db.settings.get('apiKey');
  return setting ? setting.value : null;
};

export const saveTargetScore = async (score) => {
  await db.settings.put({ key: 'targetScore', value: score });
  await markLocalDataChanged();
};

export const getTargetScore = async () => {
  const setting = await db.settings.get('targetScore');
  return setting ? parseInt(setting.value, 10) : 80;
};

export const getBlockedSubcategories = async () => {
  const setting = await db.settings.get('blockedSubcategories');
  return setting ? JSON.parse(setting.value) : [];
};

export const addBlockedSubcategory = async (subcategory) => {
  const current = await getBlockedSubcategories();
  if (current.includes(subcategory)) return;

  const updated = [...current, subcategory];
  await db.settings.put({ key: 'blockedSubcategories', value: JSON.stringify(updated) });
  await markLocalDataChanged();
};

export const removeBlockedSubcategory = async (subcategory) => {
  const current = await getBlockedSubcategories();
  const updated = current.filter((s) => s !== subcategory);
  await db.settings.put({ key: 'blockedSubcategories', value: JSON.stringify(updated) });
  await markLocalDataChanged();
};

// --- Leveling helpers ---
export const getUserLevel = async () => {
  const setting = await db.settings.get('userLevel');
  return setting ? parseInt(setting.value, 10) : 1;
};

export const saveUserLevel = async (level) => {
  await db.settings.put({ key: 'userLevel', value: level });
  await markLocalDataChanged();
};

export const getUserExp = async () => {
  const setting = await db.settings.get('userExp');
  return setting ? parseInt(setting.value, 10) : 0;
};

export const saveUserExp = async (exp) => {
  await db.settings.put({ key: 'userExp', value: exp });
  await markLocalDataChanged();
};

// --- Badge helpers ---
export const unlockBadge = async (badgeId) => {
  const existing = await db.userBadges.get(badgeId);
  if (existing) return false;

  await db.userBadges.add({ badgeId, unlockedAt: new Date() });
  await markLocalDataChanged();
  return true;
};

export const getUnlockedBadges = async () => {
  return await db.userBadges.toArray();
};

// --- Custom question helpers ---
export const addCustomQuestion = async (question) => {
  const id = await db.customQuestions.add({
    ...question,
    timestamp: new Date(),
  });

  await markLocalDataChanged();
  return id;
};

export const getCustomQuestions = async () => {
  return await db.customQuestions.toArray();
};

// --- SRS helpers ---
export const getLearningState = async (questionId) => {
  return await db.learningState.get(questionId);
};

export const updateLearningState = async (questionId, newState) => {
  await db.learningState.put({
    questionId,
    ...newState,
  });

  await markLocalDataChanged();
};

export const getDueReviewQuestionIds = async () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dueItems = await db.learningState
    .where('nextReviewDate')
    .belowOrEqual(today.getTime())
    .toArray();

  return dueItems.map((item) => item.questionId);
};

// --- Exam date helpers ---
export const saveExamDate = async (dateStr) => {
  await db.settings.put({ key: 'examDate', value: dateStr });
  await markLocalDataChanged();
};

export const getExamDate = async () => {
  const setting = await db.settings.get('examDate');
  return setting ? setting.value : null;
};

// --- Launch streak helpers ---
export const recordDailyLaunch = async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastLaunch = await db.settings.get('lastLaunchDate');
  const streakSetting = await db.settings.get('launchStreak');
  const currentStreak = streakSetting ? parseInt(streakSetting.value, 10) : 0;

  if (lastLaunch?.value === todayStr) {
    return currentStreak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const newStreak = lastLaunch?.value === yesterdayStr ? currentStreak + 1 : 1;

  await db.settings.put({ key: 'lastLaunchDate', value: todayStr });
  await db.settings.put({ key: 'launchStreak', value: newStreak });
  return newStreak;
};

export const getLaunchStreak = async () => {
  const setting = await db.settings.get('launchStreak');
  return setting ? parseInt(setting.value, 10) : 0;
};

// --- Tutor memory helpers ---
export const getTutorMemory = async () => {
  const row = await db.tutorMemory.get('profile');
  return row ? row.content : null;
};

export const saveTutorMemory = async (content) => {
  await db.tutorMemory.put({ id: 'profile', content, updatedAt: new Date().toISOString() });
};

// --- Tutor daily message helpers ---
export const saveTutorDailyMessage = async (message) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  await db.settings.put({ key: 'lastTutorMessage', value: message });
  await db.settings.put({ key: 'lastTutorDate', value: todayStr });
};

export const getTutorDailyMessage = async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateSetting = await db.settings.get('lastTutorDate');
  if (dateSetting?.value !== todayStr) return null;
  const msgSetting = await db.settings.get('lastTutorMessage');
  return msgSetting ? msgSetting.value : null;
};

// --- Data management ---
export const exportAllData = async () => {
  const scores = await db.scores.toArray();
  const attempts = await db.attempts.toArray();
  const customQuestions = await db.customQuestions.toArray();
  const settings = await db.settings.toArray();
  const learningState = await db.learningState.toArray();
  const userBadges = await db.userBadges.toArray();

  return {
    version: 7,
    timestamp: nowIso(),
    data: { scores, attempts, customQuestions, settings, learningState, userBadges },
  };
};

export const importData = async (jsonData, options = {}) => {
  const { data } = jsonData;

  await db.transaction('rw', db.scores, db.attempts, db.customQuestions, db.settings, db.learningState, db.userBadges, async () => {
    await db.scores.clear();
    await db.attempts.clear();
    await db.customQuestions.clear();
    await db.settings.clear();
    await db.learningState.clear();
    await db.userBadges.clear();

    if (data.scores?.length) await db.scores.bulkAdd(data.scores);
    if (data.attempts?.length) await db.attempts.bulkAdd(data.attempts);
    if (data.customQuestions?.length) await db.customQuestions.bulkAdd(data.customQuestions);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
    if (data.learningState?.length) await db.learningState.bulkAdd(data.learningState);
    if (data.userBadges?.length) await db.userBadges.bulkAdd(data.userBadges);
  });

  if (!options.skipChangeTracking) {
    await markLocalDataChanged();
  }
};

export const resetAllData = async () => {
  await db.transaction('rw', db.scores, db.attempts, db.customQuestions, db.settings, db.learningState, db.userBadges, async () => {
    await db.scores.clear();
    await db.attempts.clear();
    await db.customQuestions.clear();
    await db.learningState.clear();
    await db.userBadges.clear();

    const apiKeyData = await db.settings.get('apiKey');
    const syncLocalChangedAt = await db.settings.get(`${SYNC_META_PREFIX}local_changed_at`);
    const syncLastRemoteAt = await db.settings.get(`${SYNC_META_PREFIX}last_remote_at`);
    const syncLastSyncAt = await db.settings.get(`${SYNC_META_PREFIX}last_sync_at`);

    await db.settings.clear();

    if (apiKeyData) await db.settings.put(apiKeyData);
    if (syncLocalChangedAt) await db.settings.put(syncLocalChangedAt);
    if (syncLastRemoteAt) await db.settings.put(syncLastRemoteAt);
    if (syncLastSyncAt) await db.settings.put(syncLastSyncAt);
  });

  await markLocalDataChanged();
};
