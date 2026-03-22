'use client';
import { useState, useRef, useEffect } from 'react';
import { useAnalysisData } from '@/lib/hooks';
import { copilotChat } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function CopilotPage() {
    const { data: analysisData, isLoading } = useAnalysisData();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your AI Chief Operating Officer. I have access to your original strategy and your recent daily metrics. How can we improve the business today?" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !analysisData) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const res = await copilotChat(analysisData.id, userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: res.response || "I couldn't process that right now." }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Please try again later.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (isLoading || !analysisData) {
        return <div className="animate-pulse h-96 bg-gray-100 rounded-2xl w-full"></div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in font-sans">
            <div className="mb-4">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-500">support_agent</span>
                    COO Copilot
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Ask questions about your daily metrics, request marketing ideas, or seek operational advice.
                </p>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-indigo-600">smart_toy</span>
                            <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-sm">Executive AI</h2>
                            <p className="text-xs text-emerald-600 font-medium tracking-wide">ONLINE (Connected to Live Metrics)</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FAFAFA]">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                            }`}>
                                <div className="text-[15px] leading-relaxed whitespace-pre-wrap format-markdown"
                                     dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                                />
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm w-fit flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-full py-4 pl-6 pr-14 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                            placeholder="Ask me how to improve footfall this weekend..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 font-bold text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                        </button>
                    </form>
                </div>
            </div>
            
            <style>{`
                .format-markdown p { margin-bottom: 0.5em; }
                .format-markdown p:last-child { margin-bottom: 0; }
                .format-markdown ul { list-style-type: disc; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
                .format-markdown strong { font-weight: 700; }
            `}</style>
        </div>
    );
}
