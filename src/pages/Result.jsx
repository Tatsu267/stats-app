import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle, XCircle, Clock, BrainCircuit, Loader2, Home, ArrowRight, ChevronRight, Trophy } from 'lucide-react';
import { generateSessionFeedback } from '../services/ai';
import { getUserLevel, getUserExp } from '../services/db';
import { getNextLevelExp } from '../utils/leveling';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '../utils/cn';

export default function Result() {
    const location = useLocation();
    const navigate = useNavigate();
    // ▼▼▼ 受け取るstateにtotalExpを追加 ▼▼▼
    const { sessionData, totalExp = 0 } = location.state || { sessionData: [] };
    const [feedback, setFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const userStatus = useLiveQuery(async () => {
        const level = await getUserLevel();
        const exp = await getUserExp();
        return { level, exp };
    }, [], { level: 1, exp: 0 });

    const correctCount = sessionData.filter(d => d.isCorrect).length;
    const totalCount = sessionData.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const totalTime = sessionData.reduce((acc, curr) => acc + curr.timeTaken, 0);
    const avgTime = totalCount > 0 ? Math.round(totalTime / totalCount) : 0;

    const nextLevelExp = getNextLevelExp(userStatus.level);
    const expPercent = Math.min(100, Math.round((userStatus.exp / nextLevelExp) * 100));

    useEffect(() => {
        const fetchFeedback = async () => {
            if (totalCount === 0) {
                setIsLoading(false);
                return;
            }
            try {
                const text = await generateSessionFeedback(sessionData);
                // ▼▼▼ 修正: __ を ** に置換 ▼▼▼
                const cleanText = text?.replace(/__(.*?)__/g, '**$1**');
                setFeedback(cleanText);
            } catch (error) {
                setFeedback("AI分析中にエラーが発生しました: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFeedback();
    }, [sessionData]);

    const markdownComponents = {
        p: ({node, children}) => <p className="mb-4 leading-relaxed text-gray-200">{children}</p>,
        strong: ({node, ...props}) => (
            <strong className="font-bold text-amber-300 bg-amber-500/10 px-1 rounded mx-0.5 border-b border-amber-500/30" {...props} />
        ),
        ul: ({node, ...props}) => (
            <ul className="my-4 pl-4 border-l-2 border-gray-600/50 space-y-2" {...props} />
        ),
        li: ({node, children, ...props}) => (
            <li className="pl-2 py-1 text-sm md:text-base leading-relaxed relative group" {...props}>
                <span className="absolute -left-[21px] top-2.5 w-1.5 h-1.5 rounded-full bg-blue-400/60 group-hover:bg-blue-400 transition-colors"></span>
                <div className="text-gray-300">{children}</div>
            </li>
        ),
        h1: ({node, children}) => <h3 className="text-xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">{children}</h3>,
        h2: ({node, children}) => <h3 className="text-lg font-bold text-blue-300 mt-5 mb-2 flex items-center gap-2"><ChevronRight size={18} />{children}</h3>,
        h3: ({node, children}) => <h4 className="text-base font-bold text-gray-200 mt-4 mb-2">{children}</h4>,
    };

    const simpleMarkdownComponents = {
        p: ({node, children}) => <span className="block">{children}</span>,
        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />
    };

    if (totalCount === 0) return <div className="p-8 text-white text-center">No data</div>;

    return (
        <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6 text-center">演習結果</h1>

            {/* ▼▼▼ 追加: 獲得経験値カード ▼▼▼ */}
            {totalExp > 0 && (
                <div className="card glass-card p-5 mb-6 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Trophy size={80} className="text-yellow-400" /></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg text-black">
                            <Trophy size={28} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-yellow-200 uppercase tracking-wider mb-1">Experience Gained</div>
                            <div className="text-3xl font-black text-white">+{totalExp} <span className="text-base font-normal text-yellow-100/80">XP</span></div>
                        </div>
                    </div>
                    <div className="mt-4 bg-black/30 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-xs font-bold text-white">Level {userStatus.level}</span>
                            <span className="text-[10px] text-gray-300 font-mono">{userStatus.exp} / {nextLevelExp}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400" style={{ width: `${expPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            )}
            {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

            {/* スコアカード */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center border border-gray-700">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">正答率</span>
                    <span className={`text-3xl font-black ${accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-blue-400' : 'text-red-400'}`}>
                        {accuracy}<span className="text-sm font-normal text-gray-500 ml-0.5">%</span>
                    </span>
                </div>
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center border border-gray-700">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">正解数</span>
                    <span className="text-3xl font-black text-white">{correctCount}<span className="text-base font-normal text-gray-500">/{totalCount}</span></span>
                </div>
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center border border-gray-700">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">平均時間</span>
                    <span className="text-3xl font-black text-white">{avgTime}<span className="text-sm font-normal text-gray-500 ml-0.5">秒</span></span>
                </div>
            </div>

            {/* AIフィードバック */}
            <div className="card glass-card p-6 border border-blue-500/20 mb-8 relative overflow-hidden bg-gradient-to-b from-gray-800/80 to-gray-900/80">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">AIコーチの総括</h2>
                        <p className="text-xs text-gray-400">あなたのパフォーマンス分析</p>
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="animate-spin mb-3 text-blue-500" size={32} />
                        <p className="animate-pulse text-sm">あなたの回答とチャット履歴を分析中...</p>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed text-gray-300">
                         <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={markdownComponents}
                         >
                             {feedback}
                         </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* 詳細リスト */}
            <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider px-1">回答詳細</h3>
                {sessionData.map((data, i) => (
                    <div key={i} className="card bg-gray-800/40 p-4 flex items-start gap-4 border border-gray-700 hover:bg-gray-800/60 transition-colors">
                         <div className="mt-1 flex-shrink-0">
                            {data.isCorrect ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="text-sm text-gray-200 mb-2 line-clamp-2 leading-relaxed">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={simpleMarkdownComponents}
                                >
                                    {data.question.text}
                                </ReactMarkdown>
                             </div>
                             <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                 <span className="flex items-center gap-1"><Clock size={12} /> {data.timeTaken}秒</span>
                                 {data.chatLog && data.chatLog.length > 0 && (
                                     <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                         <BrainCircuit size={12} /> 質問回数: {data.chatLog.length / 2}
                                     </span>
                                 )}
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => navigate('/')}
                className="btn w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                <Home size={20} /> ホームに戻る
            </button>
        </div>
    );
}