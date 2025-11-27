import React, { useState, useEffect } from 'react';
import { Save, Key, AlertCircle, Target, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveApiKey, getApiKey, saveTargetScore, getTargetScore } from '../services/db';

export default function Settings() {
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [targetScore, setTargetScore] = useState(80);
    const [saved, setSaved] = useState(false);

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
                        
                        {/* スライダーの修正：標準スタイルを使用しaccent-colorで色付け */}
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
            </div>
        </div>
    );
}