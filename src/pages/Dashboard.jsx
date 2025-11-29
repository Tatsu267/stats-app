import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
    PlayCircle, Settings, ArrowRight, Flame, Target, ClipboardList, Sparkles, AlarmClock, Briefcase, Crown, Zap
} from 'lucide-react';
import { db, getTargetScore, getDueReviewQuestionIds, getUserLevel, getUserExp } from '../services/db';
import { getNextLevelExp } from '../utils/leveling';
import { cn } from '../utils/cn';

export default function Dashboard() {
    const navigate = useNavigate();

    // ユーザーレベルと経験値を取得
    const userStatus = useLiveQuery(async () => {
        const level = await getUserLevel();
        const exp = await getUserExp();
        return { level, exp };
    }, [], { level: 1, exp: 0 });

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

    const dueReviewIds = useLiveQuery(async () => {
        return await getDueReviewQuestionIds();
    }, []);

    const dueCount = dueReviewIds?.length || 0;
    const targetScoreVal = useLiveQuery(async () => await getTargetScore(), [], 80);
    const currentScore = score ?? 40;
    const progressPercent = Math.min(100, Math.round((currentScore / targetScoreVal) * 100));

    // レベル計算
    const nextLevelExp = getNextLevelExp(userStatus.level);
    const expPercent = Math.min(100, Math.round((userStatus.exp / nextLevelExp) * 100));

    const handleRecommendedStart = () => {
        if (dueCount > 0) {
            navigate('/quiz', { state: { mode: 'srs_review', start: true } });
        } else {
            navigate('/quiz', { state: { mode: 'random', start: true } });
        }
    };

    return (
        <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Welcome back</p>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        StatsGrade<span className="text-blue-500">1</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/settings')} className="p-2.5 rounded-full bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700/50 tap-target"><Settings size={20} /></button>
            </header>

            {/* Level & Status Card */}
            <div className="card glass-card p-5 mb-6 bg-gradient-to-r from-gray-800 to-gray-900 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={100} className="text-yellow-500" /></div>
                
                <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-gray-800">
                        <span className="text-2xl font-black text-white">{userStatus.level}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-bold text-gray-200">Level {userStatus.level}</span>
                            <span className="text-xs text-gray-400 font-mono">{userStatus.exp} / {nextLevelExp} XP</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out" style={{ width: `${expPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 relative z-10">
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-white/5">
                        <div className="flex justify-center text-orange-400 mb-1"><Flame size={16} /></div>
                        <span className="text-lg font-bold text-white leading-none">{streak ?? 0}</span>
                        <p className="text-[10px] text-gray-500 uppercase mt-1">Days Streak</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-white/5">
                        <div className="flex justify-center text-blue-400 mb-1"><Zap size={16} /></div>
                        <span className="text-lg font-bold text-white leading-none">{currentScore}</span>
                        <p className="text-[10px] text-gray-500 uppercase mt-1">Est. Score</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-white/5">
                        <div className="flex justify-center text-emerald-400 mb-1"><Target size={16} /></div>
                        <span className="text-lg font-bold text-white leading-none">{progressPercent}%</span>
                        <p className="text-[10px] text-gray-500 uppercase mt-1">Goal</p>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-1">
                <PlayCircle size={20} className="text-blue-400" />
                演習を始める
            </h2>

            <div className="space-y-4">
                {/* 1. おすすめ演習 */}
                <button 
                    onClick={handleRecommendedStart}
                    className={cn("w-full group relative overflow-hidden rounded-3xl p-6 text-left shadow-xl transition-all active:scale-[0.98] tap-target border-2", dueCount > 0 ? "bg-gradient-to-br from-green-600/20 to-emerald-900/20 border-green-500/50 shadow-green-900/20 hover:border-green-400" : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-blue-500/30")}
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className={cn("p-4 rounded-2xl backdrop-blur-sm shadow-inner", dueCount > 0 ? "bg-green-500/20 text-green-400" : "bg-blue-500/10 text-blue-400")}><AlarmClock size={32} /></div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-white">{dueCount > 0 ? "おすすめ復習" : "実力強化"}</h3>
                                    {dueCount > 0 && <span className="text-[10px] font-bold bg-green-500/20 px-2 py-0.5 rounded-full text-green-300 border border-green-500/30 animate-pulse">復習 {dueCount}問</span>}
                                </div>
                                <p className={cn("text-sm font-medium", dueCount > 0 ? "text-green-100 opacity-90" : "text-gray-400")}>
                                    {dueCount > 0 ? "忘却曲線に基づいた復習" : "レベルに合わせて問題を出題"}
                                </p>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/10 transition-colors shadow-lg"><ArrowRight className="text-white w-6 h-6" /></div>
                    </div>
                </button>

                {/* 2. AI無限演習 */}
                <button onClick={() => navigate('/quiz', { state: { mode: 'ai_custom_select' } })} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-left shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] tap-target border border-white/10">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner"><Sparkles size={28} className="text-white" /></div>
                            <div><h3 className="text-xl font-bold text-white mb-0.5">AI無限演習 <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white ml-1">Beta</span></h3><p className="text-orange-100 text-xs font-medium opacity-90">AIが新しい問題を生成</p></div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors"><ArrowRight className="text-white w-5 h-5" /></div>
                    </div>
                </button>

                {/* 3. ロールプレイ演習 */}
                <button onClick={() => navigate('/quiz', { state: { mode: 'role_play_select' } })} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-left shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] tap-target border border-white/10">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner"><Briefcase size={28} className="text-white" /></div>
                            <div><h3 className="text-xl font-bold text-white mb-0.5">ロールプレイ演習</h3><p className="text-indigo-100 text-xs font-medium opacity-90">実務的な役割になりきって学習</p></div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors"><ArrowRight className="text-white w-5 h-5" /></div>
                    </div>
                </button>

                {/* 4. 模擬試験 */}
                <button onClick={() => navigate('/quiz', { state: { mode: 'mock', start: true } })} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-left shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] tap-target border border-white/10">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner"><ClipboardList size={28} className="text-white" /></div>
                            <div><h3 className="text-xl font-bold text-white mb-0.5">模擬試験</h3><p className="text-teal-100 text-xs font-medium opacity-90">本番形式 / 制限時間90分</p></div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors"><ArrowRight className="text-white w-5 h-5" /></div>
                    </div>
                </button>
            </div>
        </div>
    );
}