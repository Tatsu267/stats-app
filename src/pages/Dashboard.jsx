import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Settings, Flame, Zap, Target,
    Sparkles, ClipboardList, Swords, AlarmClock, ArrowRight, X, Activity,
    ChevronDown, ChevronUp, Calendar, GraduationCap, BookOpen
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    db, getTargetScore, getDueReviewQuestionIds, getUserLevel, getUserExp,
    getExamDate, recordDailyLaunch, getLaunchStreak, getAttempts,
    getTutorMemory, getTutorDailyMessage, saveTutorDailyMessage
} from '../services/db';
import { generateTutorDailyMessage } from '../services/ai';
import { getNextLevelExp } from '../utils/leveling';
import { cn } from '../utils/cn';
import ContributionGraph from '../components/dashboard/ContributionGraph';

const getLevelColor = (level) => {
    if (level >= 50) return "from-purple-500 to-indigo-600";
    if (level >= 30) return "from-red-500 to-rose-600";
    if (level >= 20) return "from-yellow-400 to-orange-500";
    if (level >= 10) return "from-blue-400 to-cyan-500";
    return "from-amber-400 to-orange-500";
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null);
    const [showOtherModes, setShowOtherModes] = useState(false);
    const [examDaysLeft, setExamDaysLeft] = useState(null);
    const [dailyGoal, setDailyGoal] = useState(null);
    const [launchStreak, setLaunchStreak] = useState(0);
    const [tutorMessage, setTutorMessage] = useState(null);

    const userStatus = useLiveQuery(async () => {
        const level = await getUserLevel();
        const exp = await getUserExp();
        return { level, exp };
    }, [], { level: 1, exp: 0 });

    const score = useLiveQuery(async () => {
        const latest = await db.scores.orderBy('timestamp').last();
        return latest ? latest.score : 40;
    }, []);

    const scoreHistory = useLiveQuery(async () => {
        const scores = await db.scores.orderBy('timestamp').toArray();
        if (!scores || scores.length === 0) return [];
        const dailyMaxMap = {};
        scores.forEach(s => {
            const date = new Date(s.timestamp);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!dailyMaxMap[key] || s.score > dailyMaxMap[key]) dailyMaxMap[key] = s.score;
        });
        return Object.keys(dailyMaxMap).sort().map((key, i) => {
            const [, m, d] = key.split('-');
            return { index: i + 1, score: dailyMaxMap[key], date: `${parseInt(m)}/${parseInt(d)}`, fullDate: key };
        });
    }, []);

    const dueReviewIds = useLiveQuery(async () => getDueReviewQuestionIds(), []);
    const dueCount = dueReviewIds?.length || 0;
    const targetScoreVal = useLiveQuery(async () => getTargetScore(), [], 80);
    const currentScore = score ?? 40;
    const nextLevelExp = getNextLevelExp(userStatus.level);
    const expPercent = Math.min(100, Math.round((userStatus.exp / nextLevelExp) * 100));
    const levelBgClass = getLevelColor(userStatus.level);

    useEffect(() => {
        const init = async () => {
            const streak = await recordDailyLaunch();
            setLaunchStreak(streak);

            const examDate = await getExamDate();
            if (examDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const exam = new Date(examDate);
                exam.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
                if (daysLeft >= 0) {
                    setExamDaysLeft(daysLeft);
                    if (daysLeft > 0) setDailyGoal(Math.ceil(500 / daysLeft));
                }
            }
        };
        init();

        (async () => {
            const cached = await getTutorDailyMessage();
            if (cached) { setTutorMessage(cached); return; }
            try {
                const [mem, attempts, streak] = await Promise.all([
                    getTutorMemory(), getAttempts(), getLaunchStreak()
                ]);
                const total = attempts.length;
                const correct = attempts.filter((a) => a.isCorrect).length;
                const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
                const msg = await generateTutorDailyMessage({
                    tutorMemory: mem, totalAttempts: total, accuracy, launchStreak: streak
                });
                await saveTutorDailyMessage(msg);
                setTutorMessage(msg);
            } catch (_) { /* API key not set or network error — silent */ }
        })();
    }, []);

    const handleMainAction = () => {
        if (dueCount > 0) {
            navigate('/quiz', { state: { mode: 'srs_review', start: true } });
        } else {
            navigate('/quiz', { state: { mode: 'ai_rank_match', start: true } });
        }
    };

    return (
        <div className="min-h-screen pb-32 px-4 pt-6 md:pt-10 max-w-3xl mx-auto animate-fade-in relative">
            {/* Header */}
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-xs font-bold tracking-widest mb-1">DASHBOARD</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        StatsGrade<span className="text-brand-primary">1</span>
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-gray-700"
                >
                    <Settings size={24} />
                </button>
            </header>

            {/* 試験日カウントダウン */}
            {examDaysLeft !== null ? (
                <div className="mb-5 px-4 py-3 rounded-2xl bg-gray-800/60 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Calendar size={16} className="text-blue-400 shrink-0" />
                        <span className="text-sm font-bold">
                            {examDaysLeft === 0
                                ? '試験は今日です！'
                                : <>試験まであと <span className="text-white text-lg">{examDaysLeft}</span> 日</>
                            }
                        </span>
                    </div>
                    {dailyGoal && (
                        <span className="text-xs text-gray-400 font-medium shrink-0">
                            今日の目標: <span className="text-amber-400 font-bold">{dailyGoal}問</span>
                        </span>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => navigate('/settings')}
                    className="mb-5 w-full px-4 py-3 rounded-2xl bg-gray-800/40 border border-dashed border-gray-700 text-gray-500 text-sm hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                    <Calendar size={16} />
                    試験日を設定してカウントダウンを表示
                </button>
            )}

            {/* 家庭教師からのひとこと */}
            {tutorMessage && (
                <button
                    onClick={() => navigate('/tutor')}
                    className="w-full mb-4 px-4 py-3 rounded-2xl bg-indigo-900/30 border border-indigo-500/30 text-left hover:bg-indigo-900/50 hover:border-indigo-400/50 transition-all group"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0 mt-0.5">
                            <GraduationCap className="text-indigo-400" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-indigo-300 mb-1">今日のひとこと</p>
                            <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{tutorMessage}</p>
                        </div>
                        <ArrowRight className="text-indigo-400/50 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" size={16} />
                    </div>
                </button>
            )}

            {/* メインCTAボタン */}
            <button
                onClick={handleMainAction}
                className={cn(
                    "w-full relative overflow-hidden rounded-3xl p-7 text-left shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group border mb-4",
                    dueCount > 0
                        ? "bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-500/50 shadow-emerald-900/20"
                        : "bg-gradient-to-br from-orange-600 to-red-700 border-orange-500/50 shadow-orange-900/20"
                )}
            >
                <div className="relative z-10 flex items-center gap-5">
                    <div className={cn(
                        "p-4 rounded-2xl backdrop-blur-md shadow-inner text-white shrink-0",
                        dueCount > 0 ? "bg-emerald-500/20 ring-1 ring-emerald-400/30" : "bg-white/20 ring-1 ring-white/30"
                    )}>
                        {dueCount > 0 ? <AlarmClock size={36} /> : <Swords size={36} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="text-2xl md:text-3xl font-bold text-white whitespace-nowrap">
                                {dueCount > 0 ? "スマート復習" : "今すぐ始める"}
                            </h3>
                            {dueCount > 0 && (
                                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-full animate-pulse">
                                    {dueCount}問 Due
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-100/80">
                            {dueCount > 0
                                ? "忘却曲線に基づく最適タイミングの復習"
                                : "ランクマッチで効率よく実力を伸ばす"
                            }
                        </p>
                    </div>
                    <ArrowRight
                        className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0"
                        size={24}
                    />
                </div>
                <div className={cn(
                    "absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none",
                    dueCount > 0 ? "bg-emerald-500" : "bg-orange-500"
                )} />
            </button>

            {/* その他の練習（折りたたみ） */}
            <div className="mb-6">
                <button
                    onClick={() => setShowOtherModes(v => !v)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs font-bold tracking-wider transition-colors w-full py-2 px-1"
                >
                    {showOtherModes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    その他の練習
                </button>

                {showOtherModes && (
                    <div className="grid grid-cols-2 gap-3 mt-3 animate-fade-in">
                        <button
                            onClick={() => navigate('/quiz', { state: { mode: 'ai_custom_select' } })}
                            className="glass-card p-4 hover:bg-gray-800/80 transition-all hover:-translate-y-0.5 duration-200 group text-left border border-white/5 hover:border-amber-500/30 relative overflow-hidden rounded-2xl"
                        >
                            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 w-fit mb-3 group-hover:scale-110 transition-transform">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-white mb-0.5">AI無限演習</h3>
                            <p className="text-xs text-gray-400">分野を選んでAI生成問題を練習</p>
                        </button>

                        <button
                            onClick={() => navigate('/quiz', { state: { mode: 'mock', start: true } })}
                            className="glass-card p-4 hover:bg-gray-800/80 transition-all hover:-translate-y-0.5 duration-200 group text-left border border-white/5 hover:border-teal-500/30 relative overflow-hidden rounded-2xl"
                        >
                            <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                                <ClipboardList size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-white mb-0.5">模擬試験</h3>
                            <p className="text-xs text-gray-400">本番形式で実力測定</p>
                        </button>

                        <button
                            onClick={() => navigate('/quiz', { state: { mode: 'foundation', start: true } })}
                            className="glass-card p-4 hover:bg-gray-800/80 transition-all hover:-translate-y-0.5 duration-200 group text-left border border-white/5 hover:border-blue-500/30 relative overflow-hidden rounded-2xl col-span-2"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-0.5">土台補修</h3>
                                    <p className="text-xs text-gray-400">期待値・行列・正規分布など数学の基礎を固定問題で復習</p>
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* ステータス（小さく、脇役） */}
            <div className="card glass-card p-4 bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-white/5">
                <div className="flex items-center gap-4 mb-4">
                    <div className={cn(
                        "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
                        levelBgClass
                    )}>
                        <span className="text-lg font-black text-white">{userStatus.level}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-sm font-bold text-gray-300">Level {userStatus.level}</span>
                            <span className="text-xs text-gray-500 font-mono">{userStatus.exp} / {nextLevelExp} XP</span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full bg-gradient-to-r transition-all duration-1000", levelBgClass)}
                                style={{ width: `${expPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setActiveModal('streak')}
                        className="bg-gray-800 hover:bg-gray-700 transition-all rounded-xl p-2.5 text-center border border-gray-700 active:scale-95"
                    >
                        <div className="flex justify-center text-orange-400 mb-1"><Flame size={16} /></div>
                        <span className="text-base font-bold text-white">{launchStreak}</span>
                        <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">連続起動</p>
                    </button>
                    <button
                        onClick={() => setActiveModal('score')}
                        className="bg-gray-800 hover:bg-gray-700 transition-all rounded-xl p-2.5 text-center border border-gray-700 active:scale-95"
                    >
                        <div className="flex justify-center text-yellow-400 mb-1"><Zap size={16} /></div>
                        <span className="text-base font-bold text-white">{currentScore}</span>
                        <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">Score</p>
                    </button>
                    <div className="bg-gray-800/30 rounded-xl p-2.5 text-center border border-white/5">
                        <div className="flex justify-center text-emerald-400 mb-1"><Target size={16} /></div>
                        <span className="text-base font-bold text-gray-300">
                            {Math.min(100, Math.round((currentScore / targetScoreVal) * 100))}%
                        </span>
                        <p className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">Goal</p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'streak' && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                    <div className="card p-6 w-full max-w-lg relative z-10 border border-white/10 bg-gray-900 shadow-2xl rounded-2xl">
                        <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><Flame size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Study Activity</h3>
                                <p className="text-sm text-gray-400">連続起動 {launchStreak} 日</p>
                            </div>
                        </div>
                        <ContributionGraph />
                    </div>
                </div>
            )}

            {activeModal === 'score' && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                    <div className="card p-6 w-full max-w-lg relative z-10 border border-white/10 bg-gray-900 shadow-2xl rounded-2xl">
                        <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Activity size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Best Score History</h3>
                                <p className="text-sm text-gray-400">日別の最高スコアの推移</p>
                            </div>
                        </div>
                        <div className="w-full h-64">
                            {scoreHistory && scoreHistory.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={scoreHistory}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                        <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={30} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', fontSize: '12px', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#60A5FA' }}
                                            formatter={(v) => [`${v} 点`, 'Best Score']}
                                            labelStyle={{ color: '#9CA3AF', marginBottom: '0.25rem' }}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                                    <Activity size={32} className="mb-2 opacity-50" />
                                    <p className="text-xs text-center">データが不足しています。<br />さらに演習を行いましょう。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
