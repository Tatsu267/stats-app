import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
    PlayCircle, 
    Settings,
    ArrowRight,
    Dices,
    BarChart3,
    Flame,
    Target,
    ClipboardList
} from 'lucide-react';
import { db, getTargetScore } from '../services/db';

export default function Dashboard() {
    const navigate = useNavigate();

    // データの取得
    const score = useLiveQuery(async () => {
        const latest = await db.scores.orderBy('timestamp').last();
        return latest ? latest.score : 40;
    }, []);

    const streak = useLiveQuery(async () => {
        const lastAttempt = await db.attempts.orderBy('timestamp').last();
        if (!lastAttempt) return 0;
        
        const lastDate = new Date(lastAttempt.timestamp);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        return diffDays <= 1 ? 1 : 0; 
    }, []);

    // 目標スコアの取得
    const targetScoreVal = useLiveQuery(async () => {
        return await getTargetScore();
    }, [], 80);

    const currentScore = score ?? 40;
    const progressPercent = Math.min(100, Math.round((currentScore / targetScoreVal) * 100));

    return (
        <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            {/* ヘッダー */}
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Welcome back</p>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        StatsGrade<span className="text-blue-500">1</span>
                    </h1>
                </div>
                <button 
                    onClick={() => navigate('/settings')}
                    className="p-2.5 rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700/50 tap-target"
                    aria-label="設定画面へ"
                >
                    <Settings size={20} />
                </button>
            </header>

            {/* ステータスセクション (Grade削除版) */}
            <div className="grid grid-cols-2 gap-3 mb-8 h-48">
                {/* Left: Big Predicted Score */}
                <div className="card glass-card p-5 flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">予測スコア</span>
                    </div>
                    
                    <div className="flex flex-col justify-center flex-1">
                        <div className="flex items-baseline gap-1">
                            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                                {currentScore}
                            </p>
                            <span className="text-sm text-gray-500 font-medium">/ 100</span>
                        </div>
                    </div>
                    
                    {/* Background Deco */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                </div>

                {/* Right: Stacked Streak & Goal */}
                <div className="flex flex-col gap-3 h-full">
                    {/* Streak */}
                    <div className="card glass-card flex-1 p-4 flex flex-col justify-center relative bg-gray-800/60 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Flame size={16} className="text-orange-400" fill="currentColor" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Streak</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {streak ?? 0} <span className="text-xs font-normal text-gray-500">days</span>
                        </p>
                    </div>

                    {/* Goal */}
                    <div className="card glass-card flex-1 p-4 flex flex-col justify-center relative bg-gray-800/60 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Target size={16} className="text-emerald-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Goal</span>
                        </div>
                        <div className="flex items-end justify-between w-full">
                            <p className="text-2xl font-bold text-white">
                                {progressPercent}<span className="text-sm font-normal text-gray-500">%</span>
                            </p>
                            
                            {/* Circular Progress */}
                            <div className="relative w-9 h-9 flex items-center justify-center">
                                <svg className="transform -rotate-90 w-full h-full">
                                    <circle cx="18" cy="18" r="14" stroke="#334155" strokeWidth="3" fill="transparent" />
                                    <circle cx="18" cy="18" r="14" stroke="#10b981" strokeWidth="3" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 14}
                                        strokeDashoffset={2 * Math.PI * 14 * (1 - progressPercent / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-1">
                <PlayCircle size={20} className="text-blue-400" />
                演習を始める
            </h2>

            {/* 演習アクションボタン群 */}
            <div className="space-y-4">
                {/* 1. ランダム演習 */}
                <button
                    onClick={() => navigate('/quiz', { state: { mode: 'random', start: true } })}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-left shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] tap-target border border-white/10"
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <Dices size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-0.5">ランダム演習</h3>
                                <p className="text-blue-100 text-xs font-medium opacity-90">全範囲から5問出題</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="text-white w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                </button>

                {/* 2. 分野別演習 */}
                <button
                    onClick={() => navigate('/quiz', { state: { mode: 'category_select' } })}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-5 text-left shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] tap-target border border-white/10"
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <BarChart3 size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-0.5">分野別演習</h3>
                                <p className="text-purple-100 text-xs font-medium opacity-90">特定の分野を重点的に学習</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="text-white w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                </button>

                {/* 3. 模擬試験 */}
                <button
                    onClick={() => navigate('/quiz', { state: { mode: 'mock', start: true } })}
                    className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-left shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] tap-target border border-white/10"
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <ClipboardList size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-0.5">模擬試験</h3>
                                <p className="text-teal-100 text-xs font-medium opacity-90">本番形式 / 制限時間90分</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="text-white w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                </button>
            </div>
        </div>
    );
}