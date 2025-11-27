import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, BrainCircuit, ArrowRight, X, PlayCircle } from 'lucide-react';
import { db } from '../services/db';

export default function Dashboard() {
    const navigate = useNavigate();
    const [chartReady, setChartReady] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [showCategorySelect, setShowCategorySelect] = useState(false);

    const score = useLiveQuery(async () => {
        const latest = await db.scores.orderBy('timestamp').last();
        return latest ? latest.score : 40;
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setChartReady(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const skillData = [
        { subject: '確率分布', score: 60 },
        { subject: '推測統計', score: 50 },
        { subject: '多変量解析', score: 40 },
        { subject: '実験計画', score: 30 },
        { subject: 'ノンパラ', score: 40 },
        { subject: '線形モデル', score: 50 },
    ];

    const categories = [
        '確率分布', '推測統計', '多変量解析', '実験計画', 'ノンパラ', '線形モデル'
    ];

    const getScoreGrade = (score) => {
        if (score >= 90) return 'SS';
        if (score >= 80) return 'S';
        if (score >= 70) return 'A';
        if (score >= 60) return 'B';
        if (score >= 50) return 'C';
        return 'D';
    };

    const currentScore = score ?? 40;

    const handleRandomStart = () => {
        navigate('/quiz', { state: { mode: 'random', start: true } });
    };

    const handleCategorySelect = (category) => {
        navigate('/quiz', { state: { mode: 'category', category, start: true } });
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    学習ダッシュボード
                </h1>
                <p className="text-sm md:text-base text-gray-400">統計検定準1級の合格を目指して学習を進めましょう</p>
            </div>

            {/* Tabs with Sliding Indicator - More Compact */}
            <div className="flex p-1 bg-gray-800/50 backdrop-blur-sm rounded-xl mb-6 md:mb-8 w-full max-w-sm border border-gray-700/50 relative">
                <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r transition-all duration-300 ease-out shadow-md rounded-lg ${activeTab === 'analysis'
                            ? 'translate-x-[calc(100%+4px)] from-purple-600 to-purple-500'
                            : 'translate-x-1 from-blue-600 to-blue-500'
                        }`}
                />
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex-1 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-bold transition-colors duration-200 relative z-10 tap-target ${activeTab === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    ホーム
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-bold transition-colors duration-200 relative z-10 tap-target ${activeTab === 'analysis' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    分析
                </button>
            </div>

            {/* Home Tab Content */}
            {activeTab === 'home' && (
                <div className="animate-fade-in relative min-h-[300px]">
                    {!showCategorySelect ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Random Mode Card */}
                            <button
                                onClick={handleRandomStart}
                                className="card card-interactive group relative overflow-hidden bg-gradient-to-br from-blue-600/15 to-blue-900/15 p-6 md:p-8 border-2 border-blue-500/30 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 text-left min-h-[200px] tap-target"
                            >
                                {/* Background Icon - Reduced size */}
                                <div className="absolute -top-4 -right-4 opacity-[0.07] group-hover:scale-110 transition-transform duration-500">
                                    <BrainCircuit size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div>
                                        <div className="p-3 bg-blue-500 rounded-xl w-fit text-white mb-4 shadow-lg">
                                            <BrainCircuit size={28} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">ランダム出題</h2>
                                        <p className="text-blue-200/90 text-sm md:text-base leading-relaxed">
                                            全範囲からランダムに5問出題。<br className="hidden sm:inline" />
                                            実力を試すのに最適です。
                                        </p>
                                    </div>
                                    <div className="flex items-center text-blue-400 font-semibold text-sm md:text-base group-hover:translate-x-2 transition-transform">
                                        今すぐ開始 <ArrowRight className="ml-2" size={18} />
                                    </div>
                                </div>
                            </button>

                            {/* Category Mode Card */}
                            <button
                                onClick={() => setShowCategorySelect(true)}
                                className="card card-interactive group relative overflow-hidden bg-gradient-to-br from-purple-600/15 to-purple-900/15 p-6 md:p-8 border-2 border-purple-500/30 hover:border-purple-500 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 text-left min-h-[200px] tap-target"
                            >
                                {/* Background Icon - Reduced size */}
                                <div className="absolute -top-4 -right-4 opacity-[0.07] group-hover:scale-110 transition-transform duration-500">
                                    <BarChart3 size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div>
                                        <div className="p-3 bg-purple-500 rounded-xl w-fit text-white mb-4 shadow-lg">
                                            <BarChart3 size={28} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">分野別出題</h2>
                                        <p className="text-purple-200/90 text-sm md:text-base leading-relaxed">
                                            特定の分野に絞って学習。<br className="hidden sm:inline" />
                                            弱点を重点的に克服します。
                                        </p>
                                    </div>
                                    <div className="flex items-center text-purple-400 font-semibold text-sm md:text-base group-hover:translate-x-2 transition-transform">
                                        分野を選択 <ArrowRight className="ml-2" size={18} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        /* Category Selection View */
                        <div className="card glass-card p-6 md:p-8 animate-scale-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl md:text-2xl font-bold text-white">学習する分野を選択</h2>
                                <button
                                    onClick={() => setShowCategorySelect(false)}
                                    className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors tap-target"
                                    aria-label="閉じる"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategorySelect(cat)}
                                        className="p-4 md:p-5 bg-gray-800/70 hover:bg-purple-600/20 border border-gray-700 hover:border-purple-500 rounded-xl text-left transition-all active:scale-95 group tap-target"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                                <PlayCircle size={20} className="text-purple-400" />
                                            </div>
                                            <div>
                                                <span className="text-base md:text-lg font-bold text-gray-200 group-hover:text-white block">
                                                    {cat}
                                                </span>
                                                <span className="text-xs text-gray-500 group-hover:text-purple-300">
                                                    演習を開始
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Analysis Tab Content */}
            {activeTab === 'analysis' && (
                <div className="card glass-card p-6 md:p-8 shadow-xl animate-fade-in">
                    {/* Responsive layout for mobile/desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                        {/* Score Display */}
                        <div className="flex flex-col items-center justify-center p-4">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <TrendingUp size={20} />
                                </div>
                                <h2 className="text-lg md:text-xl font-bold text-gray-200">現在のスコア</h2>
                            </div>

                            {/* Score Circle */}
                            <div className="relative flex items-center justify-center mb-4" style={{ width: '200px', height: '200px' }}>
                                <svg
                                    width="200"
                                    height="200"
                                    viewBox="0 0 200 200"
                                    className="absolute"
                                    style={{ transform: 'rotate(-90deg)' }}
                                >
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="85"
                                        fill="none"
                                        stroke="#374151"
                                        strokeWidth="16"
                                    />
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="85"
                                        fill="none"
                                        stroke="url(#scoreGradient)"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 85}
                                        strokeDashoffset={(2 * Math.PI * 85) - (currentScore / 100) * (2 * Math.PI * 85)}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3B82F6" />
                                            <stop offset="100%" stopColor="#A855F7" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                <div className="absolute flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                                            {currentScore}
                                        </div>
                                        <div className="text-sm md:text-base text-gray-400 font-medium mt-1">
                                            Grade <span className="text-blue-400 font-bold">{getScoreGrade(currentScore)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="flex flex-col items-center justify-center w-full p-4 lg:border-l border-gray-700/50">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                    <BarChart3 size={20} />
                                </div>
                                <h2 className="text-lg md:text-xl font-bold text-gray-200">分野別スキル分析</h2>
                            </div>

                            <div className="w-full" style={{ minHeight: '300px', maxWidth: '500px' }}>
                                {chartReady ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RadarChart
                                            cx="50%"
                                            cy="50%"
                                            outerRadius="70%"
                                            data={skillData}
                                        >
                                            <PolarGrid stroke="#374151" strokeWidth={1} />
                                            <PolarAngleAxis
                                                dataKey="subject"
                                                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                                            />
                                            <PolarRadiusAxis
                                                angle={30}
                                                domain={[0, 100]}
                                                tick={{ fill: '#6B7280', fontSize: 10 }}
                                                axisLine={false}
                                            />
                                            <Radar
                                                name="スコア"
                                                dataKey="score"
                                                stroke="#8B5CF6"
                                                strokeWidth={2.5}
                                                fill="#8B5CF6"
                                                fillOpacity={0.5}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1F2937',
                                                    border: '1px solid #374151',
                                                    borderRadius: '12px',
                                                    color: '#F9FAFB',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                                }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <div className="text-gray-500 animate-pulse">読み込み中...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}