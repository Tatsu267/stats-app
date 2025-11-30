import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, User, BrainCircuit, Loader2, Bot, Maximize2, Minimize2 } from 'lucide-react'; 
import { getInitialExplanation, sendChatMessage } from '../../services/ai';
import { cn } from '../../utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const markdownComponents = {
    p: ({node, children}) => <p className="mb-3 leading-relaxed last:mb-0 text-gray-200">{children}</p>,
    strong: ({node, ...props}) => (
        <strong className="font-bold text-amber-200/90 border-b border-amber-500/30 pb-0.5 mx-1" {...props} />
    ),
    ul: ({node, ...props}) => (
        <ul className="my-3 pl-3 border-l-2 border-gray-600/50 space-y-1" {...props} />
    ),
    li: ({node, children, ...props}) => (
        <li className="pl-3 py-0.5 text-sm leading-relaxed relative group" {...props}>
            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-blue-400/60 group-hover:bg-blue-400 transition-colors"></span>
            <div className="text-gray-300">{children}</div>
        </li>
    ),
    table: ({node, ...props}) => (
        <div className="overflow-x-auto my-3 rounded-lg border border-gray-700 bg-gray-900/30">
            <table className="w-full text-left border-collapse text-xs md:text-sm" {...props} />
        </div>
    ),
    thead: ({node, ...props}) => <thead className="bg-gray-800 text-gray-200" {...props} />,
    tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-700/50" {...props} />,
    tr: ({node, ...props}) => <tr className="last:border-0" {...props} />,
    th: ({node, ...props}) => <th className="p-2 font-semibold border-r border-gray-700 last:border-0 whitespace-nowrap text-gray-400" {...props} />,
    td: ({node, ...props}) => <td className="p-2 border-r border-gray-700 last:border-0 text-gray-300" {...props} />,
    code: ({node, inline, className, children, ...props}) => {
        return inline ? (
            <code className="bg-gray-700/50 px-1 py-0.5 rounded text-xs font-mono text-pink-300 border border-gray-600/30" {...props}>
                {children}
            </code>
        ) : (
            <div className="my-2 p-3 bg-[#1E293B] rounded-lg border border-gray-700 font-mono text-xs overflow-x-auto shadow-inner">
                <code className="text-gray-300" {...props}>{children}</code>
            </div>
        );
    }
};

export default function ExplanationChat({ question, selectedOption, correctIndex, isCorrect, onChatUpdate }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);
    
    // ▼▼▼ 修正: 参照用のRefを追加 ▼▼▼
    const chatListRef = useRef(null); // スクロールするコンテナ
    const messageRefs = useRef({}); // 各メッセージ要素

    useEffect(() => {
        const lastIdx = messages.length - 1;
        
        if (lastIdx >= 0) {
             setTimeout(() => {
                const container = chatListRef.current;
                const target = messageRefs.current[lastIdx];

                if (container && target) {
                    // scrollIntoView() は親要素（ページ全体）までスクロールさせてしまうため使用しない。
                    // 代わりに、コンテナ内での相対位置を計算して scrollTop を操作する。
                    const containerRect = container.getBoundingClientRect();
                    const targetRect = target.getBoundingClientRect();
                    
                    // ターゲットの上端とコンテナの上端の差分
                    const offset = targetRect.top - containerRect.top;

                    // 現在のスクロール位置に差分を足して、ターゲットを上部に持ってくる
                    // （少し余白を持たせるため -10px）
                    container.scrollTo({
                        top: container.scrollTop + offset - 10,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
        
        if (onChatUpdate && messages.length > 0) {
            onChatUpdate(messages);
        }
    }, [messages]);

    useEffect(() => {
        let isMounted = true;
        const loadExplanation = async () => {
            try {
                const text = await getInitialExplanation(question, selectedOption, correctIndex);
                if (isMounted) {
                    setMessages([{ role: 'model', text: text }]);
                }
            } catch (error) {
                if (isMounted) {
                    setMessages([{ role: 'model', text: `エラーが発生しました: ${error.message}` }]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadExplanation();
        return () => { isMounted = false; };
    }, [question]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userText = input;
        setInput('');
        setIsLoading(true);
        const newHistory = [...messages, { role: 'user', text: userText }];
        setMessages(newHistory);
        try {
            const apiHistory = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const responseText = await sendChatMessage(apiHistory, userText);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: `エラー: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const ChatContent = (
        <div className={cn(
            "flex flex-col bg-[#0F172A] border border-gray-700 overflow-hidden shadow-2xl transition-all duration-300 ease-in-out",
            isExpanded 
                ? "fixed inset-0 z-[9999] w-screen h-[100dvh] rounded-none"
                : "relative w-full h-[500px] rounded-2xl"
        )}>
            <div className="flex-none p-3 border-b border-gray-700 bg-gray-800/95 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <BrainCircuit className="text-blue-400" size={18} />
                    </div>
                    <span className="font-bold text-white text-sm">AI解説チューター</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        aria-label={isExpanded ? "縮小" : "全画面"}
                    >
                        {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            {/* ▼▼▼ 修正: ref={chatListRef} を追加し、相対指定 (relative) を付与 ▼▼▼ */}
            <div 
                ref={chatListRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gradient-to-b from-gray-900 to-gray-900/80 relative"
            >
                {messages.map((msg, idx) => (
                    <div 
                        key={idx}
                        ref={el => messageRefs.current[idx] = el}
                        className={cn(
                            "flex gap-3 w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1">
                                <Bot size={16} className="text-white" />
                            </div>
                        )}
                        
                        <div className={cn(
                            "p-3 md:p-5 rounded-2xl shadow-md overflow-hidden text-sm md:text-base",
                            msg.role === 'user' 
                                ? "bg-gray-700 text-white rounded-tr-sm max-w-[85%]" 
                                : "bg-gray-800/90 border border-gray-700/50 text-gray-100 rounded-tl-sm flex-1 min-w-0"
                        )}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
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
                    <div className="flex gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-gray-800/80 border border-gray-700/50 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3 flex-1">
                            <Loader2 className="animate-spin text-blue-400" size={18} />
                            <span className="text-sm text-gray-400 animate-pulse">解説を作成しています...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            <div className="flex-none p-3 border-t border-gray-700 bg-gray-800/95 z-10 pb-safe">
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="解説について質問する..."
                        className="flex-1 bg-gray-900/80 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                        disabled={isLoading}
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex-shrink-0 h-[50px] w-[50px] flex items-center justify-center"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );

    if (isExpanded) {
        return createPortal(ChatContent, document.body);
    }

    return ChatContent;
}