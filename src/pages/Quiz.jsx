
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle, XCircle, BrainCircuit, Loader2, BarChart3, PlayCircle } from 'lucide-react';
import questionsData from '../data/questions.json';
import QuestionCard from '../components/quiz/QuestionCard';
import Timer from '../components/quiz/Timer';
import { calculateNewScore } from '../utils/scoring';
import { db, addScore, addAttempt, getLatestScore } from '../services/db';
import { getExplanation } from '../services/ai';
import { cn } from '../utils/cn';

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  // Quiz State
  const [quizPhase, setQuizPhase] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [currentScore, setCurrentScore] = useState(40);

  // Setup State
  const [mode, setMode] = useState('random');
  const [selectedCategory, setSelectedCategory] = useState('');

  // AI State
  const [explanation, setExplanation] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const categories = [
    '確率分布', '推測統計', '多変量解析', '実験計画', 'ノンパラ', '線形モデル'
  ];

  useEffect(() => {
    getLatestScore().then(score => setCurrentScore(score));

    if (location.state?.start) {
      const { mode: initialMode, category } = location.state;
      setMode(initialMode);
      if (category) {
        setSelectedCategory(category);
        startQuiz(initialMode, category);
      } else {
        startQuiz(initialMode);
      }
    }
  }, [location.state]);

  const startQuiz = (targetMode = mode, targetCategory = selectedCategory) => {
    let filteredQuestions = [...questionsData];

    if (targetMode === 'category' && targetCategory) {
      filteredQuestions = filteredQuestions.filter(q => q.category === targetCategory);
    }

    const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    if (selected.length === 0) {
      alert('No questions found for this category.');
      return;
    }

    setQuestions(selected);
    setQuizPhase('playing');
    setCurrentQuestionIndex(0);
    setTimeTaken(0);
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
      setExplanation(null);
      setAiError(null);
    } else {
      setQuizPhase('finished');
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  const handleAskAI = async () => {
    setIsLoadingAI(true);
    setAiError(null);
    try {
      const question = questions[currentQuestionIndex];
      const text = await getExplanation(question, selectedOption, question.correctIndex);
      setExplanation(text);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // SETUP PHASE
  if (quizPhase === 'setup') {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto h-full flex flex-col justify-center animate-fade-in relative pt-16">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-gray-800 bg-gray-900/50 backdrop-blur-sm border border-gray-700 tap-target"
        >
          <ArrowRight className="rotate-180" size={18} />
          <span className="text-sm md:text-base">ダッシュボードに戻る</span>
        </button>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4 text-center">演習設定</h1>
        <p className="text-gray-400 text-center mb-8 md:mb-12 text-base md:text-lg">出題モードを選択してください</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          {/* Random Mode Card */}
          <button
            onClick={() => setMode('random')}
            className={`card p-6 md:p-8 rounded-2xl border-2 transition-all active:scale-95 duration-200 text-left tap-target ${mode === 'random'
              ? 'bg-blue-600/20 border-blue-500 shadow-xl shadow-blue-500/20'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-800/70 hover:border-gray-600'
              }`}
          >
            <div className="flex items-center gap-4 mb-4 md:mb-6">
              <div className={`p-3 md:p-4 rounded-2xl ${mode === 'random' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <BrainCircuit size={28} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white">ランダム出題</h3>
            </div>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              全範囲からランダムに5問出題されます。<br />実力試しに最適です。
            </p>
          </button>

          {/* Category Mode Card */}
          <button
            onClick={() => setMode('category')}
            className={`card p-6 md:p-8 rounded-2xl border-2 transition-all active:scale-95 duration-200 text-left tap-target ${mode === 'category'
              ? 'bg-purple-600/20 border-purple-500 shadow-xl shadow-purple-500/20'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-800/70 hover:border-gray-600'
              }`}
          >
            <div className="flex items-center gap-4 mb-4 md:mb-6">
              <div className={`p-3 md:p-4 rounded-2xl ${mode === 'category' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <BarChart3 size={28} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white">分野別出題</h3>
            </div>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              特定の分野に絞って重点的に学習します。<br />弱点克服におすすめです。
            </p>
          </button>
        </div>

        {/* Category Selection */}
        {mode === 'category' && (
          <div className="mb-8 md:mb-12 animate-fade-in">
            <label className="block text-base md:text-lg font-bold text-gray-300 mb-4 ml-1">分野を選択</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-3 md:px-6 md:py-4 rounded-xl text-sm md:text-base font-bold transition-all active:scale-95 border-2 tap-target ${selectedCategory === cat
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center pb-safe">
          <button
            onClick={() => startQuiz()}
            disabled={mode === 'category' && !selectedCategory}
            className="btn btn-primary flex items-center gap-3 px-8 md:px-12 py-4 md:py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold text-lg md:text-xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <PlayCircle size={24} />
            演習を開始する
          </button>
        </div>
      </div>
    );
  }

  // FINISHED PHASE
  if (quizPhase === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 md:p-8 text-white animate-fade-in">
        <div className="card glass-card p-8 md:p-10 text-center max-w-lg w-full">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-green-500/20 rounded-full text-green-400">
              <CheckCircle size={48} />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">演習完了！</h1>
          <p className="text-gray-400 mb-8">お疲れ様でした。スコアが更新されました。</p>

          <div className="bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-700/50">
            <p className="text-sm text-gray-500 mb-1">現在のスコア</p>
            <p className="text-4xl md:text-5xl font-bold text-blue-400">{currentScore}</p>
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

  // PLAYING PHASE
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 md:px-8 animate-fade-in pb-24 md:pb-8">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-6 mt-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Question {currentQuestionIndex + 1}{' '}
            <span className="text-base md:text-lg text-gray-500">/ {questions.length}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 md:px-3 py-1 bg-gray-700 rounded text-xs md:text-sm text-gray-300 border border-gray-600 font-medium">
              {currentQuestion.category}
            </span>
            <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm border font-medium ${currentQuestion.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400 border-green-800' :
                currentQuestion.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                  'bg-red-900/30 text-red-400 border-red-800'
              }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
        </div>
        <Timer isRunning={!isAnswered} onTick={setTimeTaken} />
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-start mb-4">
        <QuestionCard
          question={currentQuestion}
          selectedOption={selectedOption}
          onSelectOption={handleOptionSelect}
          isAnswered={isAnswered}
          correctIndex={currentQuestion.correctIndex}
        />

        {/* AI Explanation */}
        {isAnswered && (
          <div className="mt-6 card bg-gray-800 p-4 md:p-6 animate-fade-in border border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              {selectedOption === currentQuestion.correctIndex ? (
                <div className="flex items-center gap-2 text-green-400 font-bold text-base md:text-lg">
                  <CheckCircle size={20} /> 正解！
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 font-bold text-base md:text-lg">
                  <XCircle size={20} /> 不正解...
                </div>
              )}
            </div>

            {explanation && (
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600 text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <BrainCircuit size={16} /> AI解説
                </h3>
                {explanation}
              </div>
            )}

            {aiError && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg text-sm">
                {aiError}
              </div>
            )}

            {!explanation && !isAnswered && (
              <button
                className="btn flex items-center gap-2 px-4 md:px-6 py-3 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg font-medium transition-all active:scale-95 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAskAI}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                <span className="text-sm md:text-base">{isLoadingAI ? '考え中...' : 'AIに解説を聞く'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A]/98 backdrop-blur-lg border-t border-gray-800 z-40 md:relative md:bg-transparent md:border-0 md:p-0 md:mt-6 pb-safe">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          {!isAnswered && !explanation && (
            <button
              className={cn(
                "btn w-full md:w-auto px-6 md:px-8 py-3.5 md:py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg text-base md:text-lg",
                selectedOption !== null
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
              )}
              onClick={handleSubmit}
              disabled={selectedOption === null}
            >
              回答する
            </button>
          )}

          {isAnswered && (
            <button
              onClick={handleNext}
              className="btn btn-primary w-full md:w-auto flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20 text-base md:text-lg"
            >
              次の問題へ <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
