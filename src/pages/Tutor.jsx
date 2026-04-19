import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Bot, GraduationCap, Loader2, Send, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { getAttempts, getTutorMemory, saveTutorMemory } from '../services/db';
import { sendTutorMessage, updateTutorMemoryFromConversation } from '../services/ai';
import { cn } from '../utils/cn';

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0 text-gray-200">{children}</p>,
  strong: ({ ...props }) => (
    <strong className="font-bold text-amber-200/90 border-b border-amber-500/30 pb-0.5 mx-0.5" {...props} />
  ),
  ul: ({ ...props }) => <ul className="my-3 pl-3 border-l-2 border-gray-600/50 space-y-1" {...props} />,
  li: ({ children, ...props }) => (
    <li className="pl-3 py-0.5 text-sm leading-relaxed relative group" {...props}>
      <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-blue-400/60 group-hover:bg-blue-400 transition-colors" />
      <div className="text-gray-300">{children}</div>
    </li>
  ),
  code: ({ inline, children, ...props }) =>
    inline ? (
      <code className="bg-gray-700/50 px-1 py-0.5 rounded text-xs font-mono text-pink-300 border border-gray-600/30" {...props}>
        {children}
      </code>
    ) : (
      <div className="my-2 p-3 bg-[#1E293B] rounded-lg border border-gray-700 font-mono text-xs overflow-x-auto shadow-inner">
        <code className="text-gray-300" {...props}>{children}</code>
      </div>
    ),
};

function buildSystemContext(tutorMemory, attempts) {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { tutorMemory, totalAttempts: total, accuracy };
}

const GREETING = `こんにちは！統計検定準1級の専属家庭教師です。\n\n何でも聞いてください。苦手な分野の質問、概念の説明、今日やること相談など、気軽に話しかけてください。`;

export default function Tutor() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{ role: 'model', text: GREETING }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemContext, setSystemContext] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [mem, attempts] = await Promise.all([getTutorMemory(), getAttempts()]);
      setSystemContext(buildSystemContext(mem, attempts));
    })();
  }, []);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const saveMemory = useCallback(async (msgs) => {
    if (!systemContext || msgs.length <= 1) return;
    try {
      const current = systemContext.tutorMemory;
      const updated = await updateTutorMemoryFromConversation(current, msgs);
      await saveTutorMemory(updated);
    } catch (err) {
      console.warn('tutorMemory update failed', err);
    }
  }, [systemContext]);

  useEffect(() => {
    return () => {
      setMessages((prev) => {
        saveMemory(prev);
        return prev;
      });
    };
  }, [saveMemory]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !systemContext) return;
    setInput('');

    const userMsg = { role: 'user', text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setIsLoading(true);

    try {
      const apiHistory = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const reply = await sendTutorMessage(apiHistory, text, systemContext);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'model', text: `エラー: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-2xl mx-auto">
      <header className="flex-none flex items-center gap-3 px-4 pt-6 pb-3 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg">
            <GraduationCap className="text-indigo-400" size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">AIパーソナル家庭教師</h1>
            <p className="text-xs text-gray-500">統計検定準1級専属</p>
          </div>
        </div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-gradient-to-b from-gray-900 to-gray-900/80"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn('flex gap-3 w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={cn(
                'px-4 py-3 rounded-2xl shadow-md text-sm leading-relaxed overflow-hidden',
                msg.role === 'user'
                  ? 'bg-gray-700 text-white rounded-tr-sm max-w-[80%]'
                  : 'bg-gray-800/90 border border-gray-700/50 text-gray-100 rounded-tl-sm flex-1 min-w-0',
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false }]]}
                components={markdownComponents}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
                <User size={16} className="text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-800/80 border border-gray-700/50 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 className="animate-spin text-indigo-400" size={16} />
              <span className="text-sm text-gray-400">考えています...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} className="h-1" />
      </div>

      <div className="flex-none px-4 py-3 border-t border-gray-800 bg-gray-900/95 pb-safe">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問や相談を入力（Shift+Enterで改行）"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={isLoading || !systemContext}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none placeholder-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !systemContext}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex-shrink-0 h-12 w-12 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
