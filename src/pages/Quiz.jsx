import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CheckCircle, XCircle, Loader2, Sparkles, ArrowLeft, AlertTriangle, Tag, AlertCircle, StopCircle } from 'lucide-react';
import questionsData from '../data/questions.json';
import QuestionCard from '../components/quiz/QuestionCard';
import ExplanationChat from '../components/quiz/ExplanationChat';
import Timer from '../components/quiz/Timer';
import { calculateNewScore } from '../utils/scoring';
import { db, addScore, addAttempt, getLatestScore, addCustomQuestion, getLearningState, updateLearningState, getDueReviewQuestionIds } from '../services/db';
import { calculateNextReview } from '../utils/srs';
import { generateAiQuestion, generateRolePlayQuestion } from '../services/ai';
import { cn } from '../utils/cn';
import { CATEGORY_NAMES, CATEGORY_CONFIG } from '../utils/categories';
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
  const [timeTaken, setTimeTaken] = useState(0);
  const [currentScore, setCurrentScore] = useState(40);

  const [mode, setMode] = useState('random');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [noticeMessage, setNoticeMessage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [sessionData, setSessionData] = useState([]);
  const currentChatLog = useRef([]);

  const categories = CATEGORY_NAMES;
  const allAttempts = useLiveQuery(() => db.attempts.toArray(), []);

  const categoryStats = React.useMemo(() => {
      if (!allAttempts) return {};
      const stats = {};
      categories.forEach(cat => { stats[cat] = { correct: 0, total: 0 }; });
      allAttempts.forEach(attempt => {
          const q = questionsData.find(q => q.id === attempt.questionId); 
          if (q && stats[q.category]) {
              stats[q.category].total++;
              if (attempt.isCorrect) stats[q.category].correct++;
          }
      });
      return stats;
  }, [allAttempts]);

  useEffect(() => {
    getLatestScore().then(score => setCurrentScore(score));

    if (location.state) {
        const { mode: initialMode, category, start } = location.state;
        if (initialMode === 'role_play_select') {
            setMode('role_play');
            setQuizPhase('role_select');
            return;
        }
        if (initialMode === 'category_select') {
            setMode('category');
            setQuizPhase('category_select');
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

  const fetchNextAiQuestion = async (categoryOrRole) => {
      setIsGenerating(true);
      try {
          let newQuestion;
          if (mode === 'role_play') {
              newQuestion = await generateRolePlayQuestion(categoryOrRole);
          } else {
              newQuestion = await generateAiQuestion(categoryOrRole);
          }
          
          const id = await addCustomQuestion(newQuestion);
          newQuestion.id = `${CUSTOM_PREFIX}${id}`;
          newQuestion.isCustom = true;
          return newQuestion;
      } catch (error) {
          console.error(error);
          throw error;
      } finally {
          setIsGenerating(false);
      }
  };

  const startQuiz = async (targetMode = mode, targetCategory = selectedCategory, targetRole = selectedRole) => {
    if (noticeMessage) return;

    const scrollContainer = document.querySelector('main');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });

    setSessionData([]);

    if (targetMode === 'ai_custom' || targetMode === 'role_play') {
        try {
            const param = targetMode === 'role_play' ? targetRole : targetCategory;
            const q = await fetchNextAiQuestion(param);
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

    if (targetMode === 'mock') {
        filteredQuestions = [...allQuestions];
    }
    else if (targetMode === 'weakness') {
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
    else if (targetMode === 'category' && targetCategory) {
        filteredQuestions = filteredQuestions.filter(q => q.category === targetCategory);
    }

    if (filteredQuestions.length === 0) {
      const msg = targetMode === 'weakness' ? '間違えた問題はまだありません。' : targetMode === 'review' ? '復習対象の問題がありません。' : 'このカテゴリの問題は見つかりませんでした。';
      setNoticeMessage({ title: "該当なし", text: msg, type: "success" });
      setQuizPhase('notice');
      return;
    }

    let selected = filteredQuestions.sort(() => 0.5 - Math.random());
    if (targetMode === 'random') selected = selected.slice(0, 5);

    setQuestions(selected);
    setQuizPhase('playing');
    setCurrentQuestionIndex(0);
    setTimeTaken(0);
    setNoticeMessage(null);
  };

  const handleOptionSelect = (index) => { setSelectedOption(index); };
  const handleChatUpdate = (messages) => { currentChatLog.current = messages; };

  const handleSubmit = async () => {
    if (selectedOption === null) return;
    const question = questions[currentQuestionIndex];
    if (!question) return;

    const isCorrect = selectedOption === question.correctIndex;
    setIsAnswered(true);
    
    const newScore = calculateNewScore(currentScore, isCorrect, question.difficulty, timeTaken);
    setCurrentScore(newScore);
    
    await addAttempt(question.id, isCorrect, timeTaken, []);
    await addScore(newScore);

    const currentState = await getLearningState(question.id);
    const nextState = calculateNextReview(currentState, isCorrect);
    await updateLearningState(question.id, nextState);

    setSessionData(prev => [...prev, { question, isCorrect, timeTaken, chatLog: [] }]);
    currentChatLog.current = []; 
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

    const scrollContainer = document.querySelector('main');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });

    if (mode === 'ai_custom' || mode === 'role_play') {
        setSelectedOption(null);
        setIsAnswered(false);
        setTimeTaken(0);
        try {
            const param = mode === 'role_play' ? selectedRole : selectedCategory;
            const nextQ = await fetchNextAiQuestion(param);
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
      setTimeTaken(0);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
      await saveCurrentChatLog(); 
      navigate('/result', { state: { sessionData } });
  };

  const handleQuit = async () => {
      if (window.confirm("演習を終了して結果を見ますか？")) {
          finishSession();
      }
  };

  const handleFinish = () => { navigate('/'); };

  if (isGenerating && questions.length === 0) {
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
      return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2">
                <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
            </button>
            <h1 className="text-2xl font-bold text-white mb-2 text-center">役割（ロール）を選択</h1>
            <p className="text-gray-400 text-xs text-center mb-8">
                実務で直面する課題を解決しながら学習しましょう
            </p>
            <div className="grid gap-4">
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
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                  const stat = categoryStats[cat] || { correct: 0, total: 0 };
                  const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  const isWeak = stat.total > 0 && accuracy < 60;
                  const config = CATEGORY_CONFIG[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => startQuiz(mode, cat)}
                      className={cn(
                          "relative p-4 rounded-xl text-left transition-all active:scale-95 group tap-target border-2",
                          isAiMode 
                            ? "bg-amber-900/20 border-amber-500/30 hover:border-amber-400 hover:bg-amber-900/30"
                            : isWeak 
                                ? "bg-red-900/20 border-red-500/50 hover:bg-red-900/30" 
                                : "bg-gray-800/60 border-gray-700 hover:border-blue-500 hover:bg-blue-900/20"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                          <span className={cn("text-sm font-bold block", isAiMode ? "text-amber-200" : isWeak ? "text-red-200" : config?.color || "text-gray-200")}>
                            {cat}
                          </span>
                          {isAiMode && <Sparkles size={14} className="text-amber-400" />}
                          {!isAiMode && isWeak && <AlertTriangle size={14} className="text-red-400" />}
                      </div>
                      {!isAiMode && (
                          <>
                            <div className="flex items-end gap-1">
                                <span className={cn("text-2xl font-black leading-none", stat.total > 0 ? (isWeak ? "text-red-400" : "text-blue-400") : "text-gray-600")}>
                                    {stat.total > 0 ? accuracy : '-'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold mb-0.5">%</span>
                            </div>
                            {stat.total > 0 && (
                                <div className="w-full h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div className={cn("h-full rounded-full", isWeak ? "bg-red-500" : "bg-blue-500")} style={{ width: `${accuracy}%` }} />
                                </div>
                            )}
                          </>
                      )}
                      {isAiMode && (
                          <div className="text-xs text-amber-500/70 mt-2 font-medium">生成スタート &rarr;</div>
                      )}
                    </button>
                  );
              })}
            </div>
        </div>
      );
  }

  if (quizPhase === 'setup') return <div className="p-6 md:p-8 animate-fade-in" />;
  
  // FINISHED PHASE
  if (quizPhase === 'finished') {
      // 結果画面へ直接遷移させるので、ここは到達しない想定だが念のため
      return <div className="p-6 text-white text-center">終了</div>; 
  }

  // --- PLAYING PHASE ---
  const currentQuestion = questions[currentQuestionIndex];

  // ▼▼▼ 修正: ガード処理（Undefined Error防止） ▼▼▼
  if (!currentQuestion) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <Loader2 className="animate-spin text-blue-400 mb-4" size={32} />
            <p className="text-gray-400 text-sm">問題を読み込んでいます...</p>
        </div>
      );
  }
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // ロール情報の取得
  const roleInfo = currentQuestion.role ? ROLES[currentQuestion.role] : null;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 md:px-8 animate-fade-in pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pt-4">
        <div className="flex items-center justify-between w-full">
            <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-700 px-1.5 py-0.5 rounded">
                        {mode === 'mock' ? 'MOCK' : mode === 'ai_custom' ? 'AI' : mode === 'role_play' ? 'ROLE' : 'PRACTICE'}
                    </span>
                     {/* ロールタグ */}
                     {roleInfo && (
                         <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", roleInfo.bg, roleInfo.border, roleInfo.color)}>
                            <roleInfo.icon size={10} /> {roleInfo.name}
                         </span>
                     )}
                     {/* 難易度タグ */}
                     {currentQuestion.difficulty && (
                         <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", 
                            currentQuestion.difficulty === 'Easy' ? "text-green-400 border-green-500/30 bg-green-500/10" :
                            currentQuestion.difficulty === 'Medium' ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                            "text-red-400 border-red-500/30 bg-red-500/10"
                         )}>
                            {currentQuestion.difficulty}
                         </span>
                     )}
                     {/* サブカテゴリタグ */}
                     {currentQuestion.subcategory && (
                        <span className="text-[10px] font-bold text-blue-300 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                           <Tag size={10} /> {currentQuestion.subcategory}
                        </span>
                    )}
                    {currentQuestion.isCustom && <span className="text-[10px] font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>}
                </div>
                
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    Question {currentQuestionIndex + 1}
                    <span className="text-base font-normal text-gray-500">/ {mode === 'ai_custom' || mode === 'role_play' ? '∞' : questions.length}</span>
                </h1>
            </div>
            
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
    {/* ... (以下省略せず、既存のコードのまま) ... */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-6">
        <div className={cn("h-full transition-all duration-500 ease-out", mode === 'mock' ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "bg-gradient-to-r from-blue-500 to-purple-500")} style={{ width: (mode === 'ai_custom' || mode === 'role_play') ? '100%' : `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col justify-start mb-4">
        <QuestionCard question={currentQuestion} selectedOption={selectedOption} onSelectOption={handleOptionSelect} isAnswered={isAnswered} correctIndex={currentQuestion.correctIndex} />
        
        {isAnswered && isGenerating && (mode === 'ai_custom' || mode === 'role_play') && (
            <div className="mt-4 flex items-center justify-center gap-2 text-amber-400 text-sm animate-pulse">
                <Loader2 className="animate-spin" size={16} /> 次の問題を作成中...
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
            <button className={cn("btn w-full md:w-auto px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg text-base", selectedOption !== null ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25" : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700")} onClick={handleSubmit} disabled={selectedOption === null}>回答する</button>
          ) : (
            <button 
                onClick={handleNext} 
                disabled={(mode === 'ai_custom' || mode === 'role_play') && isGenerating}
                className="btn w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-900 hover:bg-gray-100 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-white/10 text-base disabled:opacity-70 disabled:cursor-wait"
            >
                {(mode === 'ai_custom' || mode === 'role_play') ? '次の問題へ' : (currentQuestionIndex < questions.length - 1 ? '次へ進む' : '結果を見る')} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}