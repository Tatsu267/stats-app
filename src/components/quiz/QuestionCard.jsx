import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../../utils/cn';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import 'katex/dist/katex.min.css'; // 数式用スタイルの読み込み

export default function QuestionCard({ question, selectedOption, onSelectOption, isAnswered, correctIndex }) {
    // ガード処理
    if (!question) {
        return <div className="p-8 text-center text-gray-500">問題を読み込み中...</div>;
    }

    // Markdownのスタイル定義（表や数式の見た目を整える）
    const markdownComponents = {
        // 数式ブロック ($$) は中央揃えで大きく
        p: ({node, children}) => {
            // 子供に数式が含まれるかチェックするのは難しいので、汎用的なPタグスタイル
            return <p className="mb-4 leading-relaxed text-gray-100">{children}</p>;
        },
        // 表のデザイン (ここが重要！)
        table: ({node, ...props}) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-gray-600">
                <table className="w-full text-left border-collapse text-sm" {...props} />
            </div>
        ),
        thead: ({node, ...props}) => <thead className="bg-gray-800 text-gray-200" {...props} />,
        tbody: ({node, ...props}) => <tbody className="bg-gray-900/50" {...props} />,
        tr: ({node, ...props}) => <tr className="border-b border-gray-700 last:border-0" {...props} />,
        th: ({node, ...props}) => <th className="p-3 font-bold border-r border-gray-700 last:border-0 whitespace-nowrap" {...props} />,
        td: ({node, ...props}) => <td className="p-3 border-r border-gray-700 last:border-0" {...props} />,
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* AI生成タグ */}
            {question.isCustom && (
                <div className="mb-4 animate-fade-in">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-900/20">
                        <Sparkles size={12} />
                        AI生成問題
                    </span>
                </div>
            )}
            
            {/* 問題文 (ReactMarkdownでリッチに表示) */}
            <div className="mb-6 px-1">
                <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownComponents}
                    >
                        {question.text}
                    </ReactMarkdown>
                </div>
            </div>

            {/* 選択肢リスト */}
            <div className="space-y-3">
                {Array.isArray(question.options) && question.options.length > 0 ? (
                    question.options.map((option, index) => {
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
                                <div className={cn("text-base md:text-lg leading-snug flex-1", textColor)}>
                                    {/* 選択肢内でも数式を使えるようにMarkdownで描画 */}
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({node, children}) => <span className="block">{children}</span>
                                        }}
                                    >
                                        {option}
                                    </ReactMarkdown>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="p-4 text-red-400 bg-red-900/20 rounded border border-red-500/20">
                        選択肢データの読み込みに失敗しました。
                    </div>
                )}
            </div>
        </div>
    );
}