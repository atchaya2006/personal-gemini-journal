/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  PenLine, 
  Compass, 
  BrainCircuit, 
  ArrowRight, 
  ShieldCheck, 
  Heart, 
  Search, 
  ChevronRight, 
  BookOpen, 
  SlidersHorizontal,
  X,
  Clock,
  Lightbulb
} from "lucide-react";
import { JournalEntry, MoodType, DecisionItem } from "../types";
import { MOOD_CONFIG } from "../lib/storage";
import { useAuth } from "../lib/authContext";
import { TabType } from "./Navbar";

interface HomeScreenProps {
  entries: JournalEntry[];
  decisions: DecisionItem[];
  onSelectEntry: (entry: JournalEntry) => void;
  onEditEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onToggleFavorite: (entry: JournalEntry) => void;
  onTabChange: (tab: TabType) => void;
  onOpenSecurityModal: () => void;
  onViewAllEntries: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  entries,
  decisions,
  onSelectEntry,
  onEditEntry,
  onNewEntry,
  onToggleFavorite,
  onTabChange,
  onOpenSecurityModal,
  onViewAllEntries,
}) => {
  const { user } = useAuth();
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<MoodType | "all">("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Contextual Greeting based on user's current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const userFirstName = useMemo(() => {
    if (!user?.displayName) return "";
    const namePart = user.displayName.trim().split(" ")[0];
    return namePart ? `, ${namePart}` : "";
  }, [user]);

  // Mood distribution counts
  const moodCounts = useMemo(() => {
    const counts: Partial<Record<MoodType, number>> = {};
    entries.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const activeMoodKeys = useMemo(() => {
    return (Object.keys(MOOD_CONFIG) as MoodType[]).filter(
      (m) => (moodCounts[m] || 0) > 0
    );
  }, [moodCounts]);

  // Filtered recent reflections (latest 2-3 or filtered by mood/search)
  const displayedEntries = useMemo(() => {
    let list = entries;
    if (selectedMoodFilter !== "all") {
      list = list.filter((e) => e.mood === selectedMoodFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 3);
  }, [entries, selectedMoodFilter, searchQuery]);

  const activeEvaluatingDecisions = useMemo(() => {
    return decisions.filter((d) => d.status === "evaluating");
  }, [decisions]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto px-1 sm:px-0">
      
      {/* 1. Personalized Welcome Section */}
      <section className="space-y-1 pt-1 sm:pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {greeting}{userFirstName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          A quiet space to understand what’s on your mind.
        </p>
      </section>

      {/* 2. Primary Reflection Partner Card (Main Visual Focus) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 border border-indigo-100/90 shadow-xs p-5 sm:p-7 transition-all hover:shadow-sm">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-indigo-200/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-4 w-28 h-28 bg-violet-200/25 rounded-full blur-xl pointer-events-none" />

        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100/70 text-indigo-700 border border-indigo-200/50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Reflection Partner</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              • One question at a time
            </span>
          </div>

          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Reflect with your AI Partner
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Explore what’s on your mind through thoughtful, one-question-at-a-time reflection.
            </p>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onTabChange("chat")}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer min-h-[46px]"
              aria-label="Start Reflection"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Reflection</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>

            <button
              onClick={() => onTabChange("decision")}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[46px]"
            >
              <Compass className="w-4 h-4 text-violet-600" />
              <span>Explore Crossroads</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Quick Actions (Clean Icon Cards) */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Action 1: Write Journal */}
          <button
            onClick={onNewEntry}
            className="flex flex-col items-start p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <PenLine className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              Write Journal
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              Freeform entry
            </span>
          </button>

          {/* Action 2: Explore a Decision */}
          <button
            onClick={() => onTabChange("decision")}
            className="flex flex-col items-start p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-violet-300 hover:shadow-xs active:scale-[0.98] transition-all text-left cursor-pointer group relative"
          >
            {activeEvaluatingDecisions.length > 0 && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white" />
            )}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">
              Explore a Decision
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              {activeEvaluatingDecisions.length > 0 
                ? `${activeEvaluatingDecisions.length} active` 
                : "Map choices"}
            </span>
          </button>

          {/* Action 3: View Patterns */}
          <button
            onClick={() => onTabChange("patterns")}
            className="flex flex-col items-start p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-xs active:scale-[0.98] transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
              View Patterns
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
              Cognitive loops
            </span>
          </button>
        </div>
      </section>

      {/* 4. Mood Overview (Subtle visual summary & interactive filters) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Recent Mood
          </h3>
          {selectedMoodFilter !== "all" && (
            <button
              onClick={() => setSelectedMoodFilter("all")}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-500">
            Write your first reflection to begin tracking emotional patterns.
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedMoodFilter("all")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 min-h-[38px] cursor-pointer flex items-center gap-1.5 ${
                selectedMoodFilter === "all"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              <span>All Entries</span>
              <span className={`text-[10px] ${selectedMoodFilter === "all" ? "opacity-80" : "text-slate-400"}`}>
                ({entries.length})
              </span>
            </button>

            {(Object.keys(MOOD_CONFIG) as MoodType[]).map((mKey) => {
              const meta = MOOD_CONFIG[mKey];
              const count = moodCounts[mKey] || 0;
              const isSelected = selectedMoodFilter === mKey;

              return (
                <button
                  key={mKey}
                  onClick={() => setSelectedMoodFilter(isSelected ? "all" : mKey)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all shrink-0 min-h-[38px] cursor-pointer ${
                    isSelected
                      ? `${meta.color} font-semibold ring-2 ring-indigo-600/30 shadow-xs`
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm leading-none">{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Recent Reflections Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recent Reflections
            </h3>
            {selectedMoodFilter !== "all" && (
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Filtered
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearching(!isSearching)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ${
                isSearching || searchQuery ? "text-indigo-600 bg-indigo-50" : ""
              }`}
              title="Search reflections"
              aria-label="Search reflections"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onViewAllEntries}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all ({entries.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input Bar if Active */}
        {isSearching && (
          <div className="relative animate-in fade-in">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by keyword, mood, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Entry Cards List */}
        {displayedEntries.length === 0 ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                {searchQuery || selectedMoodFilter !== "all" 
                  ? "No matching reflections found" 
                  : "Your sanctuary is ready"}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchQuery || selectedMoodFilter !== "all"
                  ? "Try resetting your mood or search filters."
                  : "Capture a fleeting thought or explore a situation with your AI partner."}
              </p>
            </div>
            <button
              onClick={onNewEntry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs transition-all"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write First Reflection</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedEntries.map((entry) => {
              const moodMeta = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.reflective;
              const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <article
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="group relative bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer space-y-2.5"
                >
                  {/* Card Top Metadata */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${moodMeta.color}`}>
                        <span>{moodMeta.emoji}</span>
                        <span>{moodMeta.label}</span>
                      </span>

                      {entry.reframing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Reframed</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-[11px] font-medium">{dateStr}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(entry);
                        }}
                        className={`p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer ${
                          entry.isFavorite ? "text-rose-600" : "text-slate-300 hover:text-slate-500"
                        }`}
                        title="Star entry"
                        aria-label="Star entry"
                      >
                        <Heart className={`w-3.5 h-3.5 ${entry.isFavorite ? "fill-rose-600" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {entry.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-sans">
                      {entry.content}
                    </p>
                  </div>

                  {/* AI Reframing Quote Preview if available */}
                  {entry.reframing && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-600 italic line-clamp-1">
                        "{entry.reframing}"
                      </span>
                    </div>
                  )}

                  {/* Card Bottom Meta */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      {entry.tags && entry.tags.length > 0 ? (
                        <div className="flex items-center gap-1 overflow-hidden">
                          {entry.tags.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                              #{t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px]">{entry.wordCount || 0} words</span>
                      )}
                    </div>

                    <span className="text-indigo-600 group-hover:text-indigo-700 font-semibold text-xs flex items-center gap-0.5">
                      Read <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Privacy Reassurance (Subtle, Reassuring Card) */}
      <section 
        onClick={onOpenSecurityModal}
        className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors cursor-pointer flex items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-left">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Private by design</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">
              Your reflections are isolated to your account and protected by Firebase security rules.
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </section>

    </div>
  );
};
