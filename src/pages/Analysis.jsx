import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Trophy, CalendarDays, Timer, BookOpen, AlertTriangle, Medal, Lock } from 'lucide-react';
import { db, getUnlockedBadges } from '../services/db';
import SkillRadarChart from '../components/dashboard/SkillRadarChart';
import { CATEGORY_CONFIG, CATEGORY_NAMES } from '../utils/categories';
import { getAttemptsWithQuestions } from '../utils/questionManager';
import { BADGES } from '../utils/badges';
import { cn } from '../utils/cn';

export default function Analysis() {
    const attempts = useLiveQuery(() => db.attempts.toArray(), []);
    
    // 獲得済みバッジの取得
    const unlockedBadges = useLiveQuery(async () => {
        const badges = await getUnlockedBadges();
        return new Set(badges.map(b => b.badgeId));
    }, []);

    const analysisData = useLiveQuery(async () => {
        const attemptsWithQ = await getAttemptsWithQuestions();
        if (!attemptsWithQ || attemptsWithQ.length === 0) return null;

        const categoryStats = {};
        CATEGORY_NAMES.forEach(cat => {
            categoryStats[cat] = { correct: 0, total: 0, totalTime: 0, name: cat };
        });

        let totalStudyTimeSec = 0;

        attemptsWithQ.forEach((attempt) => {
            const question = attempt.question;
            if (!question) return;

            totalStudyTimeSec += attempt.timeTaken;
            
            if (categoryStats[question.category]) {
                categoryStats[question.category].total++;
                categoryStats[question.category].totalTime += attempt.timeTaken;
                if (attempt.isCorrect) {
                    categoryStats[question.category].correct++;
                }
            }
        });

        const statsArray = Object.values(categoryStats).map(stat => ({
            ...stat,
            accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
            avgTime: stat.total > 0 ? Math.round(stat.totalTime / stat.total) : 0
        }));

        const activeStats = statsArray.filter(s => s.total > 0);
        const sortedByAccuracy = [...activeStats].sort((a, b) => b.accuracy - a.accuracy);
        
        const totalMinutes = Math.floor(totalStudyTimeSec / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        return {
            allStats: statsArray,
            best: sortedByAccuracy.slice(0, 4), 
            worst: sortedByAccuracy.slice(-4).reverse(),
            totalTimeStr: totalHours > 0 ? `${totalHours}時間 ${remainingMinutes}分` : `${totalMinutes}分`,
            totalCount: attemptsWithQ.length
        };
    }, []);

    const weeklyData = React.useMemo(() => {
        if (!attempts) return [];
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        return last7Days.map(date => {
            const dateStr = date.toLocaleDateString();
            const count = attempts.filter(a => 
                new Date(a.timestamp).toLocaleDateString() === dateStr
            ).length;
            
            return {
                day: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
                count: count
            };
        });
    }, [attempts]);

    const radarData = analysisData?.allStats.map(stat => ({
        subject: stat.name,
        A: stat.accuracy,
        fullMark: 100
    }));

    if (!analysisData) {
        return (
            <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center animate-fade-in">
                <p className="text-gray-400 mb-4">データがありません。<br/>まずは演習を行いましょう。</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 px-4 pt-6 max-w-5xl mx-auto animate-fade-in">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">学習分析</h1>
                <p className="text-xs text-gray-400">パフォーマンスの詳細レポート</p>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="card glass-card p-4 bg-gray-800/60 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <Timer size={16} className="text-green-400" />
                        <span className="text-xs font-bold">総学習時間</span>
                    </div>
                    <p className="text-xl font-bold text-white">{analysisData?.totalTimeStr}</p>
                </div>
                <div className="card glass-card p-4 bg-gray-800/60 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="text-xs font-bold">総解答数</span>
                    </div>
                    <p className="text-xl font-bold text-white">{analysisData?.totalCount} <span className="text-sm text-gray-500 font-normal">問</span></p>
                </div>
            </div>

            <section className="card glass-card p-6 mb-8 border border-gray-700/30 overflow-hidden bg-[#0F172A]">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-purple-400" />
                    分野別スキル分析
                </h2>
                <div className="w-full h-[260px] flex justify-center items-center">
                    <SkillRadarChart data={radarData} />
                </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="card bg-red-900/10 border border-red-500/20 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-red-400"><AlertTriangle size={18} /><h3 className="text-sm font-bold">苦手分野 (Worst 4)</h3></div>
                    <div className="space-y-3">
                        {analysisData?.worst.length > 0 ? analysisData.worst.map(stat => (
                            <div key={stat.name} className="flex justify-between items-center">
                                <span className="text-xs text-gray-300 truncate max-w-[100px]">{stat.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${stat.accuracy}%` }} /></div>
                                    <span className="text-xs font-bold text-red-400 w-8 text-right">{stat.accuracy}%</span>
                                </div>
                            </div>
                        )) : <p className="text-xs text-gray-500 text-center py-2">データ不足です</p>}
                    </div>
                </div>
                <div className="card bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-blue-400"><Trophy size={18} /><h3 className="text-sm font-bold">得意分野 (Top 4)</h3></div>
                    <div className="space-y-3">
                        {analysisData?.best.length > 0 ? analysisData.best.map(stat => (
                            <div key={stat.name} className="flex justify-between items-center">
                                <span className="text-xs text-gray-300 truncate max-w-[100px]">{stat.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${stat.accuracy}%` }} /></div>
                                    <span className="text-xs font-bold text-blue-400 w-8 text-right">{stat.accuracy}%</span>
                                </div>
                            </div>
                        )) : <p className="text-xs text-gray-500 text-center py-2">データ不足です</p>}
                    </div>
                </div>
            </div>

            <section className="card glass-card p-6 mb-8 border border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarDays size={18} className="text-blue-400" />週間学習量</h3>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">過去7日間の解答数</span>
                </div>
                <div className="w-full h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                            <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(value) => [`${value} 問`, '解答数']} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {weeklyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3b82f6' : '#334155'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* バッジコレクション (New Section) */}
            <section className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Medal size={20} className="text-yellow-400" /> 獲得した称号 (Badges)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BADGES.map(badge => {
                        const isUnlocked = unlockedBadges?.has(badge.id);
                        return (
                            <div 
                                key={badge.id}
                                className={cn(
                                    "card p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-300",
                                    isUnlocked 
                                        ? "bg-gray-800/40 border-gray-700 hover:border-yellow-500/50" 
                                        : "bg-gray-900/40 border-gray-800 opacity-60 grayscale"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-full mb-3",
                                    isUnlocked ? badge.bg + " " + badge.color : "bg-gray-800 text-gray-600"
                                )}>
                                    {isUnlocked ? <badge.icon size={24} /> : <Lock size={24} />}
                                </div>
                                <h4 className={cn("text-sm font-bold mb-1", isUnlocked ? "text-white" : "text-gray-500")}>
                                    {badge.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    {badge.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BookOpen size={20} className="text-gray-400" />分野別学習ガイド</h3>
                <div className="grid gap-3">
                    {CATEGORY_NAMES.map(cat => (
                        <div key={cat} className={`card p-4 rounded-xl border border-l-4 ${CATEGORY_CONFIG[cat].border.replace('/30', '/50')} bg-gray-800/40`} style={{ borderLeftColor: 'currentColor' }}>
                            <h4 className={`text-sm font-bold mb-1 ${CATEGORY_CONFIG[cat].color}`}>{cat}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{CATEGORY_CONFIG[cat].description}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}