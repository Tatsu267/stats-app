import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
    Activity, 
    Sigma, 
    TrendingDown, 
    Network, 
    BookOpen,
    Info
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, 
    AreaChart, Area
} from 'recharts';
import { db } from '../services/db';
import { getAttemptsWithQuestions } from '../utils/questionManager';
import { 
    calculateConfidenceInterval, 
    performChiSquareTest, 
    performRegressionAnalysis, 
    performBayesianEstimation 
} from '../utils/statsLab';

export default function Statistics() {
    const attemptsWithData = useLiveQuery(async () => {
        return await getAttemptsWithQuestions();
    }, []);

    if (!attemptsWithData || attemptsWithData.length < 5) {
        return (
            <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center animate-fade-in pb-28">
                <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                    <Sigma size={48} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">統計ラボへようこそ</h2>
                <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">
                    ここでは、あなたの学習データを「統計検定準1級」の知識を使って分析します。<br/>
                    精度を高めるため、まずは5問以上演習を行ってください。
                </p>
            </div>
        );
    }

    // 各種分析の実行
    const totalCount = attemptsWithData.length;
    const correctCount = attemptsWithData.filter(a => a.isCorrect).length;
    
    // 1. 区間推定
    const ci = calculateConfidenceInterval(correctCount, totalCount);
    
    // 2. 回帰分析
    const regression = performRegressionAnalysis(attemptsWithData);
    const regressionData = attemptsWithData.map((a, i) => ({
        index: i + 1,
        actual: a.timeTaken,
        fitted: regression ? (regression.slope * (i + 1) + regression.intercept) : 0
    }));

    // 3. ベイズ推定
    const bayes = performBayesianEstimation(attemptsWithData);
    // ベータ分布の確率密度関数を近似的に描画するためのデータ生成
    const betaData = [];
    if(bayes) {
        for(let x = 0; x <= 1; x += 0.02) {
            // Beta PDF (簡易計算: 正規化定数は無視して形状だけ見る)
            const y = Math.pow(x, bayes.alpha - 1) * Math.pow(1 - x, bayes.beta - 1);
            betaData.push({ x: x.toFixed(2), y });
        }
    }

    return (
        <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <Activity className="text-pink-500" />
                    統計ラボ
                </h1>
                <p className="text-xs text-gray-400">学習データを統計学で科学する</p>
            </header>

            <div className="grid gap-6">
                
                {/* 1. 区間推定カード */}
                <section className="card glass-card p-6 border border-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Sigma size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {ci.category}
                            </span>
                            <h3 className="text-lg font-bold text-white">真の実力（母比率）の推定</h3>
                        </div>
                        
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm text-gray-400">標本正答率</span>
                                <span className="text-xl font-bold text-white">{(ci.p * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full relative">
                                {/* 点推定 */}
                                <div className="absolute top-0 bottom-0 bg-blue-500 rounded-full w-1 h-2" style={{ left: `${ci.p * 100}%` }} />
                                {/* 区間推定 */}
                                <div className="absolute top-0.5 bottom-0.5 bg-blue-400/30 rounded-full h-1" 
                                     style={{ left: `${ci.lower * 100}%`, width: `${(ci.upper - ci.lower) * 100}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                                <span>{(ci.lower * 100).toFixed(1)}%</span>
                                <span>95% 信頼区間</span>
                                <span>{(ci.upper * 100).toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 leading-relaxed">
                            <div className="flex items-center gap-1.5 mb-1.5 text-blue-400 font-bold">
                                <Info size={14} /> 分析結果
                            </div>
                            {ci.description}
                        </div>
                    </div>
                </section>

                {/* 2. 回帰分析カード */}
                <section className="card glass-card p-6 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            {regression.category}
                        </span>
                        <h3 className="text-lg font-bold text-white">回答時間の推移（学習曲線）</h3>
                    </div>

                    <div className="h-48 w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={regressionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="index" stroke="#6B7280" fontSize={10} />
                                <YAxis stroke="#6B7280" fontSize={10} width={30} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', fontSize: '12px' }} 
                                />
                                <Line type="monotone" dataKey="actual" stroke="#60A5FA" strokeWidth={2} dot={{r:2}} name="実測値" />
                                <Line type="linear" dataKey="fitted" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" name="回帰直線" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 leading-relaxed">
                        <div className="flex items-center gap-1.5 mb-1.5 text-orange-400 font-bold">
                            <TrendingDown size={14} /> 分析結果
                        </div>
                        {regression.description}
                    </div>
                </section>

                {/* 3. ベイズ推定カード */}
                <section className="card glass-card p-6 border border-pink-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            {bayes.category}
                        </span>
                        <h3 className="text-lg font-bold text-white">正答率の事後分布</h3>
                    </div>

                    <div className="h-40 w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={betaData}>
                                <defs>
                                    <linearGradient id="colorBeta" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="x" stroke="#6B7280" fontSize={10} interval={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="y" stroke="#EC4899" fillOpacity={1} fill="url(#colorBeta)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 leading-relaxed">
                        <div className="flex items-center gap-1.5 mb-1.5 text-pink-400 font-bold">
                            <Network size={14} /> 分析結果
                        </div>
                        {bayes.description}
                    </div>
                </section>

            </div>
        </div>
    );
}