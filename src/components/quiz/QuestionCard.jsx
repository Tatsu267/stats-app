import React from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react'; // Sparklesを追加
import { BlockMath, InlineMath } from 'react-katex';

// 数式変換コンポーネント (変更なし)
const MathText = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2);
                    return <div key={index} className="my-2 overflow-x-auto"><BlockMath math={math} /></div>;
                }
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    return <span key={index} className="mx-0.5"><InlineMath math={math} /></span>;
                }
                return part;
            })}
        </span>
    );
};

export default function QuestionCard({ question, selectedOption, onSelectOption, isAnswered, correctIndex }) {
    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* ▼▼▼ 追加: AI生成タグ ▼▼▼ */}
            {question.isCustom && (
                <div className="mb-4 animate-fade-in">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-900/20">
                        <Sparkles size={12} />
                        AI生成問題
                    </span>
                </div>
            )}
            
            {/* 問題文 */}
            <div className="mb-8 px-1">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed tracking-tight">
                    <MathText text={question.text} />
                </h2>
            </div>

            {/* 選択肢リスト (変更なし) */}
            <div className="space-y-3">
                {question.options.map((option, index) => {
                    const isSelected = selectedOption === index;
                    const isCorrect = index === correctIndex;
                    
                    let containerStyle = "border-gray-700 bg-gray-800/40 hover:bg-gray-800 hover:border-gray-600";
                    let iconColor = "text-gray-500";
                    let textColor = "text-gray-300";

                    if (isSelected && !isAnswered) {
                        containerStyle = "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50";
                        iconColor = "text-blue-400";
                        textColor = "text-blue-100";
                    }

                    if (isAnswered) {
                        if (isCorrect) {
                            containerStyle = "border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]";
                            iconColor = "text-green-400";
                            textColor = "text-green-100 font-bold";
                        } else if (isSelected && !isCorrect) {
                            containerStyle = "border-red-500 bg-red-500/10 opacity-80";
                            iconColor = "text-red-400";
                            textColor = "text-red-200";
                        } else {
                            containerStyle = "border-gray-800 bg-gray-900/20 opacity-40";
                        }
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => !isAnswered && onSelectOption(index)}
                            disabled={isAnswered}
                            className={cn(
                                "w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 min-h-[72px] relative overflow-hidden group tap-target",
                                "flex items-center gap-4 active:scale-[0.99]",
                                containerStyle
                            )}
                        >
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                                {isAnswered && isCorrect ? (
                                    <CheckCircle2 className="w-7 h-7 text-green-500 animate-scale-in" strokeWidth={2.5} />
                                ) : isAnswered && isSelected && !isCorrect ? (
                                    <XCircle className="w-7 h-7 text-red-500 animate-scale-in" strokeWidth={2.5} />
                                ) : (
                                    <div className={cn(
                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors",
                                        isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-600 text-gray-500 group-hover:border-gray-500"
                                    )}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                )}
                            </div>
                            <span className={cn("text-base md:text-lg leading-snug flex-1", textColor)}>
                                <MathText text={option} />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}