import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, User, BrainCircuit, Loader2, Bot, Maximize2, Minimize2 } from 'lucide-react';
import { getInitialExplanation, sendChatMessage } from '../../services/ai';
import { cn } from '../../utils/cn';
import { BlockMath, InlineMath } from 'react-katex';

// ... (RichTextRenderer, MarkdownText は変更なし。省略せずそのまま記述してください) ...
// (長くなるため省略しますが、元のコードのままでOKです)
const RichTextRenderer = ({ text }) => {
    if (!text) return null;
    const cleanText = text.replace(/\\\$/g, '$');
    const parts = cleanText.split(/(\$\$[\s\S]*?\$\$)/g);
    return (
        <div className="text-sm md:text-base space-y-2">
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const mathContent = part.slice(2, -2).trim();
                    return <div key={index} className="my-3 overflow-x-auto py-1"><BlockMath math={mathContent} settings={{ strict: false }} /></div>;
                }
                return <MarkdownText key={index} text={part} />;
            })}
        </div>
    );
};

const MarkdownText = ({ text }) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    const renderedLines = [];

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('```')) {
            if (inCodeBlock) {
                renderedLines.push(
                    <div key={`code-${i}`} className="my-2 p-3 bg-[#1E293B] rounded-lg border border-gray-700 font-mono text-xs overflow-x-auto shadow-inner">
                        <pre className="whitespace-pre">{codeContent.join('\n')}</pre>
                    </div>
                );
                inCodeBlock = false;
                codeContent = [];
            } else {
                inCodeBlock = true;
            }
            return;
        }
        if (inCodeBlock) {
            codeContent.push(line);
            return;
        }
        if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
            const headingText = trimmedLine.replace(/^#+\s+/, '');
            renderedLines.push(
                <h3 key={i} className="text-lg font-bold text-blue-300 mt-6 mb-3 border-b border-blue-500/30 pb-1 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                    {headingText}
                </h3>
            );
            return;
        }
        const parseInline = (str) => {
            const segments = str.split(/(\$.*?\$|\*\*.*?\*\*|__.*?__)/g);
            return segments.map((seg, j) => {
                if (seg.startsWith('$') && seg.endsWith('$')) return <span key={j} className="mx-1"><InlineMath math={seg.slice(1, -1)} settings={{ strict: false }} /></span>;
                if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={j} className="text-white font-bold bg-white/10 px-1 rounded">{seg.slice(2, -2)}</strong>;
                if (seg.startsWith('__') && seg.endsWith('__')) return <span key={j} className="text-red-400 font-bold bg-red-900/20 px-1 rounded border border-red-500/20">{seg.slice(2, -2)}</span>;
                return seg;
            });
        };
        if (trimmedLine === '') renderedLines.push(<div key={i} className="h-2" />);
        else renderedLines.push(<p key={i} className="mb-1 leading-relaxed text-gray-300">{parseInline(line)}</p>);
    });
    return <>{renderedLines}</>;
};

// ▼▼▼ onChatUpdate を受け取るように修正 ▼▼▼
export default function ExplanationChat({ question, selectedOption, correctIndex, isCorrect, onChatUpdate }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'user' || isLoading) {
            scrollToBottom();
        }
        
        // ▼▼▼ チャット更新時に親へ通知 ▼▼▼
        if (onChatUpdate && messages.length > 0) {
            onChatUpdate(messages);
        }
    }, [messages, isLoading]);

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

    // ... (ChatContent の JSX は変更なし) ...
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

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gradient-to-b from-gray-900 to-gray-900/80">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
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
                            "p-3 md:p-5 rounded-2xl shadow-md overflow-hidden",
                            msg.role === 'user' 
                                ? "bg-gray-700 text-white rounded-tr-sm max-w-[85%]" 
                                : "bg-gray-800/90 border border-gray-700/50 text-gray-100 rounded-tl-sm flex-1 min-w-0"
                        )}>
                            {msg.role === 'user' ? (
                                <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                                <RichTextRenderer text={msg.text} />
                            )}
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