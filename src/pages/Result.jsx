import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, BrainCircuit, Loader2, Home, ArrowRight } from 'lucide-react';
import { generateSessionFeedback } from '../services/ai';
import ReactMarkdown from 'react-markdown';

export default function Result() {
    const location = useLocation();
    const navigate = useNavigate();
    const { sessionData } = location.state || { sessionData: [] };
    const [feedback, setFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const correctCount = sessionData.filter(d => d.isCorrect).length;
    const totalCount = sessionData.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const totalTime = sessionData.reduce((acc, curr) => acc + curr.timeTaken, 0);
    const avgTime = totalCount > 0 ? Math.round(totalTime / totalCount) : 0;

    useEffect(() => {
        const fetchFeedback = async () => {
            if (totalCount === 0) {
                setIsLoading(false);
                return;
            }
            try {
                const text = await generateSessionFeedback(sessionData);
                setFeedback(text);
            } catch (error) {
                setFeedback("AI分析中にエラーが発生しました: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFeedback();
    }, [sessionData]);

    if (totalCount === 0) return <div className="p-8 text-white">No data</div>;

    return (
        <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6 text-center">演習結果</h1>

            {/* スコアカード */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 uppercase">正答率</span>
                    <span className={`text-2xl font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-blue-400' : 'text-red-400'}`}>
                        {accuracy}%
                    </span>
                </div>
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 uppercase">正解数</span>
                    <span className="text-2xl font-bold text-white">{correctCount}<span className="text-sm text-gray-500">/{totalCount}</span></span>
                </div>
                <div className="card bg-gray-800 p-4 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 uppercase">平均時間</span>
                    <span className="text-2xl font-bold text-white">{avgTime}<span className="text-sm text-gray-500">秒</span></span>
                </div>
            </div>

            {/* AIフィードバック */}
            <div className="card glass-card p-6 border border-blue-500/20 mb-8 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit className="text-blue-400" size={24} />
                    <h2 className="text-xl font-bold text-white">AIコーチの総括</h2>
                </div>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>あなたの回答とチャット履歴を分析中...</p>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed text-gray-200">
                         <ReactMarkdown 
                            components={{
                                strong: ({node, ...props}) => <span className="text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded" {...props} />,
                            }}
                         >
                             {feedback}
                         </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* 詳細リスト */}
            <div className="space-y-3 mb-8">
                <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">回答詳細</h3>
                {sessionData.map((data, i) => (
                    <div key={i} className="card bg-gray-800/50 p-4 flex items-start gap-4 border border-gray-700">
                         <div className="mt-1">
                            {data.isCorrect ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
                         </div>
                         <div className="flex-1">
                             <p className="text-sm text-gray-300 mb-1 line-clamp-2">{data.question.text}</p>
                             <div className="flex items-center gap-3 text-xs text-gray-500">
                                 <span>{data.timeTaken}秒</span>
                                 {data.chatLog && data.chatLog.length > 0 && (
                                     <span className="flex items-center gap-1 text-blue-400">
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
                className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
                <Home size={20} /> ホームに戻る
            </button>
        </div>
    );
}