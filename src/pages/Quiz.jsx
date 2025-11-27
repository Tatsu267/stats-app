import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CheckCircle, XCircle, BarChart3, PlayCircle, AlertCircle, Dices, ArrowLeft, Trophy, AlertTriangle, ClipboardList } from 'lucide-react';
import questionsData from '../data/questions.json';
import QuestionCard from '../components/quiz/QuestionCard';
import ExplanationChat from '../components/quiz/ExplanationChat'; // 新規追加
import Timer from '../components/quiz/Timer';
import { calculateNewScore } from '../utils/scoring';
import { db, addScore, addAttempt, getLatestScore } from '../services/db';
import { cn } from '../utils/cn';
import { CATEGORY_NAMES, CATEGORY_CONFIG } from '../utils/categories';

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
  const [noticeMessage, setNoticeMessage] = useState(null);

  const categories = CATEGORY_NAMES;
  const allAttempts = useLiveQuery(() => db.attempts.toArray(), []);

  // カテゴリごとの正答率マップ
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
        if (initialMode === 'category_select') {
            setMode('category');
            setQuizPhase('category_select');
            return;
        }
        setMode(initialMode);
        if (category) setSelectedCategory(category);
        if (start) startQuiz(initialMode, category);
    }
  }, [location.state]);

  const startQuiz = async (targetMode = mode, targetCategory = selectedCategory) => {
    if (noticeMessage) return;

    let filteredQuestions = [...questionsData];
    let attempts = [];

    if (targetMode === 'mock') {
        filteredQuestions = [...questionsData];
    }
    else if (targetMode === 'weakness') {
        attempts = await db.attempts.toArray();
        const wrongQuestionIds = new Set(
            attempts.filter(a => !a.isCorrect).map(a => a.questionId)
        );
        filteredQuestions = filteredQuestions.filter(q => wrongQuestionIds.has(q.id));
    } 
    else if (targetMode === 'review') {
        attempts = await db.attempts.toArray();
        const attemptedIds = new Set(attempts.map(a => a.questionId));
        filteredQuestions = filteredQuestions.filter(q => attemptedIds.has(q.id));
        if (targetCategory) {
            filteredQuestions = filteredQuestions.filter(q => q.category === targetCategory);
        }
    }
    else if (targetMode === 'category' && targetCategory) {
        filteredQuestions = filteredQuestions.filter(q => q.category === targetCategory);
    }

    if (filteredQuestions.length === 0) {
      const msg = targetMode === 'weakness' 
        ? '間違えた問題はまだありません。素晴らしい！' 
        : targetMode === 'review'
        ? '復習対象の問題がありません。'
        : 'このカテゴリの問題は見つかりませんでした。';
      
      setNoticeMessage({ title: "該当なし", text: msg, type: "success" });
      setQuizPhase('notice');
      return;
    }

    let selected = filteredQuestions.sort(() => 0.5 - Math.random());
    if (targetMode === 'random') {
        selected = selected.slice(0, 5);
    } 

    setQuestions(selected);
    setQuizPhase('playing');
    setCurrentQuestionIndex(0);
    setTimeTaken(0);
    setNoticeMessage(null);
  };

  const handleOptionSelect = (index) => {
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (selectedOption === null) return;

    const question = questions[currentQuestionIndex];
    const isCorrect = selectedOption === question.correctIndex;

    setIsAnswered(true);

    const newScore = calculateNewScore(currentScore, isCorrect, question.difficulty, timeTaken);
    setCurrentScore(newScore);

    await addAttempt(question.id, isCorrect, timeTaken);
    await addScore(newScore);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeTaken(0);
    } else {
      setQuizPhase('finished');
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  // --- NOTICE PHASE ---
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
                <button 
                    onClick={() => navigate('/')}
                    className="btn w-full bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
                >
                    ダッシュボードに戻る
                </button>
            </div>
        </div>
    );
  }

  // --- CATEGORY SELECT PHASE ---
  if (quizPhase === 'category_select') {
      return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col animate-fade-in pb-24 pt-6">
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 w-fit p-2 -ml-2"
            >
                <ArrowLeft size={20} /> <span className="font-bold text-sm">戻る</span>
            </button>

            <h1 className="text-2xl font-bold text-white mb-2 text-center">分野を選択</h1>
            <p className="text-gray-400 text-xs text-center mb-8">各分野の正答率を確認して弱点を補強しましょう</p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                  const stat = categoryStats[cat] || { correct: 0, total: 0 };
                  const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  const isWeak = stat.total > 0 && accuracy < 60;
                  const isPlayed = stat.total > 0;
                  const config = CATEGORY_CONFIG[cat];

                  return (
                    <button
                      key={cat}
                      onClick={() => startQuiz('category', cat)}
                      className={cn(
                          "relative p-4 rounded-xl text-left transition-all active:scale-95 group tap-target border-2",
                          isWeak 
                            ? "bg-red-900/20 border-red-500/50 hover:bg-red-900/30" 
                            : "bg-gray-800/60 border-gray-700 hover:border-blue-500 hover:bg-blue-900/20"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                          <span className={cn("text-sm font-bold block", isWeak ? "text-red-200" : config?.color || "text-gray-200")}>
                            {cat}
                          </span>
                          {isWeak && <AlertTriangle size={14} className="text-red-400" />}
                      </div>
                      
                      <div className="flex items-end gap-1">
                          <span className={cn("text-2xl font-black leading-none", 
                              !isPlayed ? "text-gray-600" : isWeak ? "text-red-400" : "text-blue-400"
                          )}>
                              {isPlayed ? accuracy : '-'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold mb-0.5">%</span>
                      </div>
                      
                      {isPlayed && (
                          <div className="w-full h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                              <div 
                                  className={cn("h-full rounded-full", isWeak ? "bg-red-500" : "bg-blue-500")} 
                                  style={{ width: `${accuracy}%` }} 
                              />
                          </div>
                      )}
                    </button>
                  );
              })}
            </div>
        </div>
      );
  }

  // --- SETUP PHASE ---
  if (quizPhase === 'setup') {
    return <div className="p-6 md:p-8 animate-fade-in" />;
  }

  // --- FINISHED PHASE ---
  if (quizPhase === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 md:p-8 text-white animate-fade-in pb-24">
        <div className="card glass-card p-8 md:p-10 text-center max-w-lg w-full">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-green-500/20 rounded-full text-green-400 border border-green-500/30">
              <CheckCircle size={48} />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">演習完了！</h1>
          <p className="text-gray-400 mb-8">お疲れ様でした。スコアが更新されました。</p>

          <div className="bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-700/50">
            <p className="text-sm text-gray-500 mb-1 font-medium">現在のスコア</p>
            <p className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{currentScore}</p>
          </div>

          <button
            onClick={handleFinish}
            className="btn w-full px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING PHASE ---
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 md:px-8 animate-fade-in pb-24 md:pb-8">
      {/* Header, Timer, Progress Bar (Same as before) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {mode === 'mock' ? 'MOCK EXAM' : 'PRACTICE'}
             </span>
             {mode === 'mock' && (
                 <span className="text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded">
                    本番形式
                 </span>
             )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            Question {currentQuestionIndex + 1}
            <span className="text-base font-normal text-gray-500">/ {questions.length}</span>
          </h1>
        </div>
        <Timer isRunning={!isAnswered} onTick={setTimeTaken} />
      </div>

      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-6">
        <div
          className={cn(
              "h-full transition-all duration-500 ease-out",
              mode === 'mock' ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "bg-gradient-to-r from-blue-500 to-purple-500"
          )}
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-start mb-4">
        <QuestionCard
          question={currentQuestion}
          selectedOption={selectedOption}
          onSelectOption={handleOptionSelect}
          isAnswered={isAnswered}
          correctIndex={currentQuestion.correctIndex}
        />

        {isAnswered && (
          <div className="mt-6 animate-slide-up">
            {/* ここで新しい ExplanationChat コンポーネントを使用 */}
            <ExplanationChat 
                question={currentQuestion}
                selectedOption={selectedOption}
                correctIndex={currentQuestion.correctIndex}
                isCorrect={selectedOption === currentQuestion.correctIndex}
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 z-40 md:relative md:bg-transparent md:border-0 md:p-0 md:mt-6 pb-safe">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          {!isAnswered ? (
            <button
              className={cn(
                "btn w-full md:w-auto px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg text-base",
                selectedOption !== null
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
              )}
              onClick={handleSubmit}
              disabled={selectedOption === null}
            >
              回答する
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-900 hover:bg-gray-100 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-white/10 text-base"
            >
              次へ進む <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}