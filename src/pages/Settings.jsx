import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Cloud,
  Download,
  FileJson,
  Key,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  exportAllData,
  getApiKey,
  getBlockedSubcategories,
  getTargetScore,
  importData,
  removeBlockedSubcategory,
  resetAllData,
  saveApiKey,
  saveTargetScore,
} from '../services/db';
import {
  getCloudSyncState,
  requestSync,
  signInToCloud,
  signOutFromCloud,
  subscribeCloudSyncState,
} from '../services/cloudSync';

const formatDateTime = (isoText) => {
  if (!isoText) return '未同期';
  const parsed = Date.parse(isoText);
  if (Number.isNaN(parsed)) return '未同期';
  return new Date(parsed).toLocaleString();
};

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [apiKey, setApiKey] = useState('');
  const [targetScore, setTargetScore] = useState(80);
  const [saved, setSaved] = useState(false);

  const [syncState, setSyncState] = useState(getCloudSyncState());
  const [manualSyncBusy, setManualSyncBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const blockedList = useLiveQuery(async () => await getBlockedSubcategories(), []);

  useEffect(() => {
    const loadSettings = async () => {
      const key = await getApiKey();
      if (key) setApiKey(key);

      const target = await getTargetScore();
      if (target) setTargetScore(target);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCloudSyncState((nextState) => {
      setSyncState(nextState);
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    await saveApiKey(apiKey);
    await saveTargetScore(targetScore);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCloudLogin = async () => {
    try {
      setAuthBusy(true);
      await signInToCloud();
    } catch (error) {
      console.error(error);
      alert(`Googleログインに失敗しました: ${error.message ?? String(error)}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCloudLogout = async () => {
    try {
      setAuthBusy(true);
      await signOutFromCloud();
    } catch (error) {
      console.error(error);
      alert(`ログアウトに失敗しました: ${error.message ?? String(error)}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setManualSyncBusy(true);
      await requestSync({ reason: 'manual', force: true });
    } catch (error) {
      console.error(error);
      alert(`同期に失敗しました: ${error.message ?? String(error)}`);
    } finally {
      setManualSyncBusy(false);
    }
  };

  const handleRemoveBlock = async (topic) => {
    if (!window.confirm(`「${topic}」のブロックを解除しますか？`)) return;
    await removeBlockedSubcategory(topic);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stats-grade1-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('バックアップファイルを保存しました。');
    } catch (error) {
      console.error(error);
      alert('エクスポートに失敗しました。');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('現在のデータをバックアップファイルで上書きします。続行しますか？')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (readEvent) => {
      try {
        const json = JSON.parse(readEvent.target?.result);
        await importData(json);
        alert('データの復元が完了しました。アプリを再読み込みします。');
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert('復元に失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleReset = async () => {
    const firstConfirm = window.confirm(
      '学習データを初期化しますか？\n\nスコア、履歴、カスタム問題などが削除されます。APIキーは保持します。',
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm('本当に削除しますか？この操作は元に戻せません。');
    if (!secondConfirm) return;

    await resetAllData();
    alert('データを初期化しました。アプリを再読み込みします。');
    window.location.reload();
  };

  const cloudConfigured = syncState.configured;
  const cloudLoggedIn = Boolean(syncState.user);
  const cloudBusy = syncState.inProgress || manualSyncBusy;

  return (
    <div className="pb-28 px-4 pt-6 max-w-2xl mx-auto animate-fade-in">
      <header className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">設定</h1>
      </header>

      <div className="space-y-6">
        <div className="card glass-card p-6 border border-sky-500/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Cloud className="text-sky-400" size={20} />
            クラウド同期（Googleログイン）
          </h2>

          {!cloudConfigured && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200 mb-4">
              Supabaseの環境変数が未設定です。`VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。
            </div>
          )}

          <div className="space-y-2 text-sm text-gray-300 mb-4">
            <p>ステータス: {syncState.phase === 'error' ? 'エラー' : syncState.message}</p>
            <p>ログイン: {cloudLoggedIn ? syncState.user.email : '未ログイン'}</p>
            <p>最終同期: {formatDateTime(syncState.lastSyncAt)}</p>
            {syncState.lastError && <p className="text-red-300">詳細: {syncState.lastError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cloudLoggedIn ? (
              <button
                onClick={handleCloudLogout}
                disabled={authBusy || cloudBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <LogOut size={18} />
                ログアウト
              </button>
            ) : (
              <button
                onClick={handleCloudLogin}
                disabled={!cloudConfigured || authBusy || cloudBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <LogIn size={18} />
                Googleでログイン
              </button>
            )}

            <button
              onClick={handleManualSync}
              disabled={!cloudConfigured || !cloudLoggedIn || cloudBusy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-700 hover:bg-sky-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={cloudBusy ? 'animate-spin' : ''} />
              今すぐ同期
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            自動同期は「起動時 / ローカル更新時 / 一定間隔 / オンライン復帰時」に実行されます。
          </p>
        </div>

        <div className="card glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Target className="text-green-400" size={20} />
            目標スコア
          </h2>

          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>目標</span>
            <span className="text-white font-bold text-lg">{targetScore}点</span>
          </div>

          <input
            type="range"
            min="40"
            max="100"
            step="5"
            value={targetScore}
            onChange={(e) => setTargetScore(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>40</span>
            <span>100</span>
          </div>
        </div>

        <div className="card glass-card p-6 border border-red-500/20">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Ban className="text-red-400" size={20} />
            出題ブロック一覧
          </h2>
          <p className="text-sm text-gray-400 mb-4">AIが判定した「苦手カテゴリ」を一時的に除外できます。</p>

          {blockedList && blockedList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {blockedList.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm"
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => handleRemoveBlock(topic)}
                    className="hover:bg-red-500/20 rounded-full p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
              現在ブロックされているカテゴリはありません。
            </div>
          )}
        </div>

        <div className="card glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="text-blue-400" size={20} />
            AI設定
          </h2>

          <label className="block text-sm font-medium text-gray-400 mb-2">OpenAI / Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
          />
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <AlertCircle size={12} />
            APIキーはローカル保存されます（クラウド同期には含めません）。
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 ${
            saved
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          <Save size={20} />
          {saved ? '設定を保存しました' : '設定を保存する'}
        </button>

        <div className="card glass-card p-6 border border-gray-700/50 mt-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileJson className="text-purple-400" size={20} />
            データ管理
          </h2>
          <p className="text-sm text-gray-400 mb-6">学習履歴をJSONとして保存/復元できます。</p>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              <Download size={18} />
              バックアップを保存
            </button>

            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button
              onClick={handleImportClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              <Upload size={18} />
              バックアップから復元
            </button>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 rounded-xl font-bold transition-all active:scale-95 mt-6"
            >
              <Trash2 size={18} />
              データを初期化
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
