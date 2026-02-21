'use client';
import { useState, useRef, useEffect } from 'react';
import { chat } from '@/lib/api';

interface Message { role: 'user' | 'bot'; text: string; }

export default function BBot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: 'Hi! I\'m bBot 👋 Your BizMind assistant. Ask me anything about your business analysis!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);
        setLoading(true);
        try {
            const data = await chat(text);
            setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
        } catch {
            setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I ran into an error. Please try again!' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {open && (
                <div className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[70vh] animate-scale-in">
                    {/* Header */}
                    <div className="bg-primary text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="size-9 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined !text-base">smart_toy</span>
                            </div>
                            <div>
                                <p className="font-extrabold text-sm">bBot</p>
                                <p className="text-xs text-white/80">BizMind Assistant</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)}
                            className="size-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined !text-lg">close</span>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-bl-none shadow-sm border border-gray-100 px-4 py-2.5 flex gap-1">
                                    <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask bBot..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                        <button onClick={sendMessage} disabled={loading || !input.trim()}
                            className="size-10 bg-primary hover:bg-primary-hover text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
                            <span className="material-symbols-outlined !text-base">send</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle button */}
            <button
                onClick={() => setOpen(!open)}
                className="size-14 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                aria-label="Open bBot"
            >
                <span className="material-symbols-outlined !text-2xl">{open ? 'close' : 'smart_toy'}</span>
            </button>
        </div>
    );
}
