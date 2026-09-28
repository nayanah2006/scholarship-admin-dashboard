import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  HelpCircle,
  ExternalLink,
  Loader2,
  ChevronDown
} from 'lucide-react';

export function IntegratedChatbot({ user, api }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: `Namaskara! I am your ScholarPath Assistant. I can help you find open scholarships, verify eligibility criteria, track required application documents, and understand deadlines. How can I help you today?`,
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const historyLoaded = useRef(false);

  const quickQuestions = [
    'What scholarships can I apply for?',
    'What documents are mandatory?',
    'How does institution verification work?',
    'What is the SSP scholarship amount?'
  ];

  const sourceLabel = (s) => {
    if (!s) return '';
    if (typeof s === 'string') return s;
    return s.name || s.document_name || s.public_id || '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || historyLoaded.current) return;
    historyLoaded.current = true;
    api('/api/ai/chat/history')
      .then((data) => {
        if (!data?.messages?.length) return;
        setMessages(
          data.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'bot',
            content: m.content,
            sources: m.sources || [],
            time: ''
          }))
        );
      })
      .catch(() => {});
  }, [isOpen, api]);

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await api('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });

      const botMsg = {
        role: 'bot',
        content: response.answer || response.message || 'I have answered your inquiry based on official scholarship records.',
        sources: response.sources || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'I apologize, but I could not access the scholarship database at this moment. Please verify your query or try again shortly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open scholarship chatbot"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-indigo-700 px-4 py-3.5 text-white shadow-xl shadow-indigo-700/30 transition-all hover:bg-indigo-800 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          <div className="relative">
            <MessageCircle size={22} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">Scholarship Help</span>
        </button>
      )}

      {/* Modern Chatbot Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Scholarship Support Assistant"
          className="fixed bottom-6 right-4 sm:right-6 z-50 flex h-[540px] w-[92vw] sm:w-[410px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-700 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Bot size={20} className="text-indigo-200" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">ScholarPath AI Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[11px] text-indigo-100 font-medium">Database-Grounded • Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'bot' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                    <Bot size={15} />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-700 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>

                  {/* Sources if present */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <p className="font-semibold text-slate-600 mb-1">Official Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {m.sources.map((s, idx) => (
                          <span key={idx} className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 border border-slate-200">
                            {sourceLabel(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className={`mt-1 block text-[10px] ${m.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                    <UserIcon size={14} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 w-fit">
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span>Searching scholarship database…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="border-t border-slate-200/60 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Suggested Questions</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about scholarships, documents, rules…"
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-sm hover:bg-indigo-800 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
