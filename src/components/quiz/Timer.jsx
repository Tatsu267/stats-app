import React, { useEffect, useState, useCallback } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

export default function Timer({ isRunning, onTick }) {
    const [seconds, setSeconds] = useState(0);

    // Memoize onTick to prevent unnecessary re-renders
    const onTickCallback = useCallback(onTick, []);

    useEffect(() => {
        // Reset timer when component mounts or isRunning changes from false to true
        if (!isRunning) {
            setSeconds(0);
        }
    }, [isRunning]);

    useEffect(() => {
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning]);

    // Call onTick when seconds change (not during render)
    useEffect(() => {
        if (isRunning && seconds > 0 && onTickCallback) {
            onTickCallback(seconds);
        }
    }, [seconds, isRunning, onTickCallback]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 text-gray-400 bg-gray-800/70 px-3 md:px-4 py-2 rounded-full border border-gray-700/50">
            <TimerIcon size={16} className="flex-shrink-0" />
            <span className="font-mono text-sm md:text-base font-medium tabular-nums">{formatTime(seconds)}</span>
        </div>
    );
}
