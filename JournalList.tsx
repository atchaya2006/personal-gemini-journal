/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Search, Heart, Sparkles, Filter, Download, Plus, BookOpen, Lightbulb, Trash2, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { JournalEntry, MoodType } from "../types";
import { MOOD_CONFIG, UserStorageService } from "../lib/storage";
import { useAuth } from "../lib/authContext";

interface JournalListProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry?: (id: string) => Promise<void>;
  onNewEntry: () => void;
  onToggleFavorite: (entry: JournalEntry) => void;
  onBackToHome?: () => void;
}

export const JournalList: React.FC<JournalListProps> = ({
  entries,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  onNewEntry,
  onToggleFavorite,
  onBackToHome,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodType | "all">("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cardDeleteError, setCardDeleteError] = useState<string | null>(null);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (onlyFavorites && !e.isFavorite) return false;
      if (selectedMood !== "all" && e.mood !== selectedMood) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = e.title.toLowerCase().includes(q);
        const inContent = e.content.toLowerCase().includes(q);
        const inTags = e.tags?.some((t) => t.toLowerCase().includes(q));
        const inSummary = e.summary?.toLowerCase().includes(q);
        return inTitle || inContent || inTags || inSummary;
      }
      return true;
    });
  }, [entries, searchQuery, selectedMood, onlyFavorites]);

  const handleCardDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (!onDeleteEntry) return;
    setDeletingId(entryId);
    setCardDeleteError(null);
    try {
      await onDeleteEntry(entryId);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error("Card Firestore delete failed:", err);
      setCardDeleteError(err?.message || "Failed to delete entry from Firestore.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    const jsonString = await UserStorageService.exportUserData(user.uid);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal-gemini-journal-backup-${user.uid.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Optional Back to Home Navigation Header */}
      {onBackToHome && (
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer py-1"
          >
            <span>← Back to Sanctuary</span>
          </button>
          <span className="text-xs font-medium text-slate-500">
            All Reflections ({entries.length})
          </span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search entries, emotions, tags, reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all min-h-[42px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-colors min-h-[40px] cursor-pointer ${
              onlyFavorites
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-rose-600 text-rose-600" : ""}`} />
            <span>Starred</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors min-h-[40px] cursor-pointer"
            title="Export full zero-trust journal vault as JSON backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Vault</span>
          </button>
        </div>
      </div>

      {/* Mood Selector Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs scrollbar-none">
        <div className="flex items-center gap-1 text-slate-400 shrink-0 font-semibold uppercase tracking-wider text-[10px] pl-1">
          <Filter className="w-3.5 h-3.5" />
          Mood:
        </div>
        <button
          onClick={() => setSelectedMood("all")}
          className={`px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all shrink-0 min-h-[38px] cursor-pointer ${
            selectedMood === "all"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All ({entries.length})
        </button>

        {(Object.keys(MOOD_CONFIG) as MoodType[]).map((mKey) => {
          const meta = MOOD_CONFIG[mKey];
          const count = entries.filter((e) => e.mood === mKey).length;
          const isSelected = selectedMood === mKey;
          return (
            <button
              key={mKey}
              onClick={() => setSelectedMood(mKey)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all shrink-0 min-h-[38px] cursor-pointer ${
                isSelected
                  ? `${meta.color} font-semibold ring-2 ring-indigo-600/20 shadow-xs`
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="opacity-60 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Entries List / Grid */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 sm:py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800">No matching entries found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedMood !== "all" || onlyFavorites
                ? "Try adjusting your search query or mood filters."
                : "Your partitioned journal vault is ready for its first secure reflection."}
            </p>
          </div>
          <button
            onClick={onNewEntry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-all min-h-[44px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredEntries.map((entry) => {
            const moodMeta = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.reflective;
            const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <article
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="group relative bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5 sm:space-y-3">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${moodMeta.color}`}>
                      <span>{moodMeta.emoji}</span>
                      <span>{moodMeta.label}</span>
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-[11px] font-medium text-slate-500">{dateStr}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(entry);
                        }}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                          entry.isFavorite ? "text-rose-600" : "text-slate-300 hover:text-slate-500"
                        }`}
                        title="Star"
                        aria-label="Star entry"
                      >
                        <Heart className={`w-3.5 h-3.5 ${entry.isFavorite ? "fill-rose-600" : ""}`} />
                      </button>
                      {onDeleteEntry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(confirmDeleteId === entry.id ? null : entry.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Delete from Firestore"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Level Inline Delete Confirmation */}
                  {confirmDeleteId === entry.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-2 animate-in fade-in"
                    >
                      <div className="flex items-start gap-2 text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px]">Delete from Cloud Firestore?</p>
                          <p className="text-[10px] text-rose-700 leading-tight">This will permanently delete this document from Firestore.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === entry.id}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCardDelete(e, entry.id)}
                          disabled={deletingId === entry.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === entry.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Title & Preview */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {entry.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mt-1 leading-relaxed font-sans">
                      {entry.content}
                    </p>
                  </div>

                  {/* AI Cognitive Reframe / Summary Badge */}
                  {entry.reframing && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-slate-800 flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-slate-700 italic">"{entry.reframing}"</span>
                    </div>
                  )}

                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {entry.tags && entry.tags.length > 0 ? (
                      entry.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">{entry.wordCount} words</span>
                    )}
                    {entry.tags && entry.tags.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-mono">+{entry.tags.length - 2}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntry(entry);
                      }}
                      className="text-slate-500 hover:text-slate-900 text-xs font-semibold uppercase tracking-wider py-1 px-1.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-indigo-600 font-semibold text-xs uppercase tracking-wider flex items-center gap-1">
                      Inspect <Sparkles className="w-3 h-3" />
                    </span>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      )}

    </div>
  );
};
