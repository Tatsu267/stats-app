import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../../utils/cn';
import { CheckCircle2, XCircle } from 'lucide-react';
import 'katex/dist/katex.min.css';

export default function QuestionCard({ question, selectedOption, onSelectOption, isAnswered, correctIndex }) {
    if (!question) {
        return <div className="p-8 text-center text-gray-500">問題を読み込み中...</div>;
    }

    const markdownComponents = {
        p: ({ node, children }) => {
            return <p className="mb-4 leading-relaxed text-gray-100">{children}</p>;
        },
        strong: ({ node, ...props }) => (
            <strong className="font-bold text-amber-200/90 border-b border-amber-500/30 pb-0.5 mx-1" {...props} />
        ),
        ul: ({ node, ...props }) => (
            <ul className="my-4 pl-4 border-l-2 border-gray-700 space-y-2" {...props} />
        ),
        li: ({ node, children, ...props }) => (
            <li className="pl-4 py-1 text-sm md:text-base leading-relaxed relative" {...props}>
                <span className="absolute left-0 top-2.5 w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                <div className="text-gray-200">{children}</div>
            </li>
        ),
        table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded border border-gray-700">
                <table className="w-full text-left border-collapse text-sm" {...props} />
            </div>
        ),
        thead: ({ node, ...props }) => <thead className="bg-gray-800 text-gray-200" {...props} />,
        tbody: ({ node, ...props }) => <tbody className="bg-gray-900/30" {...props} />,
        tr: ({ node, ...props }) => <tr className="border-b border-gray-800 last:border-0" {...props} />,
        th: ({ node, ...props }) => <th className="p-3 font-semibold border-r border-gray-800 last:border-0 whitespace-nowrap text-gray-400" {...props} />,
        td: ({ node, ...props }) => <td className="p-3 border-r border-gray-800 last:border-0" {...props} />,
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* AI生成タグ削除済 */}

            {/* 問題文 */}
            <div className="mb-8 px-1">
                <div className="text-lg md:text-xl leading-8 font-medium text-gray-100 tracking-wide">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[[rehypeKatex, { strict: false }]]}
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

                        let containerStyle = "border-gray-800 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-600";
                        let iconColor = "text-gray-600";
                        let textColor = "text-gray-400";

                        if (isSelected && !isAnswered) {
                            containerStyle = "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20";
                            iconColor = "text-blue-400";
                            textColor = "text-blue-100";
                        }

                        if (isAnswered) {
                            if (isCorrect) {
                                containerStyle = "border-green-500/50 bg-green-500/10";
                                iconColor = "text-green-400";
                                textColor = "text-green-100 font-bold";
                            } else if (isSelected && !isCorrect) {
                                containerStyle = "border-red-500/50 bg-red-500/10 opacity-70";
                                iconColor = "text-red-400";
                                textColor = "text-red-200";
                            } else {
                                containerStyle = "border-gray-800 bg-transparent opacity-40";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => !isAnswered && onSelectOption(index)}
                                disabled={isAnswered}
                                className={cn(
                                    "w-full text-left p-4 rounded-lg border transition-all duration-200 relative overflow-hidden group tap-target",
                                    "flex items-center gap-4 active:scale-[0.99]",
                                    containerStyle
                                )}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                                    {isAnswered && isCorrect ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-500 animate-scale-in" strokeWidth={2.5} />
                                    ) : isAnswered && isSelected && !isCorrect ? (
                                        <XCircle className="w-6 h-6 text-red-500 animate-scale-in" strokeWidth={2.5} />
                                    ) : (
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                                            isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-600 text-gray-500 group-hover:border-gray-500"
                                        )}>
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                    )}
                                </div>
                                <div className={cn("text-base flex-1", textColor)}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                        components={{
                                            p: ({ node, children }) => <span className="block">{children}</span>
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