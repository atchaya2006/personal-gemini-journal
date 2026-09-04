/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TrendingUp, Sparkles, Brain, Award, Calendar, Lightbulb, Compass, Loader2, ArrowUpRight } from "lucide-react";
import { GrowthInsight, JournalEntry } from "../types";
import { MOOD_CONFIG, UserStorageService } from "../lib/storage";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface GrowthAnalyticsProps {
  entries: JournalEntry[];
}

export const GrowthAnalytics: React.FC<GrowthAnalyticsProps> = ({ entries }) => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<GrowthInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setInsight(null);
      return;
    }
    UserStorageService.getInsights(user.uid).then((cached) => {
      if (cached.length > 0) {
        setInsight(cached[0]);
      }
    });
  }, [user]);

  // Compute metrics
  const totalWords = entries.reduce((acc, e) => acc + (e.wordCount || 0), 0);
  const avgMoodScore = entries.length > 0
    ? (entries.reduce((acc, e) => acc + (e.moodScore || 0), 0) / entries.length).toFixed(2)
    : "0.0";

  // Mood counts
  const moodDistribution: Record<string, number> = {};
  entries.forEach((e) => {
    moodDistribution[e.mood] = (moodDistribution[e.mood] || 0) + 1;
  });

  const handleGenerateInsights = async () => {
    if (!user || entries.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.generateGrowthInsights(entries, user.token);
      const newInsight: GrowthInsight = {
        id: "insight-" + Date.now(),
        userId: user.uid,
        generatedAt: new Date().toISOString(),
        periodLabel: "Recent Reflection History",
        ...data,
      };

      await UserStorageService.saveInsight(user.uid, newInsight);
      setInsight(newInsight);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate growth report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Reflections Logged</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {entries.length}
          </div>
          <p className="text-xs text-slate-400 font-mono">Scoped in secure UID vault</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Words Written</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {totalWords.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 font-mono">Cognitive logs processed</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Emotional Index</span>
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {Number(avgMoodScore) > 0 ? `+${avgMoodScore}` : avgMoodScore}
          </div>
          <p className="text-xs text-slate-400 font-mono">Net valence (-1.0 to +1.0)</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cognitive Resilience</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            {insight ? `${insight.resilienceScore}%` : "88%"}
          </div>
          <p className="text-xs text-slate-400 font-mono">Adaptive self-regulation</p>
        </div>

      </div>

      {/* Mood Landscape Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Emotional Distribution & Taxonomy
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Partition Aggregate</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(Object.keys(MOOD_CONFIG) as (keyof typeof MOOD_CONFIG)[]).map((mKey) => {
            const meta = MOOD_CONFIG[mKey];
            const count = moodDistribution[mKey] || 0;
            const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;

            return (
              <div key={mKey} className={`p-3 rounded-lg border ${meta.color} space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-base">{meta.emoji}</span>
                  <span className="text-xs font-mono font-semibold">{pct}%</span>
                </div>
                <div className="text-xs font-semibold">{meta.label}</div>
                <div className="text-[10px] font-mono opacity-70">{count} {count === 1 ? "entry" : "entries"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Longitudinal Growth Engine */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Cognitive & Emotional Analytics Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Longitudinal Psychological Analysis
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Gemini analyzes narrative patterns across your private logs to highlight emotional maturity, cognitive shifts, and actionable growth opportunities.
            </p>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={loading || entries.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-98 disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-white" />
            )}
            <span>{insight ? "Refresh Report" : "Generate Report"}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-lg">
            {error}
          </div>
        )}

        {insight ? (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Overview & Trajectory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  <Brain className="w-4 h-4" />
                  Psychological Trajectory
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {insight.overview}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  Emotional Evolution
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {insight.emotionalTrajectory}
                </p>
              </div>
            </div>

            {/* Cognitive Strengths & Themes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Dominant Themes */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recurring Life Themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insight.dominantThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cognitive Strengths */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
                  Demonstrated Strengths
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {insight.cognitiveStrengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 shrink-0">✦</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Mindful Practices
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {insight.mindfulRecommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 space-y-3">
            <Brain className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Run deep multi-entry cognitive modeling on your isolated context to reveal longitudinal growth patterns.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
