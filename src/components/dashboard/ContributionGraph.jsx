import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { cn } from '../../utils/cn';

export default function ContributionGraph() {
    const attempts = useLiveQuery(() => db.attempts.toArray(), []);

    if (!attempts) return <div className="h-24 bg-gray-800/30 rounded-xl animate-pulse" />;

    // 過去90日分の日付データを生成
    const days = 90;
    const today = new Date();
    const data = [];

    // 日付ごとの学習回数を集計
    const attemptsByDate = {};
    attempts.forEach(a => {
        const dateStr = new Date(a.timestamp).toDateString();
        attemptsByDate[dateStr] = (attemptsByDate[dateStr] || 0) + 1;
    });

    for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        const count = attemptsByDate[dateStr] || 0;
        
        // 色レベルの決定 (GitHub風)
        let level = 0;
        if (count > 0) level = 1;
        if (count >= 5) level = 2;
        if (count >= 10) level = 3;
        if (count >= 20) level = 4;

        data.push({ date: d, count, level });
    }

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
                {data.map((item, i) => (
                    <div
                        key={i}
                        title={`${item.date.toLocaleDateString()}: ${item.count} 回`}
                        className={cn(
                            "w-3 h-3 rounded-sm transition-all duration-300 hover:scale-125",
                            item.level === 0 && "bg-gray-800",
                            item.level === 1 && "bg-emerald-900 border border-emerald-800",
                            item.level === 2 && "bg-emerald-700 border border-emerald-600",
                            item.level === 3 && "bg-emerald-500 border border-emerald-400",
                            item.level === 4 && "bg-emerald-300 border border-emerald-200 shadow-[0_0_8px_rgba(110,231,183,0.5)]"
                        )}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-1">
                <span>3 Months ago</span>
                <div className="flex items-center gap-1">
                    <span>Less</span>
                    <div className="w-2 h-2 bg-gray-800 rounded-sm" />
                    <div className="w-2 h-2 bg-emerald-900 rounded-sm" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-sm" />
                    <div className="w-2 h-2 bg-emerald-300 rounded-sm" />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}