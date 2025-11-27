import React from 'react';
import { cn } from '../../utils/cn';

export default function QuestionCard({ question, selectedOption, onSelectOption, isAnswered, correctIndex }) {
    return (
        <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 shadow-lg max-w-3xl mx-auto border border-gray-700/50">
            {/* Question Text - Improved readability */}
            <h2 className="text-lg md:text-xl font-medium text-white mb-6 leading-relaxed">
                {question.text}
            </h2>

            {/* Options - Optimized sizing and spacing */}
            <div className="space-y-2.5">
                {question.options.map((option, index) => {
                    let optionClass = "border-gray-700 hover:border-gray-600 hover:bg-gray-700/30 text-gray-200";
                    let labelClass = "border-gray-600 text-gray-400";

                    if (selectedOption === index && !isAnswered) {
                        optionClass = "border-blue-500 bg-blue-500/15 text-blue-100 shadow-sm shadow-blue-500/10";
                        labelClass = "border-blue-400 bg-blue-500/20 text-blue-300";
                    }

                    if (isAnswered) {
                        if (index === correctIndex) {
                            optionClass = "border-green-500 bg-green-500/15 text-green-100";
                            labelClass = "border-green-400 bg-green-500/20 text-green-300";
                        } else if (selectedOption === index) {
                            optionClass = "border-red-500 bg-red-500/15 text-red-100";
                            labelClass = "border-red-400 bg-red-500/20 text-red-300";
                        } else {
                            optionClass = "border-gray-700/50 opacity-50 text-gray-400";
                            labelClass = "border-gray-600 text-gray-500";
                        }
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => !isAnswered && onSelectOption(index)}
                            disabled={isAnswered}
                            className={cn(
                                "w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 min-h-[56px] tap-target",
                                "active:scale-[0.98]",
                                optionClass
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {/* Option Label (A, B, C, D) */}
                                <div className={cn(
                                    "w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all",
                                    labelClass
                                )}>
                                    {String.fromCharCode(65 + index)}
                                </div>
                                {/* Option Text */}
                                <span className="text-sm md:text-base leading-snug">{option}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
