import React, { useState, useEffect, useRef } from 'react';
import { Save, Key, AlertCircle, Target, ArrowLeft, Download, Upload, Trash2, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveApiKey, getApiKey, saveTargetScore, getTargetScore, exportAllData, importData, resetAllData } from '../services/db';

export default function Settings() {
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [targetScore, setTargetScore] = useState(80);
    const [saved, setSaved] = useState(false);
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadSettings = async () => {
            const key = await getApiKey();
            if (key) setApiKey(key);
            
            const target = await getTargetScore();
            if (target) setTargetScore(target);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        await saveApiKey(apiKey);
        await saveTargetScore(targetScore);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // バックアップ
    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stats-grade1-backup-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('バックアップファイルを保存しました。');
        } catch (e) {
            console.error(e);
            alert('エクスポートに失敗しました。');
        }
    };

    // 復元
    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!window.confirm('警告：現在のデータはすべて上書きされ、復元できなくなります。\nバックアップファイルからデータを復元してもよろしいですか？')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                await importData(json);
                alert('データの復元が完了しました。アプリを再読み込みします。');
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert('インポートに失敗しました。正しいバックアップファイルを選択してください。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // 初期化処理（メッセージ修正）
    const handleReset = async () => {
        // ▼▼▼ メッセージ変更 ▼▼▼
        if (window.confirm('【危険】学習データを初期化しますか？\nこの操作は取り消せません。\n\n※学習履歴、スコア、AI生成問題は削除されますが、\nAPIキーの設定は保持されます。')) {
            if (window.confirm('本当に削除してよろしいですか？')) {
                await resetAllData();
                alert('データを初期化しました。アプリを再読み込みします。');
                window.location.reload();
            }
        }
    };

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
                {/* 目標スコア設定 */}
                <div className="card glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Target className="text-green-400" size={20} />
                        学習目標
                    </h2>
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>目標スコア</span>
                            <span className="text-white font-bold text-lg">{targetScore}点</span>
                        </div>
                        
                        <input
                            type="range"
                            min="40"
                            max="100"
                            step="5"
                            value={targetScore}
                            onChange={(e) => setTargetScore(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            style={{ accentColor: '#3b82f6' }} 
                        />
                        
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>40 (Min)</span>
                            <span>100 (Max)</span>
                        </div>
                    </div>
                </div>

                {/* API設定 */}
                <div className="card glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Key className="text-blue-400" size={20} />
                        AI 設定
                    </h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            OpenAI / Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <AlertCircle size={12} />
                            キーはブラウザ内にのみ保存されます。
                        </p>
                    </div>
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

                {/* データ管理セクション */}
                <div className="card glass-card p-6 border border-gray-700/50 mt-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FileJson className="text-purple-400" size={20} />
                        データ管理
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                        学習履歴やAI生成問題をバックアップ（保存）したり、他の端末に移行したりできます。
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-xl font-bold transition-all active:scale-95"
                        >
                            <Download size={18} />
                            バックアップを保存
                        </button>

                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
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