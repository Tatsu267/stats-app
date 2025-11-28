import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Calendar, RotateCw, Dna, ArrowRight, AlarmClock } from 'lucide-react';
import { getAttemptsWithQuestions } from '../utils/questionManager';
import { cn } from '../utils/cn';
import { CATEGORY_NAMES } from '../utils/categories';
import { getDueReviewQuestionIds } from '../services/db';

export default function Review() {
    const navigate = useNavigate();
    const [filterCategory, setFilterCategory] = useState('All');

    const attemptsWithData = useLiveQuery(async () => {
        const data = await getAttemptsWithQuestions();
        return data.reverse();
    }, []);
    
    const dueReviewIds = useLiveQuery(async () => {
        return await getDueReviewQuestionIds();
    }, []);

    const categories = CATEGORY_NAMES;

    if (!attemptsWithData) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

    const filteredAttempts = attemptsWithData.filter(item => {
        if (filterCategory === 'All') return true;
        // ▼▼▼ 修正: item.question でアクセス ▼▼▼
        return item.question && item.question.category === filterCategory;
    });
    
    const dueCount = dueReviewIds?.length || 0;

    return (
        <div className="pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Review</h1>
                <p className="text-gray-400 text-sm">学習履歴と復習</p>
            </header>
            
            <div className="mb-8">
                 <button 
                    onClick={() => dueCount > 0 ? navigate('/quiz', { state: { mode: 'srs_review', start: true } }) : null}
                    disabled={dueCount === 0}
                    className={cn(
                        "w-full card p-6 text-left group transition-all relative overflow-hidden tap-target border-2",
                        dueCount > 0 
                            ? "bg-gradient-to-br from-green-600/20 to-emerald-900/20 border-green-500/50 shadow-lg shadow-green-900/20 hover:border-green-400"
                            : "bg-gray-800/40 border-gray-700/50 opacity-80"
                    )}
                >
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className={cn("flex items-center gap-2 mb-1 text-sm font-bold uppercase tracking-wider", dueCount > 0 ? "text-green-400" : "text-gray-500")}>
                                <AlarmClock size={18} />
                                Smart Review
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">
                                {dueCount > 0 ? "今日復習すべき問題" : "復習完了！"}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                {dueCount > 0 ? `忘却曲線に基づき、${dueCount}問がピックアップされました。` : "今のところ、今日やるべき復習はありません。"}
                            </p>
                        </div>
                        <div className={cn("text-4xl font-black", dueCount > 0 ? "text-white" : "text-gray-600")}>
                            {dueCount}
                        </div>
                    </div>
                    {dueCount > 0 && <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button onClick={() => navigate('/quiz', { state: { mode: 'weakness', start: true } })} className="card glass-card p-6 text-left group transition-all hover:bg-red-500/10 hover:border-red-500/30 relative overflow-hidden tap-target">
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-4"><RotateCw size={20} /></div>
                        <h3 className="text-lg font-bold text-white mb-1">弱点克服</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">間違えた問題を優先的に復習します。</p>
                    </div>
                </button>
                <button onClick={() => navigate('/quiz', { state: { mode: 'review', start: true } })} className="card glass-card p-6 text-left group transition-all hover:bg-blue-500/10 hover:border-blue-500/30 relative overflow-hidden tap-target">
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4"><Dna size={20} /></div>
                        <h3 className="text-lg font-bold text-white mb-1">徹底復習</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">過去に解いた問題を再度演習します。</p>
                    </div>
                </button>
            </div>

            <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <button onClick={() => setFilterCategory('All')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border", filterCategory === 'All' ? "bg-white text-gray-900 border-white" : "bg-gray-800 text-gray-400 border-gray-700")}>すべて</button>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(cat)} className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border", filterCategory === cat ? "bg-blue-600 text-white border-blue-500" : "bg-gray-800 text-gray-400 border-gray-700")}>{cat}</button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredAttempts.length === 0 ? (
                    <div className="text-gray-500 text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-800 border-dashed">
                        履歴がありません。<br/>まずはクイズに挑戦しましょう！
                        <div className="mt-4"><button onClick={() => navigate('/quiz')} className="text-blue-400 text-sm font-bold flex items-center justify-center gap-1">クイズへ移動 <ArrowRight size={14} /></button></div>
                    </div>
                ) : (
                    filteredAttempts.map((item) => {
                        // ▼▼▼ 修正: item自体がattemptデータ ▼▼▼
                        const attempt = item;
                        const question = attempt.question;
                        
                        if (!question) return null;

                        return (
                            <div key={attempt.id} className="card bg-gray-800/40 p-4 border border-white/5 hover:bg-gray-800/60 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {attempt.isCorrect ? <CheckCircle2 className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{question.category}</span>
                                                {question.isCustom && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">AI</span>}
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-200 leading-snug mb-2 line-clamp-2">{question.text}</h3>
                                            <div className="text-xs text-gray-500 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Calendar size={12} />{new Date(attempt.timestamp).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} />{attempt.timeTaken}秒</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}