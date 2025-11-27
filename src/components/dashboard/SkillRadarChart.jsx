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
import { CATEGORY_NAMES } from '../../utils/categories';

export default function SkillRadarChart({ data }) {
    // データがない場合はデフォルト値を生成（全分野0点）
    const chartData = data || CATEGORY_NAMES.map(cat => ({
        subject: cat,
        A: 0,
        fullMark: 100
    }));

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                {/* 7分野に合わせて outerRadius を微調整 (60% -> 65% 程度でも入る可能性がありますが安全策で60%) */}
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="My Skill"
                        dataKey="A"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fill="#8B5CF6"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            borderColor: '#374151', 
                            color: '#F3F4F6',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#A78BFA' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}