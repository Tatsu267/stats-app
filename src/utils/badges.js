import { Zap, Target, Flame, BookOpen, Clock, Crown, Medal } from 'lucide-react';
import { db, unlockBadge } from '../services/db';

export const BADGES = [
    {
        id: 'first_step',
        name: 'はじめの一歩',
        description: '初めて問題を解いた',
        icon: Target,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        condition: async (stats) => stats.totalAttempts >= 1
    },
    {
        id: 'streak_3',
        name: '三日坊主卒業',
        description: '3日連続で学習した',
        icon: Flame,
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        condition: async (stats) => stats.streak >= 3
    },
    {
        id: 'streak_7',
        name: '週間王者',
        description: '7日連続で学習した',
        icon: Flame,
        color: 'text-red-500',
        bg: 'bg-red-500/20',
        condition: async (stats) => stats.streak >= 7
    },
    {
        id: 'level_5',
        name: 'ルーキー',
        description: 'レベル5に到達',
        icon: Medal,
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        condition: async (stats) => stats.level >= 5
    },
    {
        id: 'level_10',
        name: 'ベテラン',
        description: 'レベル10に到達',
        icon: Crown,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        condition: async (stats) => stats.level >= 10
    },
    {
        id: 'speedster',
        name: 'スピードスター',
        description: '5秒以内に正解した',
        icon: Zap,
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
        condition: async (stats) => stats.lastTimeTaken <= 5 && stats.lastIsCorrect
    },
    {
        id: 'night_owl',
        name: '夜ふかし検定員',
        description: '深夜2時〜4時に学習した',
        icon: Clock,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/20',
        condition: async (stats) => {
            const hour = new Date().getHours();
            return hour >= 2 && hour < 4;
        }
    }
];

// 新しく獲得したバッジをチェックしてDBに保存し、獲得したバッジのリストを返す
export async function checkNewBadges(currentStats) {
    const unlockedBadges = [];

    for (const badge of BADGES) {
        try {
            // 条件を満たしているかチェック
            const isMet = await badge.condition(currentStats);
            if (isMet) {
                // DBに保存を試みる（既に持っている場合はfalseが返る）
                const isNew = await unlockBadge(badge.id);
                if (isNew) {
                    unlockedBadges.push(badge);
                }
            }
        } catch (e) {
            console.error(`Error checking badge ${badge.id}:`, e);
        }
    }

    return unlockedBadges;
}