import React from 'react';
import { getScoreGrade } from '../../utils/scoring';
import { cn } from '../../utils/cn';

export default function ScoreGauge({ score }) {
    const grade = getScoreGrade(score);
    const radius = 80;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let colorClass = 'text-blue-500';
    if (score >= 80) colorClass = 'text-purple-500';
    if (score >= 60) colorClass = 'text-blue-500';
    if (score < 60) colorClass = 'text-yellow-500';
    if (score < 40) colorClass = 'text-red-500';

    return (
        <div className="flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-400 mb-4">現在の予測スコア</h2>
            <div className="relative flex items-center justify-center">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="rotate-[-90deg]"
                >
                    <circle
                        stroke="currentColor"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset: 0 }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className="text-gray-700"
                    />
                    <circle
                        stroke="currentColor"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className={cn("transition-all duration-1000 ease-out", colorClass)}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className={cn("text-4xl font-bold", colorClass)}>{Math.round(score)}</span>
                    <span className="text-sm text-gray-400 font-medium">Grade {grade}</span>
                </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
                最近の解答履歴に基づく予測値
            </p>
        </div>
    );
}
