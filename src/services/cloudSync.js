import {
  exportAllData,
  getApiKey,
  getSyncMeta,
  importData,
  runWithoutLocalChangeTracking,
  saveApiKey,
  setSyncMeta,
  subscribeToLocalDataChanges,
} from './db';
import {
  getCurrentUser,
  isSupabaseConfigured,
  onSupabaseAuthStateChange,
  signInWithGoogle,
  signOutFromSupabase,
  supabase,
} from './supabase';

const SNAPSHOT_TABLE = 'user_sync_snapshots';
const AUTO_SYNC_INTERVAL_MS = 60_000;
const LOCAL_CHANGE_DEBOUNCE_MS = 2_000;

const syncStateListeners = new Set();

let state = {
  configured: isSupabaseConfigured,
  authenticated: false,
  user: null,
  inProgress: false,
  phase: 'idle',
  message: 'Not synced yet',
  lastSyncAt: null,
  lastError: null,
};

let started = false;
let unsubscribeAuth = null;
let unsubscribeLocalData = null;
let syncIntervalId = null;
let localChangeTimerId = null;
let inFlightSync = false;
let pendingSyncReason = null;
let pendingSyncForce = false;

const toMillis = (iso) => {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
};

const emitState = (patch) => {
  state = { ...state, ...patch };
  for (const listener of syncStateListeners) {
    try {
      listener(state);
    } catch (error) {
      console.error('sync state listener failed', error);
    }
  }
};

const sanitizeSnapshotForCloud = (snapshot) => {
  const settings = (snapshot?.data?.settings ?? []).filter(
    (row) => row.key !== 'apiKey' && !row.key.startsWith('__sync_'),
  );

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      settings,
    },
  };
};

const fetchRemoteSnapshot = async (userId) => {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select('user_id, payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const pushLocalSnapshot = async (user) => {
  const snapshot = sanitizeSnapshotForCloud(await exportAllData());
  const now = new Date().toISOString();

  const { error } = await supabase.from(SNAPSHOT_TABLE).upsert(
    {
      user_id: user.id,
      payload: snapshot,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw error;

  await setSyncMeta('last_remote_at', now);
  await setSyncMeta('last_sync_at', now);
  await setSyncMeta('local_changed_at', now);

  return { action: 'pushed', remoteUpdatedAt: now };
};

const pullRemoteSnapshot = async (remoteSnapshot) => {
  if (!remoteSnapshot?.payload) return { action: 'noop', remoteUpdatedAt: null };

  const existingApiKey = await getApiKey();

  await runWithoutLocalChangeTracking(async () => {
    await importData(remoteSnapshot.payload, { skipChangeTracking: true });
    if (existingApiKey) {
      await saveApiKey(existingApiKey);
    }
  });

  const remoteUpdatedAt = remoteSnapshot.updated_at ?? new Date().toISOString();
  await setSyncMeta('last_remote_at', remoteUpdatedAt);
  await setSyncMeta('last_sync_at', new Date().toISOString());
  await setSyncMeta('local_changed_at', remoteUpdatedAt);

  return { action: 'pulled', remoteUpdatedAt };
};

const performSingleSync = async ({ reason = 'manual', force = false } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    emitState({
      configured: false,
      phase: 'disabled',
      message: 'Supabase env vars are missing',
      lastError: null,
    });
    return { action: 'skipped_not_configured' };
  }

  const user = await getCurrentUser();
  if (!user) {
    emitState({
      authenticated: false,
      user: null,
      phase: 'idle',
      inProgress: false,
      message: 'Sign in to enable cloud sync',
      lastError: null,
    });
    return { action: 'skipped_not_authenticated' };
  }

  emitState({
    configured: true,
    authenticated: true,
    user,
    inProgress: true,
    phase: 'syncing',
    message: `Syncing (${reason})...`,
    lastError: null,
  });

  const [localChangedAt, lastRemoteAt, lastSyncAt] = await Promise.all([
    getSyncMeta('local_changed_at'),
    getSyncMeta('last_remote_at'),
    getSyncMeta('last_sync_at'),
  ]);

  const remoteSnapshot = await fetchRemoteSnapshot(user.id);
  const remoteUpdatedAt = remoteSnapshot?.updated_at ?? null;

  const localDirty = force || !lastSyncAt || toMillis(localChangedAt) > toMillis(lastSyncAt);
  const remoteDirty = force || toMillis(remoteUpdatedAt) > toMillis(lastRemoteAt);

  let result;

  if (!remoteSnapshot) {
    result = await pushLocalSnapshot(user);
  } else if (localDirty && remoteDirty) {
    if (toMillis(localChangedAt) >= toMillis(remoteUpdatedAt)) {
      result = await pushLocalSnapshot(user);
    } else {
      result = await pullRemoteSnapshot(remoteSnapshot);
    }
  } else if (localDirty) {
    result = await pushLocalSnapshot(user);
  } else if (remoteDirty) {
    result = await pullRemoteSnapshot(remoteSnapshot);
  } else {
    const now = new Date().toISOString();
    await setSyncMeta('last_sync_at', now);
    result = { action: 'noop', remoteUpdatedAt: lastRemoteAt ?? remoteUpdatedAt ?? now };
  }

  emitState({
    configured: true,
    authenticated: true,
    user,
    inProgress: false,
    phase: 'idle',
    message: `Last sync: ${new Date().toLocaleString()}`,
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  });

  return result;
};

const scheduleSyncFromLocalChange = () => {
  if (!started) return;
  if (localChangeTimerId) clearTimeout(localChangeTimerId);
  localChangeTimerId = setTimeout(() => {
    requestSync({ reason: 'local_change' }).catch((error) => {
      console.error('auto sync failed', error);
    });
  }, LOCAL_CHANGE_DEBOUNCE_MS);
};

export const requestSync = async ({ reason = 'manual', force = false } = {}) => {
  if (inFlightSync) {
    pendingSyncReason = reason;
    pendingSyncForce = pendingSyncForce || force;
    return { action: 'queued' };
  }

  inFlightSync = true;
  try {
    let currentReason = reason;
    let currentForce = force;
    let result = null;

    while (true) {
      try {
        result = await performSingleSync({ reason: currentReason, force: currentForce });
      } catch (error) {
        emitState({
          inProgress: false,
          phase: 'error',
          message: 'Sync failed',
          lastError: error.message ?? String(error),
        });
        throw error;
      }

      if (!pendingSyncReason) break;

      currentReason = pendingSyncReason;
      currentForce = pendingSyncForce;
      pendingSyncReason = null;
      pendingSyncForce = false;
    }

    return result;
  } finally {
    inFlightSync = false;
  }
};

export const startCloudSync = () => {
  if (started) return () => stopCloudSync();
  started = true;

  if (!isSupabaseConfigured || !supabase) {
    emitState({
      configured: false,
      phase: 'disabled',
      message: 'Supabase env vars are missing',
      lastError: null,
    });
    return () => stopCloudSync();
  }

  unsubscribeAuth = onSupabaseAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    emitState({
      configured: true,
      authenticated: Boolean(user),
      user,
      message: user ? 'Signed in' : 'Sign in to enable cloud sync',
      lastError: null,
    });

    if (user) {
      requestSync({ reason: 'auth' }).catch((error) => {
        console.error('auth sync failed', error);
      });
    }
  });

  unsubscribeLocalData = subscribeToLocalDataChanges(scheduleSyncFromLocalChange);

  syncIntervalId = setInterval(() => {
    requestSync({ reason: 'interval' }).catch((error) => {
      console.error('scheduled sync failed', error);
    });
  }, AUTO_SYNC_INTERVAL_MS);

  const onOnline = () => {
    requestSync({ reason: 'online' }).catch((error) => {
      console.error('online sync failed', error);
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      requestSync({ reason: 'visible' }).catch((error) => {
        console.error('visibility sync failed', error);
      });
    }
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibilityChange);

  getCurrentUser().then((user) => {
    emitState({
      configured: true,
      authenticated: Boolean(user),
      user,
      message: user ? 'Signed in' : 'Sign in to enable cloud sync',
      lastError: null,
    });
    if (user) {
      requestSync({ reason: 'startup' }).catch((error) => {
        console.error('startup sync failed', error);
      });
    }
  });

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    stopCloudSync();
  };
};

export const stopCloudSync = () => {
  started = false;
  if (localChangeTimerId) clearTimeout(localChangeTimerId);
  if (syncIntervalId) clearInterval(syncIntervalId);
  if (unsubscribeAuth) unsubscribeAuth();
  if (unsubscribeLocalData) unsubscribeLocalData();

  localChangeTimerId = null;
  syncIntervalId = null;
  unsubscribeAuth = null;
  unsubscribeLocalData = null;
};

export const getCloudSyncState = () => state;

export const subscribeCloudSyncState = (listener) => {
  syncStateListeners.add(listener);
  listener(state);
  return () => syncStateListeners.delete(listener);
};

export const signInToCloud = async () => {
  await signInWithGoogle();
};

export const signOutFromCloud = async () => {
  await signOutFromSupabase();
  emitState({
    authenticated: false,
    user: null,
    inProgress: false,
    phase: 'idle',
    message: 'Signed out',
    lastError: null,
  });
};
