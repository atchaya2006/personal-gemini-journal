/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Heart, Calendar, Clock, Sparkles, Lightbulb, Compass, Tag, Edit3, Trash2, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { JournalEntry } from "../types";
import { MOOD_CONFIG } from "../lib/storage";

interface JournalDetailModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite: (entry: JournalEntry) => void;
}

export const JournalDetailModal: React.FC<JournalDetailModalProps> = ({
  entry,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!entry) return null;

  const moodMeta = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.reflective;
  const formattedDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleConfirmDelete = async () => {
    if (!entry) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(entry.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err: any) {
      console.error("Failed to delete journal entry from Firestore:", err);
      setDeleteError(
        err?.message || "Failed to permanently delete entry from Firestore. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${moodMeta.color}`}>
              <span>{moodMeta.emoji}</span>
              <span>{moodMeta.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              Firestore Vault
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(entry)}
              disabled={isDeleting}
              className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                entry.isFavorite
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
              }`}
              title="Toggle Favorite"
              aria-label="Toggle Favorite"
            >
              <Heart className={`w-4 h-4 ${entry.isFavorite ? "fill-rose-600" : ""}`} />
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              disabled={isDeleting}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Edit Entry"
              aria-label="Edit Entry"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsConfirmingDelete(true);
                setDeleteError(null);
              }}
              disabled={isDeleting || isConfirmingDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Delete Entry from Firestore"
              aria-label="Delete Entry from Firestore"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Deletion Confirmation Bar */}
        {isConfirmingDelete && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    Permanently delete this journal entry?
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    This reflection will be permanently erased from your private journal vault. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 min-h-[36px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs transition-all cursor-pointer disabled:opacity-60 min-h-[36px]"
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
          </div>
        )}

        {/* Delete Error Alert */}
        {deleteError && (
          <div className="bg-rose-100 border-b border-rose-300 px-6 py-3 text-xs text-rose-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-rose-700 hover:text-rose-950 font-semibold underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight tracking-tight">
              {entry.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-sans">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {entry.wordCount} words (~{entry.readingTimeMinutes} min read)
              </span>
            </div>
          </div>

          {/* AI Summary and Cognitive Reframing Callout */}
          {(entry.summary || entry.reframing || entry.actionItem || (entry.dominantEmotions && entry.dominantEmotions.length > 0)) && (
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3.5 text-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-700" />
                Gemini Cognitive Reflection & Synthesis
              </div>

              {entry.dominantEmotions && entry.dominantEmotions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.dominantEmotions.map((emo, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-100 text-blue-900 border border-blue-200">
                      {emo}
                    </span>
                  ))}
                </div>
              )}

              {entry.summary && (
                <p className="text-xs sm:text-sm font-sans leading-relaxed text-slate-800">
                  {entry.summary}
                </p>
              )}

              {entry.reframing && (
                <div className="p-3.5 bg-white rounded-xl border border-blue-200/70 text-xs sm:text-sm italic text-slate-800 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold not-italic text-blue-950">Reframed Perspective: </span>
                    "{entry.reframing}"
                  </div>
                </div>
              )}

              {entry.actionItem && (
                <div className="flex items-start gap-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                  <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Recommended Action: </span>
                    {entry.actionItem}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Journal Text Body */}
          <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
            {entry.content}
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {entry.tags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-lg text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  #{t}
                </span>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
