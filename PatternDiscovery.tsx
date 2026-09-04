/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  BrainCircuit, 
  Flame, 
  ShieldAlert, 
  BatteryCharging, 
  CheckCircle2, 
  Compass, 
  RefreshCw, 
  Layers, 
  Target, 
  Clock, 
  ArrowUpRight, 
  Zap,
  Activity
} from "lucide-react";
import { DecisionItem, JournalEntry, PatternDiscoveryResult } from "../types";
import { UserStorageService } from "../lib/storage";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface PatternDiscoveryProps {
  entries: JournalEntry[];
  decisions?: DecisionItem[];
}

export const PatternDiscovery: React.FC<PatternDiscoveryProps> = ({ entries, decisions = [] }) => {
  const { user } = useAuth();
  const [pattern, setPattern] = useState<PatternDiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPattern(null);
      return;
    }
    UserStorageService.getLatestPattern(user.uid).then((res) => {
      if (res) setPattern(res);
    });
  }, [user]);

  const handleDiscoverPatterns = async () => {
    if (!user || entries.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.discoverPatterns(entries, decisions, user.token);
      const newPattern: PatternDiscoveryResult = {
        id: "pattern-" + Date.now(),
        userId: user.uid,
        analyzedAt: new Date().toISOString(),
        entriesAnalyzedCount: entries.length,
        ...data,
      };

      await UserStorageService.savePattern(user.uid, newPattern);
      setPattern(newPattern);
    } catch (err: any) {
      console.error("Failed to run pattern discovery:", err);
      setError(err.message || "Failed to scan journal history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="pattern-discovery-container" className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold tracking-wide">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cross-Journal Pattern Discovery Engine</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
              <span>Observational • Non-Diagnostic</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Cognitive Loops & Emotional Anchors
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            Synthesizes your personal journal reflections and crossroads decisions to surface recurring thoughts, behaviors, values, and decision habits over time.
          </p>
        </div>

        <button
          onClick={handleDiscoverPatterns}
          disabled={loading || entries.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold text-sm transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Scanning History...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Scan Patterns ({entries.length} Entries{decisions.length > 0 ? `, ${decisions.length} Decisions` : ""})</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pattern ? (
        <div className="space-y-6">
          {/* Top Metric Row: Value Congruence & Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Value Congruence Gauge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Value Congruence
                </span>
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{pattern.valueCongruenceScore}%</span>
                <span className="text-xs text-slate-500">alignment score</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, pattern.valueCongruenceScore))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Measures how closely your day-to-day actions in journal logs match your stated core values.
              </p>
            </div>

            {/* Analyzed Corpus */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Scanned Corpus
                </span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{pattern.entriesAnalyzedCount}</span>
                <span className="text-xs text-slate-500">reflections synthesized</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Last updated on {new Date(pattern.analyzedAt).toLocaleDateString()} at {new Date(pattern.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>

            {/* Natural Behavioral Cycles Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Behavioral Rhythm
                </span>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                {pattern.behavioralCyclesSummary}
              </p>
              <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">Discovered from longitudinal timestamps</span>
            </div>
          </div>

          {/* Section 1: Cognitive Loops & Reframing Strategies */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              Recurring Cognitive Loops & Reframing Strategies
            </h3>
            <p className="text-xs text-slate-600">
              Patterns where your thoughts repeat during stress or uncertainty, paired with evidence-based reframing techniques.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {pattern.cognitiveLoops.map((loop, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{loop.loopName}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-100">
                        Triggered Loop
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Trigger: </span>{loop.trigger}
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Impact: </span>{loop.impact}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                    <span className="font-bold text-indigo-700 block">✨ Cognitive Reframing Strategy:</span>
                    <p className="leading-relaxed">{loop.reframingStrategy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Emotional Anchors (Restorative vs. Depleting) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restorative Anchors */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                Restorative Energy Anchors
              </h3>
              <div className="space-y-3">
                {pattern.emotionalAnchors.filter(a => a.category === 'restorative').map((anchor, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950">{anchor.theme}</span>
                      <span className="text-[10px] text-emerald-700 font-medium">{anchor.frequencyObservation}</span>
                    </div>
                    <p className="text-xs text-slate-700">{anchor.description}</p>
                    <div className="text-[11px] font-medium text-emerald-800 pt-1">
                      🌱 <span className="font-semibold">Action:</span> {anchor.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Depleting Anchors */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                Energy Depleting Dynamics
              </h3>
              <div className="space-y-3">
                {pattern.emotionalAnchors.filter(a => a.category === 'depleting').map((anchor, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-950">{anchor.theme}</span>
                      <span className="text-[10px] text-rose-700 font-medium">{anchor.frequencyObservation}</span>
                    </div>
                    <p className="text-xs text-slate-700">{anchor.description}</p>
                    <div className="text-[11px] font-medium text-rose-800 pt-1">
                      🛡️ <span className="font-semibold">Boundary:</span> {anchor.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Peak Clarity Conditions & Value Congruence Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Clarity Conditions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Discovered Peak Clarity Conditions
              </h3>
              <p className="text-xs text-slate-500">
                Moments when your reflections exhibited high emotional coherence and grounded purpose:
              </p>
              <div className="space-y-2.5">
                {pattern.peakClarityConditions?.map((cond, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950 flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{cond}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Congruence Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                Value Congruence Breakdown
              </h3>
              <div className="space-y-3">
                {pattern.valueCongruenceBreakdown?.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.value}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.alignmentStatus === 'aligned' ? 'bg-emerald-100 text-emerald-800' :
                        item.alignmentStatus === 'drifting' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.alignmentStatus === 'aligned' ? '✓ Aligned' :
                         item.alignmentStatus === 'drifting' ? '⚠️ Drifting' : '🌱 Under-Nurtured'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{item.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Actionable Daily Micro-Habits */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Tailored Daily Micro-Habits (&lt; 5 Minutes)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {pattern.actionableMicroHabits?.map((habit, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-800/80 border border-indigo-500/30 text-xs text-slate-200 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{habit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
            🧠
          </div>
          <h3 className="text-lg font-bold text-slate-900">Discover Your Cognitive Landscape</h3>
          <p className="text-sm text-slate-600">
            Scan your private journal entries to extract longitudinal emotional trends, discover recurring cognitive loops, and unlock actionable micro-habits.
          </p>
          <button
            onClick={handleDiscoverPatterns}
            disabled={loading || entries.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Pattern Discovery Scan</span>
          </button>
        </div>
      )}
    </div>
  );
};
