import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
    Settings, Flame, Zap, Target, 
    Sparkles, Briefcase, ClipboardList, Swords, AlarmClock, Crown, ArrowRight, X, Activity
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { db, getTargetScore, getDueReviewQuestionIds, getUserLevel, getUserExp } from '../services/db';
import { getNextLevelExp } from '../utils/leveling';
import { cn } from '../utils/cn';
import ContributionGraph from '../components/dashboard/ContributionGraph';

// レベルに応じたテーマカラー
const getLevelColor = (level) => {
    if (level >= 50) return "from-purple-500 to-indigo-600";
    if (level >= 30) return "from-red-500 to-rose-600";
    if (level >= 20) return "from-yellow-400 to-orange-500";
    if (level >= 10) return "from-blue-400 to-cyan-500";
    return "from-amber-400 to-orange-500";
};

export default function Dashboard() {
    const navigate = useNavigate();
    
    // モーダル管理用State: 'streak' | 'score' | null
    const [activeModal, setActiveModal] = useState(null);

    // ユーザーデータ取得
    const userStatus = useLiveQuery(async () => {
        const level = await getUserLevel();
        const exp = await getUserExp();
        return { level, exp };
    }, [], { level: 1, exp: 0 });

    const score = useLiveQuery(async () => {
        const latest = await db.scores.orderBy('timestamp').last();
        return latest ? latest.score : 40;
    }, []);

    // スコア履歴の取得ロジック
    const scoreHistory = useLiveQuery(async () => {
        const scores = await db.scores.orderBy('timestamp').toArray();
        
        if (!scores || scores.length === 0) return [];

        const dailyMaxMap = {};
        scores.forEach(s => {
            const date = new Date(s.timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;

            if (!dailyMaxMap[key] || s.score > dailyMaxMap[key]) {
                dailyMaxMap[key] = s.score;
            }
        });

        const sortedKeys = Object.keys(dailyMaxMap).sort();

        return sortedKeys.map((key, i) => {
            const [year, month, day] = key.split('-');
            const displayDate = `${parseInt(month, 10)}/${parseInt(day, 10)}`;
            
            return {
                index: i + 1,
                score: dailyMaxMap[key],
                date: displayDate,
                fullDate: key
            };
        });
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

    const nextLevelExp = getNextLevelExp(userStatus.level);
    const expPercent = Math.min(100, Math.round((userStatus.exp / nextLevelExp) * 100));
    const levelBgClass = getLevelColor(userStatus.level);

    const handleMainAction = () => {
        if (dueCount > 0) {
            navigate('/quiz', { state: { mode: 'srs_review', start: true } });
        } else {
            navigate('/quiz', { state: { mode: 'ai_rank_match', start: true } });
        }
    };

    return (
        <div className="min-h-screen pb-32 px-4 pt-6 md:pt-10 max-w-5xl mx-auto animate-fade-in relative">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-xs font-bold tracking-widest mb-1">DASHBOARD</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        StatsGrade<span className="text-brand-primary">1</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/settings')} className="p-2.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-gray-700">
                    <Settings size={24} />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* Left Column: Status */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                    <div className="card glass-card p-5 relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Crown size={120} className="text-white" />
                        </div>
                        
                        {/* Level Section */}
                        <div className="flex items-center gap-5 mb-6 relative z-10">
                            <div className={cn(
                                "w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg border-4 border-gray-800 shrink-0",
                                levelBgClass
                            )}>
                                <span className="text-2xl md:text-3xl font-black text-white">{userStatus.level}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm md:text-base font-bold text-gray-200">Level {userStatus.level}</span>
                                    <span className="text-xs text-gray-400 font-mono">{userStatus.exp} / {nextLevelExp} XP</span>
                                </div>
                                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600/50">
                                    <div 
                                        className={cn("h-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]", levelBgClass)}
                                        style={{ width: `${expPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 relative z-10">
                            
                            {/* Streak Button */}
                            <button 
                                onClick={() => setActiveModal('streak')}
                                className="bg-gray-800 hover:bg-gray-700 transition-all duration-200 rounded-xl p-3 text-center border border-gray-700 shadow-md active:scale-95 group relative overflow-hidden"
                            >
                                <div className="flex justify-center text-orange-400 mb-1 group-hover:scale-110 transition-transform duration-300"><Flame size={20} /></div>
                                <span className="text-lg md:text-xl font-bold text-white leading-none">{streak ?? 0}</span>
                                <p className="text-[10px] text-gray-400 uppercase mt-1 font-bold group-hover:text-white transition-colors">Streak</p>
                            </button>

                            {/* Score Button */}
                            <button 
                                onClick={() => setActiveModal('score')}
                                className="bg-gray-800 hover:bg-gray-700 transition-all duration-200 rounded-xl p-3 text-center border border-gray-700 shadow-md active:scale-95 group relative overflow-hidden"
                            >
                                <div className="flex justify-center text-yellow-400 mb-1 group-hover:scale-110 transition-transform duration-300"><Zap size={20} /></div>
                                <span className="text-lg md:text-xl font-bold text-white leading-none">{currentScore}</span>
                                <p className="text-[10px] text-gray-400 uppercase mt-1 font-bold group-hover:text-white transition-colors">Score</p>
                            </button>

                            {/* Goal (Static) */}
                            <div className="bg-gray-800/30 rounded-xl p-3 text-center border border-white/5 cursor-default">
                                <div className="flex justify-center text-emerald-400 mb-1"><Target size={20} /></div>
                                <span className="text-lg md:text-xl font-bold text-gray-300 leading-none">{progressPercent}%</span>
                                <p className="text-[10px] text-gray-500 uppercase mt-1 font-bold">Goal</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 md:gap-8">
                    {/* Primary Action */}
                    <section>
                        <h2 className="text-xs font-bold text-gray-500 mb-3 px-1 tracking-wider">RECOMMENDED</h2>
                        <button 
                            onClick={handleMainAction}
                            className={cn(
                                "w-full relative overflow-hidden rounded-3xl p-6 md:p-8 text-left shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group border",
                                dueCount > 0 
                                    ? "bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-500/50 shadow-emerald-900/20" 
                                    : "bg-gradient-to-br from-orange-600 to-red-700 border-orange-500/50 shadow-orange-900/20"
                            )}
                        >
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                                <div className={cn(
                                    "p-4 md:p-5 rounded-2xl backdrop-blur-md shadow-inner text-white w-fit",
                                    dueCount > 0 ? "bg-emerald-500/20 ring-1 ring-emerald-400/30" : "bg-white/20 ring-1 ring-white/30"
                                )}>
                                    {dueCount > 0 ? <AlarmClock size={40} /> : <Swords size={40} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                            {dueCount > 0 ? "スマート復習" : "ランクマッチ"}
                                        </h3>
                                        {dueCount > 0 ? (
                                            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-full animate-pulse">
                                                {dueCount}問 Due
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-white/20 border border-white/30 text-white text-xs font-bold rounded-full">
                                                XP獲得
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm md:text-base text-gray-100/90 leading-relaxed max-w-xl">
                                        {dueCount > 0 
                                            ? "忘却曲線に基づき、記憶定着に最適なタイミングで復習します。" 
                                            : "現在のレベルに合わせた難易度の問題で、効率よく実力を伸ばしましょう。"
                                        }
                                    </p>
                                </div>
                                <div className="hidden md:flex w-12 h-12 rounded-full bg-white/10 items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <ArrowRight className="text-white" />
                                </div>
                            </div>
                            <div className={cn(
                                "absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none",
                                dueCount > 0 ? "bg-emerald-500" : "bg-orange-500"
                            )} />
                        </button>
                    </section>

                    {/* Secondary Actions */}
                    <section>
                        <h2 className="text-xs font-bold text-gray-500 mb-3 px-1 tracking-wider">EXPLORE</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => navigate('/quiz', { state: { mode: 'ai_custom_select' } })}
                                className="glass-card p-5 hover:bg-gray-800/80 transition-all hover:-translate-y-1 duration-200 group text-left border border-white/5 hover:border-amber-500/30 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 blur-2xl -mr-10 -mt-10 rounded-full group-hover:bg-amber-500/20 transition-colors"></div>
                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 w-fit mb-4 group-hover:scale-110 transition-transform">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2 whitespace-nowrap">
                                    AI無限演習 <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-normal">Beta</span>
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    苦手分野をAIが生成。<br/>納得いくまでトレーニング。
                                </p>
                            </button>

                            <button 
                                onClick={() => navigate('/quiz', { state: { mode: 'role_play_select' } })}
                                className="glass-card p-5 hover:bg-gray-800/80 transition-all hover:-translate-y-1 duration-200 group text-left border border-white/5 hover:border-purple-500/30 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-2xl -mr-10 -mt-10 rounded-full group-hover:bg-purple-500/20 transition-colors"></div>
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                                    <Briefcase size={24} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1 whitespace-nowrap">ロールプレイ</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    データサイエンティスト等の<br/>実務シナリオで学ぶ。
                                </p>
                            </button>

                            <button 
                                onClick={() => navigate('/quiz', { state: { mode: 'mock', start: true } })}
                                className="glass-card p-5 hover:bg-gray-800/80 transition-all hover:-translate-y-1 duration-200 group text-left border border-white/5 hover:border-teal-500/30 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 blur-2xl -mr-10 -mt-10 rounded-full group-hover:bg-teal-500/20 transition-colors"></div>
                                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 w-fit mb-4 group-hover:scale-110 transition-transform">
                                    <ClipboardList size={24} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1 whitespace-nowrap">模擬試験</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    本番形式の90分。<br/>実力を正確に測定。
                                </p>
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* --- Modals --- */}

            {/* 1. Streak Modal (Contribution Graph) */}
            {activeModal === 'streak' && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)} />
                    <div className="card p-6 w-full max-w-lg relative z-10 border border-white/10 bg-gray-900 shadow-2xl rounded-2xl">
                        <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><Flame size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Study Activity</h3>
                                <p className="text-sm text-gray-400">継続は力なり。毎日の学習記録です。</p>
                            </div>
                        </div>
                        <ContributionGraph />
                    </div>
                </div>
            )}

            {/* 2. Score Modal (Score History Chart) */}
            {activeModal === 'score' && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)} />
                    <div className="card p-6 w-full max-w-lg relative z-10 border border-white/10 bg-gray-900 shadow-2xl rounded-2xl">
                        <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Activity size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Best Score History</h3>
                                <p className="text-sm text-gray-400">日別の最高スコアの推移です。</p>
                            </div>
                        </div>
                        
                        <div className="w-full h-64">
                            {scoreHistory && scoreHistory.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={scoreHistory}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#9CA3AF" 
                                            fontSize={10} 
                                            tickLine={false}
                                            axisLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis 
                                            stroke="#9CA3AF" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            domain={[0, 100]} 
                                            width={30}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', fontSize: '12px', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#60A5FA' }}
                                            formatter={(value) => [`${value} 点`, 'Best Score']}
                                            labelStyle={{ color: '#9CA3AF', marginBottom: '0.25rem' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="score" 
                                            stroke="#3b82f6" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorScore)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                                    <Activity size={32} className="mb-2 opacity-50" />
                                    <p className="text-xs">データが不足しています。<br/>さらに演習を行いましょう。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}