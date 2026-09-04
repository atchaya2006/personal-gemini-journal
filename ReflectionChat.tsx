/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RefreshCw, BookPlus, Bot, User, ArrowRight, ShieldCheck, Trash2 } from "lucide-react";
import { ChatMessage, JournalEntry } from "../types";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface ReflectionChatProps {
  entries?: JournalEntry[];
  onSaveAsEntry: (entryData: Partial<JournalEntry>) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome-1",
    role: "model",
    content: "Welcome to your reflection sanctuary. I am your Gemini mindful companion. Whether you're feeling unsettled, weighing a crossroads, or unpacking a thought—what is present for you right now?",
    timestamp: new Date().toISOString(),
    suggestedFollowUps: [
      "I'm feeling a bit overwhelmed by my workload today.",
      "I made meaningful progress on a personal goal.",
      "Help me reframe some recent critical feedback.",
      "I'm feeling stuck and need a gentle perspective shift.",
    ],
  },
];

export const ReflectionChat: React.FC<ReflectionChatProps> = ({ entries = [], onSaveAsEntry }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      // Prepare relevant personal journal context for grounding
      const journalContext = entries && entries.length > 0
        ? `User's authentic journal history (${entries.length} total entries). Recent reflections:\n` +
          entries.slice(0, 5).map(e => `- [${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Recent'}] "${e.title}" (Mood: ${e.mood}): ${e.summary || e.content.slice(0, 150)}`).join("\n")
        : undefined;

      const response = await api.sendReflectionChat(
        newHistory,
        journalContext,
        user?.token
      );

      const modelMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "model",
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestedFollowUps: response.followUps,
      };

      setMessages([...newHistory, modelMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to reflection service.");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToJournal = () => {
    if (messages.length <= 1) return;
    
    // Combine dialogue into structured journal narrative
    const content = messages
      .filter((m) => m.id !== "msg-welcome-1")
      .map((m) => `${m.role === "user" ? "Me" : "Gemini Reflection"}: ${m.content}`)
      .join("\n\n");

    const title = "Dialogue Reflection: " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    onSaveAsEntry({
      title,
      content,
      mood: "reflective",
      tags: ["AI Dialogue", "Mindfulness", "Self-Inquiry"],
    });
  };

  const handleClearChat = () => {
    if (confirm("Reset current dialogue thread?")) {
      setMessages(INITIAL_MESSAGES);
    }
  };

  const lastModelMessage = [...messages].reverse().find((m) => m.role === "model");

  return (
    <div className="flex flex-col h-[calc(100dvh-13rem)] sm:h-[calc(100vh-14rem)] min-h-[480px] bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Chat Header */}
      <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 bg-slate-50/90">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                Socratic Reflection Partner
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Zero-Leak
              </span>
              {entries.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {entries.length} Journal Context
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
              Private multi-turn cognitive inquiry powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {messages.length > 2 && (
            <button
              onClick={handleConvertToJournal}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer min-h-[36px]"
              title="Transform this dialogue into a permanent journal entry"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>Save<span className="hidden sm:inline"> to Journal</span></span>
            </button>
          )}

          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-5 bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? "bg-slate-900 text-slate-100"
                    : "bg-indigo-600 text-white shadow-xs"
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-1 max-w-[85%] sm:max-w-xl">
                <div
                  className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                      : "bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                </div>
                <div className={`text-[10px] font-mono text-slate-400 px-1 ${isUser ? "text-right" : "text-left"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 mr-auto max-w-md">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              <span>Reflecting with mindful presence...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 max-w-md mx-auto text-center">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow Up Pills */}
      {!loading && lastModelMessage?.suggestedFollowUps && lastModelMessage.suggestedFollowUps.length > 0 && (
        <div className="px-3 sm:px-6 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Prompt:
          </span>
          {lastModelMessage.suggestedFollowUps.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(suggestion)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 transition-all shrink-0 shadow-xs cursor-pointer"
            >
              <span className="line-clamp-1">{suggestion}</span>
              <ArrowRight className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-2.5 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Share a feeling, thought, or situation..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all disabled:opacity-60 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
