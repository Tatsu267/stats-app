import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    ArrowRight, CheckCircle, XCircle, Loader2, Sparkles, ArrowLeft,
    AlertTriangle, Tag, AlertCircle, StopCircle, ThumbsUp, HelpCircle,
    AlertOctagon, Trophy, Swords, TrendingDown, Ban, Layers
} from 'lucide-react';
import questionsData from '../data/questions.json';
import QuestionCard from '../components/quiz/QuestionCard';
import ExplanationChat from '../components/quiz/ExplanationChat';
import Timer from '../components/quiz/Timer';
import { calculateNewScore } from '../utils/scoring';
import {
    db, addScore, addAttempt, getLatestScore, addCustomQuestion,
    getLearningState, updateLearningState, getDueReviewQuestionIds,
    getUserLevel, getUserExp, saveUserLevel, saveUserExp,
    getBlockedSubcategories, addBlockedSubcategory
} from '../services/db';
import { calculateNextReview, SRS_RATINGS } from '../utils/srs';
import { calculateExpGain, getNextLevelExp, getDifficultyDistribution } from '../utils/leveling';
import { generateAiQuestion, generateRolePlayQuestion } from '../services/ai';
import { cn } from '../utils/cn';
import { CATEGORY_NAMES, CATEGORY_CONFIG, IMPORTANT_TOPICS, getCategoryByTopic } from '../utils/categories';
import { getAllQuestions, CUSTOM_PREFIX } from '../utils/questionManager';
import { ROLES, ROLE_IDS } from '../utils/roles';

export default function Quiz() {
    const navigate = useNavigate();
    const location = useLocation();

    const [quizPhase, setQuizPhase] = useState('setup');
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [waitingForConfidence, setWaitingForConfidence] = useState(false);

    const [timeTaken, setTimeTaken] = useState(0);
    const [currentScore, setCurrentScore] = useState(40);

    const [mode, setMode] = useState('random');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [tempSelectedCategory, setTempSelectedCategory] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
    const [tempSelectedTopic, setTempSelectedTopic] = useState(null);

    const [noticeMessage, setNoticeMessage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [earnedExp, setEarnedExp] = useState(0);
    const [totalSessionExp, setTotalSessionExp] = useState(0);
    const [levelUpData, setLevelUpData] = useState(null);
    const [levelDownData, setLevelDownData] = useState(null);

    const [showQuitModal, setShowQuitModal] = useState(false);
    const [blockedSubcategories, setBlockedSubcategories] = useState([]);

    const [sessionData, setSessionData] = useState([]);
    const currentChatLog = useRef([]);

    const categories = CATEGORY_NAMES;

    // ページ読み込み時にトップへスクロール
    useEffect(() => {
        const scrollContainer = document.querySelector('main');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [location.pathname]);

    // 除外リストのロード
    useEffect(() => {
        const loadBlocked = async () => {
            const blocked = await getBlockedSubcategories();
            setBlockedSubcategories(blocked);
        };
        loadBlocked();
    }, []);

    useEffect(() => {
        getLatestScore().then(score => setCurrentScore(score));

        if (location.state) {
            const { mode: initialMode, category, start } = location.state;
            if (initialMode === 'role_play_select') {
                setMode('role_play');
                setQuizPhase('role_select');
                return;
            }
            if (initialMode === 'ai_custom_select') {
                setMode('ai_custom');
                setQuizPhase('category_select');
                return;
            }
            setMode(initialMode);
            if (category) setSelectedCategory(category);
            if (start) startQuiz(initialMode, category);
        }
    }, [location.state]);

    const fetchNextAiQuestion = async (categoryOrRole, currentMode = mode, specificTopic = null) => {
        setIsGenerating(true);
        try {
            let targetDifficulty = 'Medium';
            let targetCategory = categoryOrRole;
            let isImportant = false;

            const currentBlocked = await getBlockedSubcategories();

            if (currentMode === 'ai_rank_match') {
                const userLevel = await getUserLevel();
                const dist = getDifficultyDistribution(userLevel);
                const rand = Math.random();

                if (rand < dist.Easy) targetDifficulty = 'Easy';
                else if (rand < dist.Easy + dist.Medium) targetDifficulty = 'Medium';
                else targetDifficulty = 'Hard';

                const availableTopics = IMPORTANT_TOPICS.filter(t => !currentBlocked.includes(t));

                if (availableTopics.length > 0 && Math.random() < 0.6) {
                    const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
                    targetCategory = getCategoryByTopic(randomTopic);
                    specificTopic = randomTopic;
                    isImportant = true;
                    console.log(`[Rank Match] Important Topic: ${specificTopic} -> Category: ${targetCategory}`);
                } else {
                    targetCategory = CATEGORY_NAMES[Math.floor(Math.random() * CATEGORY_NAMES.length)];
                    console.log(`[Rank Match] Random Category: ${targetCategory}`);
                }

            } else if (currentMode === 'ai_custom') {
                targetDifficulty = selectedDifficulty || 'Medium';
                if (specificTopic) {
                    console.log(`[Practice] Category: ${targetCategory} -> Topic: ${specificTopic} -> Difficulty: ${targetDifficulty}`);
                } else {
                    console.log(`[Practice] Category: ${targetCategory} -> Any Topic -> Difficulty: ${targetDifficulty}`);
                }
            }

            let newQuestion;
            if (currentMode === 'role_play') {
                newQuestion = await generateRolePlayQuestion(categoryOrRole, targetDifficulty);
            } else {
                newQuestion = await generateAiQuestion(targetCategory, targetDifficulty, specificTopic, currentBlocked);
            }

            const id = await addCustomQuestion(newQuestion);
            newQuestion.id = `${CUSTOM_PREFIX}${id}`;
            newQuestion.isCustom = true;
            newQuestion.isImportant = isImportant;

            return newQuestion;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setIsGenerating(false);
        }
    };

    const startQuiz = async (targetMode = mode, targetCategory = selectedCategory, targetRole = selectedRole, targetTopic = null) => {
        if (noticeMessage) return;

        setMode(targetMode);
        if (targetCategory) setSelectedCategory(targetCategory);
        if (targetTopic) setTempSelectedTopic(targetTopic);

        const scrollContainer = document.querySelector('main');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });

        setSessionData([]);
        setTotalSessionExp(0);

        try {
            if (targetMode === 'ai_rank_match' || targetMode === 'ai_custom' || targetMode === 'role_play') {
                try {
                    const param = targetMode === 'role_play' ? targetRole : targetCategory;
                    const q = await fetchNextAiQuestion(param, targetMode, targetTopic);
                    setQuestions([q]);
                    setQuizPhase('playing');
                    setCurrentQuestionIndex(0);
                    setTimeTaken(0);
                } catch (error) {
                    setNoticeMessage({ title: "生成エラー", text: "AIが混雑しています。時間を置いて試してください。", type: "error" });
                    setQuizPhase('notice');
                }
                return;
            }

            let allQuestions = await getAllQuestions();
            let filteredQuestions = [...allQuestions];

            if (targetMode === 'weakness') {
                const attempts = await db.attempts.toArray();
                const wrongQuestionIds = new Set(attempts.filter(a => !a.isCorrect).map(a => a.questionId));
                filteredQuestions = filteredQuestions.filter(q => wrongQuestionIds.has(q.id));
            }
            else if (targetMode === 'review') {
                const attempts = await db.attempts.toArray();
                const attemptedIds = new Set(attempts.map(a => a.questionId));
                filteredQuestions = filteredQuestions.filter(q => attemptedIds.has(q.id));
                if (targetCategory) filteredQuestions = filteredQuestions.filter(q => q.category === targetCategory);
            }
            else if (targetMode === 'srs_review') {
                const dueIds = await getDueReviewQuestionIds();
                if (dueIds.length === 0) {
                    setNoticeMessage({ title: "復習完了", text: "今日復習すべき問題はすべて完了しました！", type: "success" });
                    setQuizPhase('notice');
                    return;
                }
                const dueIdSet = new Set(dueIds);
                filteredQuestions = filteredQuestions.filter(q => dueIdSet.has(q.id));
            }

            if (filteredQuestions.length === 0) {
                const msg = targetMode === 'weakness' ? '間違えた問題はまだありません。' : targetMode === 'review' ? '復習対象の問題がありません。' : '問題が見つかりませんでした。復習対象の問題が削除された可能性があります。';
                setNoticeMessage({ title: "該当なし", text: msg, type: "success" });
                setQuizPhase('notice');
                return;
            }

            let selected = filteredQuestions.sort(() => 0.5 - Math.random());
            if (targetMode === 'mock') selected = selected.slice(0, 5);

            setQuestions(selected);
            setQuizPhase('playing');
            setCurrentQuestionIndex(0);
            setTimeTaken(0);
            setNoticeMessage(null);

        } catch (e) {
            console.error("Quiz Error:", e);
            setNoticeMessage({ title: "エラー", text: "問題の読み込みに失敗しました。", type: "error" });
            setQuizPhase('notice');
        }
    };

    const handleCategorySelect = (category) => {
        setTempSelectedCategory(category);
        setQuizPhase('subcategory_select');
    };

    const handleSubcategorySelect = (topic) => {
        setTempSelectedTopic(topic);
        setQuizPhase('difficulty_select');
    };

    const handleDifficultySelect = (diff) => {
        setSelectedDifficulty(diff);
        startQuiz('ai_custom', tempSelectedCategory, null, tempSelectedTopic);
    };

    const handleOptionSelect = (index) => { setSelectedOption(index); };
    const handleChatUpdate = (messages) => { currentChatLog.current = messages; };

    const handleBlockTopic = async () => {
        const question = questions[currentQuestionIndex];
        if (!question || !question.subcategory) return;

        const topic = question.subcategory;
        if (window.confirm(`「${topic}」を今後の出題範囲から除外しますか？\n※設定画面からいつでも解除できます。`)) {
            await addBlockedSubcategory(topic);
            setBlockedSubcategories(prev => [...prev, topic]);
            alert(`「${topic}」を除外しました。`);
        }
    };

    const handleSubmit = async () => {
        if (selectedOption === null) return;
        const question = questions[currentQuestionIndex];
        if (!question) return;

        const isCorrect = selectedOption === question.correctIndex;
        setIsAnswered(true);

        const newScore = calculateNewScore(currentScore, isCorrect, question.difficulty || 'Medium', timeTaken);
        setCurrentScore(newScore);

        if (isCorrect) {
            setWaitingForConfidence(true);
        } else {
            await processResult(SRS_RATINGS.AGAIN);
        }
    };

    const handleGiveUp = async () => {
        const question = questions[currentQuestionIndex];
        if (!question) return;

        setSelectedOption(-1);
        setIsAnswered(true);

        const newScore = calculateNewScore(currentScore, false, question.difficulty || 'Medium', timeTaken);
        setCurrentScore(newScore);

        await processResult(SRS_RATINGS.AGAIN);
    };

    const processResult = async (rating) => {
        const question = questions[currentQuestionIndex];
        const isCorrect = selectedOption === question.correctIndex;

        await addAttempt(question.id, isCorrect, timeTaken, [], rating);
        await addScore(currentScore);

        const currentState = await getLearningState(question.id);
        const nextState = calculateNextReview(currentState, rating);
        await updateLearningState(question.id, nextState);

        let xpGain = calculateExpGain(question.difficulty || 'Medium', rating);

        setEarnedExp(xpGain);
        setTotalSessionExp(prev => prev + xpGain);

        if (xpGain !== 0) {
            let currentLevel = await getUserLevel();
            let currentExp = await getUserExp();
            let newExp = currentExp + xpGain;

            if (xpGain > 0) {
                let nextLevelExp = getNextLevelExp(currentLevel);
                if (newExp >= nextLevelExp) {
                    newExp -= nextLevelExp;
                    currentLevel += 1;
                    setLevelUpData({ level: currentLevel });
                    setTimeout(() => setLevelUpData(null), 3000);
                }
            } else {
                if (newExp < 0) {
                    if (currentLevel > 1) {
                        currentLevel -= 1;
                        const prevLevelMaxExp = getNextLevelExp(currentLevel);
                        newExp = prevLevelMaxExp + newExp;

                        setLevelDownData({ level: currentLevel });
                        setTimeout(() => setLevelDownData(null), 3000);
                    } else {
                        newExp = 0;
                    }
                }
            }

            await saveUserLevel(currentLevel);
            await saveUserExp(newExp);
        }

        setSessionData(prev => [...prev, { question, isCorrect, timeTaken, chatLog: [] }]);
        currentChatLog.current = [];

        setWaitingForConfidence(false);
    };

    const saveCurrentChatLog = async () => {
        if (currentChatLog.current.length > 0) {
            setSessionData(prev => {
                const updated = [...prev];
                if (updated.length > 0) {
                    updated[updated.length - 1].chatLog = currentChatLog.current;
                }
                return updated;
            });
        }
    };

    const handleNext = async () => {
        await saveCurrentChatLog();
        setEarnedExp(0);

        const scrollContainer = document.querySelector('main');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });

        if (mode === 'ai_rank_match' || mode === 'ai_custom' || mode === 'role_play') {
            setSelectedOption(null);
            setIsAnswered(false);
            setWaitingForConfidence(false);
            setTimeTaken(0);
            try {
                const param = mode === 'role_play' ? selectedRole : (mode === 'ai_custom' ? selectedCategory : null);
                const nextQ = await fetchNextAiQuestion(param, mode, mode === 'ai_custom' ? tempSelectedTopic : null);
                setQuestions(prev => [...prev, nextQ]);
                setCurrentQuestionIndex(prev => prev + 1);
            } catch (e) {
                setNoticeMessage({ title: "生成エラー", text: "問題の生成に失敗しました。", type: "error" });
                setQuizPhase('notice');
            }
            return;
        }

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setWaitingForConfidence(false);
            setTimeTaken(0);
        } else {
            finishSession();
        }
    };

    const finishSession = async () => {
        await saveCurrentChatLog();
        navigate('/result', { state: { sessionData, totalExp: totalSessionExp } });
    };

    const handleQuit = async () => {
        if (window.confirm("演習を終了して結果を見ますか？")) {
            finishSession();
        }
    };

    const handleFinish = () => { navigate('/'); };

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                        <Sparkles size={64} className="text-amber-400 animate-bounce" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">AIが問題を生成中...</h2>
                        <p className="text-gray-400">あなたに最適な問題を作成しています</p>
                    </div>
                </div>
            </div>
        );
    }

    if (quizPhase === 'notice' && noticeMessage) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
                <div className="card glass-card p-8 max-w-sm w-full text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                            {noticeMessage.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{noticeMessage.title}</h2>
                    <p className="text-gray-400 mb-6">{noticeMessage.text}</p>
                    <button onClick={() => navigate('/')} className="btn w-full bg-gray-700 hover:bg-gray-600 text-white rounded-xl">ダッシュボードに戻る</button>
                </div>
            </div>
        );
    }

    if (quizPhase === 'role_select') {
        // ... (Role Select View) ...
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2">
                    <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
                </button>
                <h1 className="text-2xl font-bold text-white mb-2 text-center">役割（ロール）を選択</h1>
                <div className="grid gap-4 mt-6">
                    {ROLE_IDS.map((roleId) => {
                        const role = ROLES[roleId];
                        return (
                            <button
                                key={roleId}
                                onClick={() => {
                                    setSelectedRole(roleId);
                                    startQuiz('role_play', '', roleId);
                                }}
                                className={cn(
                                    "relative p-5 rounded-xl text-left transition-all active:scale-95 group tap-target border-2 flex items-start gap-4",
                                    role.bg, role.border, "hover:bg-opacity-30"
                                )}
                            >
                                <div className={cn("p-3 rounded-lg bg-black/20", role.color)}>
                                    <role.icon size={24} />
                                </div>
                                <div>
                                    <h3 className={cn("text-lg font-bold mb-1", role.color)}>{role.name}</h3>
                                    <p className="text-xs text-gray-300 leading-relaxed mb-2">{role.description}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 opacity-80">
                                        <Tag size={10} />
                                        <span>{role.focus}</span>
                                    </div>
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className={role.color} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (quizPhase === 'category_select') {
        // ... (Category Select View) ...
        const isAiMode = mode === 'ai_custom';
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2">
                    <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
                </button>
                <h1 className="text-2xl font-bold text-white mb-2 text-center">
                    {isAiMode ? "AI出題：分野を選択" : "分野を選択"}
                </h1>
                <p className="text-gray-400 text-xs text-center mb-8">
                    {isAiMode ? "AIがその分野の新作問題を作成します" : "各分野の正答率を確認して弱点を補強しましょう"}
                </p>

                {isAiMode && (
                    <div className="mb-6">
                        <button
                            onClick={() => startQuiz('ai_rank_match')}
                            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-600 p-5 text-left shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] tap-target border-2 border-yellow-400/30 group"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={80} className="text-yellow-300" /></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner text-yellow-100">
                                    <Swords size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-0.5 flex items-center gap-2">
                                        <span className="whitespace-nowrap">ランクマッチ</span>
                                        <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black whitespace-nowrap">XP獲得</span>
                                    </h3>
                                    <p className="text-orange-100 text-xs font-medium opacity-90">
                                        レベルに応じた難易度でランダム出題
                                    </p>
                                </div>
                                <div className="ml-auto w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                    <ArrowRight className="text-white w-5 h-5" />
                                </div>
                            </div>
                        </button>
                        <div className="my-6 flex items-center gap-4 before:h-px before:flex-1 before:bg-gray-700 after:h-px after:flex-1 after:bg-gray-700">
                            <span className="text-xs text-gray-500 font-bold">OR SELECT CATEGORY</span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat) => {
                        return (
                            <button
                                key={cat}
                                onClick={() => handleCategorySelect(cat)}
                                className={cn(
                                    "relative p-4 rounded-xl text-left transition-all active:scale-95 group tap-target border-2",
                                    "bg-gray-800/40 border-gray-700 hover:border-blue-500 hover:bg-gray-800"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={cn("text-sm font-bold block", "text-gray-300")}>
                                        {cat}
                                    </span>
                                </div>
                                {isAiMode && (
                                    <div className="text-xs text-gray-500 mt-2 font-medium">練習モード (XPなし)</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (quizPhase === 'subcategory_select') {
        // ... (Subcategory Select View) ...
        const config = CATEGORY_CONFIG[tempSelectedCategory];
        const subcategories = config?.subcategories || [];

        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
                <button
                    onClick={() => setQuizPhase('category_select')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2"
                >
                    <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
                </button>

                <h1 className="text-2xl font-bold text-white mb-2 text-center">{tempSelectedCategory}</h1>
                <p className="text-gray-400 text-xs text-center mb-8">重点的に学習したいトピックを選択してください</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => handleSubcategorySelect(null)}
                        className="p-4 rounded-xl text-left transition-all active:scale-95 border-2 bg-blue-900/20 border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/40 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Layers size={20} /></div>
                            <div>
                                <h3 className="text-sm font-bold text-white">この分野全体から出題</h3>
                                <p className="text-xs text-blue-200/70">ランダムにトピックを選定</p>
                            </div>
                        </div>
                    </button>

                    {subcategories.map((sub) => {
                        // ▼▼▼ 修正: 頻出タグの表示判定を追加 ▼▼▼
                        const isImportant = IMPORTANT_TOPICS.includes(sub);
                        return (
                            <button
                                key={sub}
                                onClick={() => handleSubcategorySelect(sub)}
                                className="p-4 rounded-xl text-left transition-all active:scale-95 border-2 bg-gray-800/40 border-gray-700 hover:border-gray-500 hover:bg-gray-800 group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-300 group-hover:text-white">{sub}</h3>
                                    {/* 頻出タグを表示 */}
                                    {isImportant && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                                            <TrendingDown size={10} className="rotate-180" />
                                            頻出
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (quizPhase === 'difficulty_select') {
        const difficulties = [
            { id: 'Easy', name: '初級 (Easy)', desc: '基本概念の確認に最適', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
            { id: 'Medium', name: '中級 (Medium)', desc: '実践的な応用力を養う', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
            { id: 'Hard', name: '上級 (Hard)', desc: '複雑な論点や高度な分析', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
        ];

        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
                <button
                    onClick={() => setQuizPhase('subcategory_select')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2"
                >
                    <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
                </button>

                <h1 className="text-2xl font-bold text-white mb-2 text-center">難易度を選択</h1>
                <p className="text-gray-400 text-xs text-center mb-8">
                    {tempSelectedCategory}{tempSelectedTopic ? ` > ${tempSelectedTopic}` : ''}
                </p>

                <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full">
                    {difficulties.map((diff) => (
                        <button
                            key={diff.id}
                            onClick={() => handleDifficultySelect(diff.id)}
                            className={cn(
                                "p-6 rounded-2xl text-left transition-all active:scale-95 border-2 group relative overflow-hidden",
                                "bg-gray-800/40 border-gray-700 hover:bg-gray-800",
                                `hover:${diff.border}`
                            )}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className={cn("text-lg font-bold mb-1", diff.color)}>{diff.name}</h3>
                                    <p className="text-xs text-gray-400">{diff.desc}</p>
                                </div>
                                <ArrowRight className="text-gray-600 group-hover:text-white transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 初期状態（ローディング中など）
    if (quizPhase === 'setup') return (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
            <p className="text-gray-400 text-sm">準備中...</p>
        </div>
    );

    if (quizPhase === 'finished') {
        return <div className="p-6 text-white text-center">終了</div>;
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (!currentQuestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
                <p className="text-gray-400 text-sm">問題を読み込んでいます...</p>
            </div>
        );
    }

    const roleInfo = currentQuestion.role ? ROLES[currentQuestion.role] : null;

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto px-4 md:px-8 animate-fade-in pb-24 md:pb-8 relative">
            {/* ... (Level Up/Down Notification) ... */}
            {levelUpData && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="animate-bounce bg-yellow-500 text-black px-8 py-4 rounded-2xl shadow-2xl border-4 border-white transform scale-110">
                        <h3 className="text-3xl font-black flex items-center gap-2">
                            <Trophy size={32} /> LEVEL UP!
                        </h3>
                        <p className="text-center font-bold text-lg mt-1">Lv.{levelUpData.level}</p>
                    </div>
                </div>
            )}

            {levelDownData && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="animate-pulse bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-red-400 transform scale-110">
                        <h3 className="text-3xl font-black flex items-center gap-2">
                            <TrendingDown size={32} /> RANK DOWN...
                        </h3>
                        <p className="text-center font-bold text-lg mt-1">Lv.{levelDownData.level}</p>
                    </div>
                </div>
            )}

            {/* ... (Quit Modal) ... */}
            {showQuitModal && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-24 animate-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowQuitModal(false)}
                    />

                    <div className="card glass-card p-6 w-full max-w-sm relative z-10 border-red-500/30 bg-gray-900/90 shadow-2xl transform transition-all scale-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-3 bg-red-500/10 rounded-full mb-4 border border-red-500/20">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">演習を終了しますか？</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                これまでの回答内容は保存され、<br />
                                現在の結果画面へ移動します。
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowQuitModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={confirmQuit}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 transition-all active:scale-95"
                                >
                                    終了する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 pt-4">
                {/* Header Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-700 px-1.5 py-0.5 rounded">
                        {mode === 'mock' ? 'MOCK' : mode === 'ai_rank_match' ? 'RANK' : mode === 'ai_custom' ? 'PRACTICE' : mode === 'role_play' ? 'ROLE' : 'QUIZ'}
                    </span>
                    {roleInfo && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", roleInfo.bg, roleInfo.border, roleInfo.color)}>
                            <roleInfo.icon size={10} /> {roleInfo.name}
                        </span>
                    )}
                    {currentQuestion.difficulty && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border",
                            currentQuestion.difficulty === 'Easy' ? "text-green-400 border-green-500/30 bg-green-500/10" :
                                currentQuestion.difficulty === 'Medium' ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                                    "text-red-400 border-red-500/30 bg-red-500/10"
                        )}>
                            {currentQuestion.difficulty}
                        </span>
                    )}
                    {currentQuestion.subcategory && (
                        <span className="text-[10px] font-bold text-blue-300 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Tag size={10} /> {currentQuestion.subcategory}
                        </span>
                    )}

                    {currentQuestion.isImportant && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-500/20 to-pink-600/20 text-rose-300 border border-rose-500/30 animate-pulse shadow-sm shadow-rose-500/10">
                            <TrendingDown size={10} className="rotate-180" />
                            ★頻出★
                        </span>
                    )}

                    {(currentQuestion.isCustom && currentQuestion.subcategory) && (
                        <button
                            onClick={handleBlockTopic}
                            className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full border border-red-500/30 transition-colors text-xs font-bold whitespace-nowrap"
                            title="この分野を今後出題しない（除外設定）"
                        >
                            <Ban size={14} />
                            <span className="hidden sm:inline">この分野を除外</span>
                            <span className="inline sm:hidden">除外</span>
                        </button>
                    )}
                </div>

                {/* Question Number & Timer */}
                <div className="flex items-center justify-between w-full">
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        Question {currentQuestionIndex + 1}
                        <span className="text-base font-normal text-gray-500">/ {(mode === 'ai_custom' || mode === 'role_play' || mode === 'ai_rank_match') ? '∞' : questions.length}</span>
                    </h1>

                    <div className="flex items-center gap-3">
                        <Timer isRunning={!isAnswered} onTick={setTimeTaken} />
                        <button
                            onClick={handleQuit}
                            className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-colors text-xs font-bold"
                        >
                            <StopCircle size={16} />
                            終了
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-6">
                <div className={cn("h-full transition-all duration-500 ease-out", mode === 'mock' ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "bg-gradient-to-r from-blue-500 to-purple-500")} style={{ width: (mode === 'ai_custom' || mode === 'role_play' || mode === 'ai_rank_match') ? '100%' : `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="flex-1 flex flex-col justify-start mb-4">
                <QuestionCard question={currentQuestion} selectedOption={selectedOption} onSelectOption={handleOptionSelect} isAnswered={isAnswered} correctIndex={currentQuestion.correctIndex} />

                {isAnswered && earnedExp !== 0 && !waitingForConfidence && (
                    <div className="mt-2 text-center animate-fade-in">
                        <span className={cn("text-sm font-bold px-3 py-1 rounded-full border", earnedExp > 0 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" : "text-red-400 bg-red-500/10 border-red-500/20")}>
                            {earnedExp > 0 ? `+${earnedExp}` : earnedExp} XP
                        </span>
                    </div>
                )}

                {isAnswered && (
                    <div className="mt-6 animate-slide-up">
                        <ExplanationChat
                            question={currentQuestion}
                            selectedOption={selectedOption}
                            correctIndex={currentQuestion.correctIndex}
                            isCorrect={selectedOption === currentQuestion.correctIndex}
                            onChatUpdate={handleChatUpdate}
                        />
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 z-40 md:relative md:bg-transparent md:border-0 md:p-0 md:mt-6 pb-safe">
                <div className="max-w-4xl mx-auto flex justify-end gap-3">
                    {!isAnswered ? (
                        <>
                            <button
                                className="btn px-5 py-3.5 rounded-xl font-bold bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                                onClick={handleGiveUp}
                            >
                                <HelpCircle size={20} />
                                <span className="text-sm">わからない</span>
                            </button>
                            <button
                                className={cn("btn flex-1 md:flex-none px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg text-base", selectedOption !== null ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25" : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700")}
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                            >
                                回答する
                            </button>
                        </>
                    ) : waitingForConfidence ? (
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="hidden md:flex items-center text-xs text-gray-400 mr-2 font-bold">自信度は？</div>
                            <button onClick={() => processResult(SRS_RATINGS.HARD)} className="flex-1 md:flex-none btn bg-yellow-600/80 hover:bg-yellow-600 text-white px-4 py-3 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[80px] transition-transform active:scale-95">
                                <AlertOctagon size={18} />
                                <span className="text-[10px] font-bold">難しい</span>
                            </button>
                            <button onClick={() => processResult(SRS_RATINGS.GOOD)} className="flex-1 md:flex-none btn bg-green-600/80 hover:bg-green-600 text-white px-4 py-3 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[80px] transition-transform active:scale-95">
                                <ThumbsUp size={18} />
                                <span className="text-[10px] font-bold">普通</span>
                            </button>
                            <button onClick={() => processResult(SRS_RATINGS.EASY)} className="flex-1 md:flex-none btn bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-3 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[80px] transition-transform active:scale-95">
                                <Sparkles size={18} />
                                <span className="text-[10px] font-bold">簡単</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={(mode === 'ai_custom' || mode === 'role_play' || mode === 'ai_rank_match') && isGenerating}
                            className="btn w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-900 hover:bg-gray-100 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-white/10 text-base disabled:opacity-70 disabled:cursor-wait"
                        >
                            {(mode === 'ai_custom' || mode === 'role_play' || mode === 'ai_rank_match') ? '次の問題へ' : (currentQuestionIndex < questions.length - 1 ? '次へ進む' : '結果を見る')} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}