/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sparkles, Mic, MicOff, Save, X, Tag, Heart, Brain, Lightbulb, Compass, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { JournalEntry, MoodType } from "../types";
import { MOOD_CONFIG, UserStorageService } from "../lib/storage";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface JournalEditorProps {
  initialEntry?: JournalEntry | null;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  initialEntry,
  onSave,
  onCancel,
  onDelete,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialEntry?.title || "");
  const [content, setContent] = useState(initialEntry?.content || "");
  const [mood, setMood] = useState<MoodType>(initialEntry?.mood || "reflective");
  const [tagsInput, setTagsInput] = useState((initialEntry?.tags || []).join(", "));
  const [isFavorite, setIsFavorite] = useState(initialEntry?.isFavorite || false);

  // AI Generated fields
  const [summary, setSummary] = useState(initialEntry?.summary || "");
  const [reframing, setReframing] = useState(initialEntry?.reframing || "");
  const [actionItem, setActionItem] = useState(initialEntry?.actionItem || "");
  const [dominantEmotions, setDominantEmotions] = useState<string[]>(initialEntry?.dominantEmotions || []);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Fast demo prefill helper for realistic hackathon presentation
  const handleLoadDemoScenario = () => {
    setTitle("Career Crossroads: Tech Lead vs Climate Tech Startup");
    setContent(
      "For the past four years, I've served as a Senior Engineer at an enterprise tech firm. The stability and benefits are comfortable, but lately I feel stagnant and disconnected from purposeful impact. Last week, a former colleague invited me to join an early-stage Climate Tech initiative as Founding Lead. Joining requires taking a 35% pay reduction and stepping into high ambiguity, yet the mission deeply aligns with my long-term values. I notice myself hesitating because of fear of financial runway, yet secretly I yearn for creative autonomy and urgency. I need clarity on what is holding me back from choosing."
    );
    setMood("reflective");
    setTagsInput("career, values, autonomy, climate");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setSpeechSupported(true);
    }
  }, []);

  // Web Speech API handler
  const toggleVoiceRecording = () => {
    if (!speechSupported) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setContent((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Trigger Gemini AI Summarization & Psychological Reframing
  const handleAiSummarize = async () => {
    if (!content.trim() || content.trim().length < 10) {
      setAiError("Please write at least a few sentences before analyzing.");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const result = await api.summarizeEntry(title, content, user?.token);
      setSummary(result.summary);
      setReframing(result.reframing);
      setActionItem(result.actionItem);
      setDominantEmotions(result.dominantEmotions || []);
      if (result.mood && MOOD_CONFIG[result.mood]) {
        setMood(result.mood);
      }
      if (result.suggestedTags && result.suggestedTags.length > 0) {
        const existingTags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
        const combined = Array.from(new Set([...existingTags, ...result.suggestedTags]));
        setTagsInput(combined.join(", "));
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI summary.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!content.trim()) return;

    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const moodMeta = MOOD_CONFIG[mood] || MOOD_CONFIG.reflective;
      const cleanSummary = summary.trim();
      const cleanReframing = reframing.trim();
      const cleanActionItem = actionItem.trim();

      const entryPayload: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt"> = {
        title: title.trim() || "Untitled Reflection",
        content: content.trim(),
        mood,
        moodScore: moodMeta.score,
        tags: parsedTags,
        isFavorite,
        wordCount: 0,
        readingTimeMinutes: 1,
        ...(cleanSummary ? { summary: cleanSummary } : {}),
        ...(cleanReframing ? { reframing: cleanReframing } : {}),
        ...(cleanActionItem ? { actionItem: cleanActionItem } : {}),
        ...(dominantEmotions.length > 0 ? { dominantEmotions } : {}),
      };

      let saved: JournalEntry;
      if (initialEntry) {
        saved = {
          ...initialEntry,
          ...entryPayload,
        };
        await UserStorageService.updateEntry(user.uid, saved);
      } else {
        saved = await UserStorageService.addEntry(user.uid, entryPayload);
      }

      onSave(saved);
    } catch (err) {
      console.error("Failed to save entry to Firestore:", err);
      setAiError("Failed to save to Firestore. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/90">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
            {initialEntry ? "Edit Entry" : "Create Entry"}
          </span>
          <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            {wordCount} words
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 rounded-xl border min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
            }`}
            title="Star entry"
            aria-label="Star entry"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-600" : ""}`} />
          </button>

          {/* Voice Dictation */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border min-h-[40px] transition-all cursor-pointer ${
                isRecording
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="Speak thoughts"
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{isRecording ? "Listening..." : "Dictate"}</span>
            </button>
          )}

          {/* AI Summarize & Reframe Action */}
          <button
            type="button"
            onClick={handleAiSummarize}
            disabled={aiLoading || !content.trim()}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-xs transition-all disabled:opacity-50 min-h-[40px] cursor-pointer"
            title="Use Gemini to generate summary, mood detection & cognitive reframing"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>AI Synthesis</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Cancel editing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* Title Input & Demo Quick Loader */}
        <div className="space-y-2">
          {!initialEntry && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reflection Draft
              </span>
              <button
                type="button"
                onClick={handleLoadDemoScenario}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                title="Prefill realistic career dilemma reflection for demo presentation"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Demo Realistic Scenario</span>
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Entry Title or Summary Headline..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg sm:text-2xl font-bold text-slate-900 placeholder-slate-300 focus:outline-none border-b border-transparent focus:border-slate-200 pb-1.5 sm:pb-2 transition-colors tracking-tight"
          />
        </div>

        {/* Mood Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Emotional & Cognitive State
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(Object.keys(MOOD_CONFIG) as MoodType[]).map((mKey) => {
              const meta = MOOD_CONFIG[mKey];
              const isSelected = mood === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => setMood(mKey)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[40px] cursor-pointer ${
                    isSelected
                      ? `${meta.color} font-semibold ring-2 ring-indigo-600/30 shadow-xs`
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-sm">{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Textarea */}
        <div className="relative">
          <textarea
            rows={10}
            placeholder="Write your thoughts, reflections, decisions, or daily log..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm sm:text-base text-slate-800 placeholder-slate-300 font-sans leading-relaxed focus:outline-none resize-none p-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:bg-white transition-all"
          />
        </div>

        {/* Tags input */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Tag className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Tags separated by comma (e.g. Mindset, Decision, Focus)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none font-mono py-1"
          />
        </div>

        {/* AI Insight & Cognitive Reframe Panel */}
        {(summary || reframing || actionItem || dominantEmotions.length > 0 || aiLoading || aiError) && (
          <div className="rounded-xl bg-blue-50/50 border border-blue-200/80 p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                  Gemini Psychological Insights & Synthesis
                </span>
              </div>
              {aiLoading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing...
                </span>
              )}
            </div>

            {aiError && (
              <p className="text-xs text-rose-600 font-medium">{aiError}</p>
            )}

            {dominantEmotions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500">Detected Signals:</span>
                {dominantEmotions.map((emo, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200 font-mono"
                  >
                    {emo}
                  </span>
                ))}
              </div>
            )}

            {summary && (
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Executive Summary</span>
                <p className="text-sm text-slate-800 leading-relaxed font-sans">{summary}</p>
              </div>
            )}

            {reframing && (
              <div className="p-3.5 rounded-lg bg-white border border-blue-200/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Cognitive Reframe & Perspective
                </div>
                <p className="text-xs sm:text-sm text-slate-800 italic leading-relaxed">
                  "{reframing}"
                </p>
              </div>
            )}

            {actionItem && (
              <div className="flex items-start gap-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">Recommended Action: </span>
                  {actionItem}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Error Alert */}
        {deleteError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="text-rose-600 font-semibold underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Inline Deletion Confirmation in Editor */}
        {confirmDelete && initialEntry && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900">
                  Delete this entry from Cloud Firestore?
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  This permanently removes document <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[10px]">/users/&#123;uid&#125;/entries/{initialEntry.id}</code>.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDelete || !initialEntry) return;
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await onDelete(initialEntry.id);
                    onCancel();
                  } catch (err: any) {
                    setDeleteError(err?.message || "Failed to delete entry from Firestore.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting from Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Editor Footer Actions */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || isDeleting}
            className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          {initialEntry && onDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving || isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-rose-600 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim() || saving || isDeleting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-98 disabled:opacity-40 min-h-[44px] cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? "Saving..." : "Save Entry"}</span>
        </button>
      </div>

    </div>
  );
};
