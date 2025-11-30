import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Lock, CheckCircle2, PlayCircle, ChevronRight, Map, BookOpen } from 'lucide-react';
import { getUserLevel } from '../services/db';
import { CURRICULUM_STAGES } from '../utils/curriculum'; // ここでutilsからデータを読み込む
import { cn } from '../utils/cn';

export default function Curriculum() {
    const navigate = useNavigate();

    const userLevel = useLiveQuery(async () => {
        return await getUserLevel();
    }, [], 1);

    const handleStartStage = (stage) => {
        navigate('/quiz', { 
            state: { 
                mode: 'ai_custom', 
                category: stage.category,
                start: true
            } 
        });
    };

    return (
        <div className="min-h-screen pb-32 px-4 pt-6 max-w-3xl mx-auto animate-fade-in">
            <header className="mb-8 flex items-center gap-4">
                <button 
                    onClick={() => navigate('/')}
                    className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Map className="text-blue-400" /> 学習カリキュラム
                    </h1>
                    <p className="text-xs text-gray-400">準1級合格への最短ロードマップ</p>
                </div>
            </header>

            <div className="space-y-6 relative">
                {/* 縦の連結線 */}
                <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gray-800 -z-10" />

                {CURRICULUM_STAGES.map((stage, index) => {
                    const isLocked = userLevel < stage.requiredLevel;
                    const isNext = !isLocked && (index === 0 || userLevel < CURRICULUM_STAGES[index + 1]?.requiredLevel);
                    
                    return (
                        <div key={stage.id} className={cn("relative pl-16 transition-all duration-500", isLocked ? "opacity-60 grayscale" : "opacity-100")}>
                            {/* ステータスアイコン */}
                            <div className={cn(
                                "absolute left-0 top-0 w-14 h-14 rounded-full border-4 flex items-center justify-center z-10 shadow-lg transition-colors",
                                isLocked 
                                    ? "bg-gray-900 border-gray-700 text-gray-600" 
                                    : isNext
                                        ? "bg-blue-600 border-blue-900 text-white scale-110 shadow-blue-500/30"
                                        : "bg-green-600 border-green-900 text-white"
                            )}>
                                {isLocked ? <Lock size={20} /> : isNext ? <PlayCircle size={24} /> : <CheckCircle2 size={24} />}
                            </div>

                            {/* カード本体 */}
                            <div className={cn(
                                "card p-5 rounded-2xl border transition-all group",
                                isLocked 
                                    ? "bg-gray-900/50 border-gray-800" 
                                    : "bg-gray-800/80 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800"
                            )}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", 
                                            isLocked ? "bg-gray-800 text-gray-500" : "bg-blue-500/20 text-blue-300"
                                        )}>
                                            {stage.category}
                                        </span>
                                        <h3 className="text-lg font-bold text-white mt-1">{stage.title}</h3>
                                    </div>
                                    {isLocked && (
                                        <span className="text-[10px] font-bold text-red-400 border border-red-500/30 px-2 py-1 rounded bg-red-500/10">
                                            Lv.{stage.requiredLevel} 解放
                                        </span>
                                    )}
                                </div>
                                
                                <p className="text-xs text-gray-400 mb-4 leading-relaxed">{stage.description}</p>
                                
                                <div className="space-y-2 mb-4">
                                    {stage.topics.slice(0, 3).map((topic, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                            <BookOpen size={12} className="text-gray-600" />
                                            {topic}
                                        </div>
                                    ))}
                                    {stage.topics.length > 3 && (
                                        <div className="text-[10px] text-gray-500 pl-5">+ 他 {stage.topics.length - 3} 項目</div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => !isLocked && handleStartStage(stage)}
                                    disabled={isLocked}
                                    className={cn(
                                        "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                        isLocked 
                                            ? "bg-gray-800 text-gray-600 cursor-not-allowed" 
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95"
                                    )}
                                >
                                    {isLocked ? "ロックされています" : "学習を開始する"}
                                    {!isLocked && <ChevronRight size={16} />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}