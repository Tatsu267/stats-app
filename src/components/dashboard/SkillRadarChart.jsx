import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

export default function SkillRadarChart({ data }) {
    // Default data if none provided
    const chartData = data || [
        { subject: '確率分布', A: 60, fullMark: 100 },
        { subject: '推測統計', A: 50, fullMark: 100 },
        { subject: '多変量解析', A: 40, fullMark: 100 },
        { subject: '実験計画法', A: 30, fullMark: 100 },
        { subject: 'ノンパラ', A: 40, fullMark: 100 },
        { subject: 'その他', A: 50, fullMark: 100 },
    ];

    return (
        <div className="flex flex-col w-full">
            <h2 className="text-lg font-semibold text-gray-400 mb-4">分野別スキル分析</h2>
            <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="My Skill"
                            dataKey="A"
                            stroke="#8884d8"
                            strokeWidth={2}
                            fill="#8884d8"
                            fillOpacity={0.5}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#8884d8' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
