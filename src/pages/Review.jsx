import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Calendar, 
    RotateCw, 
    Dna, 
    ArrowRight
} from 'lucide-react';
import { db } from '../services/db';
import questionsData from '../data/questions.json';
import { cn } from '../utils/cn';
import { CATEGORY_NAMES } from '../utils/categories'; // 変更

export default function Review() {
    const navigate = useNavigate();
    const [filterCategory, setFilterCategory] = useState('All');

    const attempts = useLiveQuery(() => db.attempts.orderBy('timestamp').reverse().toArray());

    const categories = CATEGORY_NAMES; // 変更

    if (!attempts) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

    const filteredAttempts = attempts.filter(attempt => {
        if (filterCategory === 'All') return true;
        const q = questionsData.find(q => q.id === attempt.questionId);
        return q && q.category === filterCategory;
    });

    return (
        <div className="pb-28 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Review</h1>
                <p className="text-gray-400 text-sm">学習履歴と復習</p>
            </header>

            {/* 復習アクションカード */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button 
                    onClick={() => navigate('/quiz', { state: { mode: 'weakness', start: true } })}
                    className="card glass-card p-6 text-left group transition-all hover:bg-red-500/10 hover:border-red-500/30 relative overflow-hidden tap-target"
                >
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-4">
                            <RotateCw size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">弱点克服</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            間違えた問題を優先的に復習します。
                        </p>
                    </div>
                    <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors" />
                </button>

                <button 
                     onClick={() => navigate('/quiz', { state: { mode: 'review', start: true } })}
                     className="card glass-card p-6 text-left group transition-all hover:bg-blue-500/10 hover:border-blue-500/30 relative overflow-hidden tap-target"
                >
                    <div className="relative z-10">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                            <Dna size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">徹底復習</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            過去に解いた問題を再度演習します。
                        </p>
                    </div>
                     <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
                </button>
            </div>

            {/* 履歴フィルター */}
            <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                    onClick={() => setFilterCategory('All')}
                    className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
                        filterCategory === 'All' 
                            ? "bg-white text-gray-900 border-white" 
                            : "bg-gray-800 text-gray-400 border-gray-700"
                    )}
                >
                    すべて
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
                            filterCategory === cat 
                                ? "bg-blue-600 text-white border-blue-500" 
                                : "bg-gray-800 text-gray-400 border-gray-700"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* 履歴リスト */}
            <div className="space-y-3">
                {filteredAttempts.length === 0 ? (
                    <div className="text-gray-500 text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-800 border-dashed">
                        履歴がありません。<br/>まずはクイズに挑戦しましょう！
                        <div className="mt-4">
                            <button onClick={() => navigate('/quiz')} className="text-blue-400 text-sm font-bold flex items-center justify-center gap-1">
                                クイズへ移動 <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    filteredAttempts.map((attempt) => {
                        const question = questionsData.find(q => q.id === attempt.questionId);
                        if (!question) return null;

                        return (
                            <div key={attempt.id} className="card bg-gray-800/40 p-4 border border-white/5 hover:bg-gray-800/60 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {attempt.isCorrect ? (
                                                <CheckCircle2 className="text-green-500" size={20} />
                                            ) : (
                                                <XCircle className="text-red-500" size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                                    {question.category}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                    {question.difficulty}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-200 leading-snug mb-2">
                                                {question.text}
                                            </h3>
                                            <div className="text-xs text-gray-500 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(attempt.timestamp).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {attempt.timeTaken}秒
                                                </span>
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