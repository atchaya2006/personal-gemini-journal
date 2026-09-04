/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Calendar, 
  Sparkles, 
  Plus, 
  Award, 
  TrendingUp, 
  Compass, 
  BrainCircuit, 
  Trash2, 
  Filter, 
  X, 
  Check, 
  Lightbulb, 
  RefreshCw,
  Clock,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { DecisionItem, GrowthMilestone, JournalEntry, MilestoneCategory, MilestoneImpact } from "../types";
import { UserStorageService } from "../lib/storage";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface PersonalGrowthTimelineProps {
  milestones: GrowthMilestone[];
  entries: JournalEntry[];
  decisions: DecisionItem[];
}

const CATEGORY_CONFIG: Record<MilestoneCategory, { label: string; icon: string; badge: string; dot: string }> = {
  mindset_shift: { label: "Mindset Shift", icon: "💡", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  breakthrough: { label: "Breakthrough", icon: "✨", badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  decision_point: { label: "Decision Point", icon: "🧭", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  emotional_milestone: { label: "Emotional Resilience", icon: "🌿", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  life_transition: { label: "Life Transition", icon: "🚀", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
};

const IMPACT_CONFIG: Record<MilestoneImpact, { label: string; badge: string }> = {
  transformational: { label: "Transformational", badge: "bg-rose-100 text-rose-800 border-rose-200 font-bold" },
  significant: { label: "Significant", badge: "bg-indigo-100 text-indigo-800 border-indigo-200 font-medium" },
  notable: { label: "Notable", badge: "bg-slate-100 text-slate-700 border-slate-200 font-normal" },
};

export const PersonalGrowthTimeline: React.FC<PersonalGrowthTimelineProps> = ({ milestones, entries, decisions }) => {
  const { user } = useAuth();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"all" | "this_month" | "past_3_months" | "past_year">("all");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MilestoneCategory>("breakthrough");
  const [impactLevel, setImpactLevel] = useState<MilestoneImpact>("significant");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [keyLearning, setKeyLearning] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !keyLearning.trim()) return;

    try {
      await UserStorageService.addMilestone(user.uid, {
        title: title.trim(),
        description: description.trim(),
        category,
        impactLevel,
        date,
        keyLearning: keyLearning.trim(),
        tags,
      });

      // Reset
      setTitle("");
      setDescription("");
      setKeyLearning("");
      setTags([]);
      setIsAddingCustom(false);
    } catch (err: any) {
      console.error("Error adding milestone:", err);
      setError(err.message || "Failed to create milestone");
    }
  };

  const handleAutoDetectMilestones = async () => {
    if (!user) return;
    setIsAutoDetecting(true);
    setError(null);

    try {
      const result = await api.autoDetectMilestones(entries, decisions, user.token);
      if (result.milestones && result.milestones.length > 0) {
        for (const m of result.milestones) {
          await UserStorageService.addMilestone(user.uid, {
            ...m,
            isAutoDetected: true,
          });
        }
      }
    } catch (err: any) {
      console.error("Error auto-detecting milestones:", err);
      setError(err.message || "Failed to auto-detect milestones");
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Source Filter: 'all' | 'milestones' | 'decisions' | 'reflections'
  const [sourceFilter, setSourceFilter] = useState<"all" | "milestones" | "decisions" | "reflections">("all");

  const handleDeleteMilestone = async (id: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to remove this milestone from your growth timeline?")) {
      await UserStorageService.deleteMilestone(user.uid, id);
    }
  };

  // Build unified chronological timeline items
  interface TimelineEvent {
    id: string;
    type: "milestone" | "decision" | "reflection";
    date: string;
    title: string;
    subtitle?: string;
    description?: string;
    keyLearning?: string;
    categoryBadge: { label: string; icon: string; badge: string; dot: string };
    impactBadge?: { label: string; badge: string };
    statusBadge?: { label: string; badge: string };
    tags?: string[];
    isAutoDetected?: boolean;
    rawMilestoneId?: string;
  }

  const allTimelineEvents: TimelineEvent[] = [
    // 1. Growth Milestones
    ...milestones.map((m) => ({
      id: m.id,
      type: "milestone" as const,
      date: m.date,
      title: m.title,
      description: m.description,
      keyLearning: m.keyLearning,
      categoryBadge: CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.breakthrough,
      impactBadge: IMPACT_CONFIG[m.impactLevel] || IMPACT_CONFIG.significant,
      tags: m.tags,
      isAutoDetected: m.isAutoDetected,
      rawMilestoneId: m.id,
    })),

    // 2. Decisions & Crossroads
    ...decisions.map((d) => {
      const chosenOpt = d.options?.find((o) => o.id === d.chosenOptionId);
      const calibration = d.postDecisionReview?.calibrationInsight;
      return {
        id: `decision-${d.id}`,
        type: "decision" as const,
        date: d.postDecisionReview?.reflectedAt || d.updatedAt || d.createdAt,
        title: d.title,
        subtitle: chosenOpt ? `Chosen Path: "${chosenOpt.title}"` : "Crossroads Evaluation in Progress",
        description: d.decisionRationale || `Explored ${d.options?.length || 2} strategic options with values alignment for ${d.category}.`,
        keyLearning: calibration?.synthesizedTakeaway || d.postDecisionReview?.selfLearning || d.postDecisionReview?.lessonsLearned || (chosenOpt ? "Decided by You with sovereign agency." : undefined),
        categoryBadge: {
          label: "Crossroads Decision",
          icon: "🧭",
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          dot: "bg-indigo-600",
        },
        statusBadge: d.status === "decided" || d.status === "post_reflection"
          ? { label: "Decided by You", badge: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" }
          : { label: "Evaluating", badge: "bg-slate-100 text-slate-700 border-slate-200" },
        tags: [d.category, ...(d.postDecisionReview ? ["Calibrated"] : [])],
      };
    }),

    // 3. Meaningful Journal Reflections (entries with summaries, reframing, or starred)
    ...entries
      .filter((e) => e.reframing || e.summary || e.isFavorite || e.moodScore !== 0)
      .map((e) => ({
        id: `entry-${e.id}`,
        type: "reflection" as const,
        date: e.createdAt,
        title: e.title,
        description: e.summary || (e.content.length > 200 ? e.content.slice(0, 200) + "..." : e.content),
        keyLearning: e.reframing || e.actionItem,
        categoryBadge: {
          label: `Journal • ${e.mood.charAt(0).toUpperCase() + e.mood.slice(1)}`,
          icon: "📖",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
        },
        tags: e.tags,
      })),
  ];

  // Apply filters
  const filteredEvents = allTimelineEvents
    .filter((event) => {
      // Source filter
      if (sourceFilter === "milestones" && event.type !== "milestone") return false;
      if (sourceFilter === "decisions" && event.type !== "decision") return false;
      if (sourceFilter === "reflections" && event.type !== "reflection") return false;

      // Category filter (for milestones)
      if (filterCategory !== "all") {
        if (event.type === "milestone") {
          const m = milestones.find((item) => item.id === event.rawMilestoneId);
          if (m && m.category !== filterCategory) return false;
        } else if (event.type === "decision" && filterCategory !== "decision_point") {
          return false;
        } else if (event.type === "reflection" && filterCategory !== "emotional_milestone") {
          return false;
        }
      }

      // Impact filter (for milestones)
      if (filterImpact !== "all" && event.type === "milestone") {
        const m = milestones.find((item) => item.id === event.rawMilestoneId);
        if (m && m.impactLevel !== filterImpact) return false;
      }

      // Time Range Filtering
      if (timeRange !== "all") {
        const eventDate = new Date(event.date);
        const now = new Date();
        if (timeRange === "this_month") {
          if (eventDate.getFullYear() !== now.getFullYear() || eventDate.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (timeRange === "past_3_months") {
          const past3M = new Date();
          past3M.setMonth(past3M.getMonth() - 3);
          if (eventDate < past3M) return false;
        } else if (timeRange === "past_year") {
          const past1Y = new Date();
          past1Y.setFullYear(past1Y.getFullYear() - 1);
          if (eventDate < past1Y) return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div id="personal-growth-timeline-container" className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold tracking-wide">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chronological Life Journey & Evolution</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Personal Growth Timeline
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            A milestone chronicle of your mindset shifts, internal breakthroughs, decisions, and resilience victories across time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleAutoDetectMilestones}
            disabled={isAutoDetecting || (entries.length === 0 && decisions.length === 0)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-semibold text-xs transition border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            {isAutoDetecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Corpus...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Auto-Detect Milestones</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsAddingCustom(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Milestone</span>
          </button>
        </div>
      </div>

      {/* Source & Category Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        {/* Source Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-indigo-600" /> View Stream:
          </span>
          {[
            { id: "all", label: `All Moments (${allTimelineEvents.length})` },
            { id: "milestones", label: `✨ Milestones (${milestones.length})` },
            { id: "decisions", label: `🧭 Decisions (${decisions.length})` },
            { id: "reflections", label: `📖 Journal Insights (${allTimelineEvents.filter(e => e.type === "reflection").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSourceFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                sourceFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Focus:
            </span>
            {[
              { id: "all", label: "All Themes" },
              { id: "breakthrough", label: "✨ Breakthroughs" },
              { id: "mindset_shift", label: "💡 Mindset Shifts" },
              { id: "decision_point", label: "🧭 Decisions" },
              { id: "emotional_milestone", label: "🌿 Resilience" },
              { id: "life_transition", label: "🚀 Transitions" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  filterCategory === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Impact Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Impact:</label>
            <select
              value={filterImpact}
              onChange={(e) => setFilterImpact(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="all">All Impact Levels</option>
              <option value="transformational">Transformational</option>
              <option value="significant">Significant</option>
              <option value="notable">Notable</option>
            </select>
          </div>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Time Period:
          </span>
          {[
            { id: "all", label: "All Time" },
            { id: "this_month", label: "This Month" },
            { id: "past_3_months", label: "Past 3 Months" },
            { id: "past_year", label: "Past Year" },
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setTimeRange(period.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                timeRange === period.id
                  ? "bg-indigo-100 text-indigo-900 font-semibold border border-indigo-300"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {period.label}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 ml-auto">
            Showing {filteredEvents.length} chronological moments
          </span>
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
            ⏳
          </div>
          <h3 className="text-lg font-bold text-slate-900">Your Growth Timeline is Waiting</h3>
          <p className="text-sm text-slate-600">
            Chronicle your breakthrough moments and mindset shifts, or click "Auto-Detect Milestones" to let Gemini extract them from your journals and decision logs.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleAutoDetectMilestones}
              disabled={isAutoDetecting || (entries.length === 0 && decisions.length === 0)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Auto-Detect</span>
            </button>
            <button
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Milestone</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredEvents.map((event, idx) => {
            return (
              <div key={event.id || idx} className="relative group">
                {/* Node marker */}
                <div className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${event.categoryBadge.dot} z-10`} />

                {/* Timeline Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${event.categoryBadge.badge}`}>
                        {event.categoryBadge.icon} {event.categoryBadge.label}
                      </span>
                      {event.statusBadge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${event.statusBadge.badge}`}>
                          {event.statusBadge.label}
                        </span>
                      )}
                      {event.impactBadge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${event.impactBadge.badge}`}>
                          {event.impactBadge.label}
                        </span>
                      )}
                      {event.isAutoDetected && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" /> AI Discovered
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      {event.type === "milestone" && event.rawMilestoneId && (
                        <button
                          onClick={() => handleDeleteMilestone(event.rawMilestoneId!)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
                    {event.subtitle && (
                      <p className="text-xs font-medium text-indigo-700 mt-0.5">{event.subtitle}</p>
                    )}
                    {event.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{event.description}</p>
                    )}
                  </div>

                  {/* Key Wisdom & Takeaway */}
                  {event.keyLearning && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                      <span className="font-bold text-indigo-700 flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5" /> Distilled Reflection & Heuristic:
                      </span>
                      <p className="leading-relaxed italic">"{event.keyLearning}"</p>
                    </div>
                  )}

                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {event.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD CUSTOM MILESTONE */}
      {isAddingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span>Add Life Milestone or Mindset Shift</span>
              </div>
              <button onClick={() => setIsAddingCustom(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Realized Boundaries Are An Act of Self-Love"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MilestoneCategory)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Impact</label>
                  <select
                    value={impactLevel}
                    onChange={(e) => setImpactLevel(e.target.value as MilestoneImpact)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <option value="notable">Notable</option>
                    <option value="significant">Significant</option>
                    <option value="transformational">Transformational</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Context & Experience Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What happened? What triggered this realization?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Distilled Core Wisdom / Lesson *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My worth is not tied to constant productivity."
                  value={keyLearning}
                  onChange={(e) => setKeyLearning(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !keyLearning.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition shadow-sm disabled:opacity-50"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
