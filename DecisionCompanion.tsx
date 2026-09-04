/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Compass, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  AlertCircle, 
  ArrowRight, 
  Scale, 
  Layers, 
  ChevronRight, 
  Check, 
  Trash2, 
  Lightbulb, 
  BrainCircuit, 
  RefreshCw, 
  Award, 
  X,
  BookOpen,
  Calendar,
  Zap,
  StopCircle,
  Lock,
  RotateCcw,
  ShieldCheck,
  CheckSquare,
  FileEdit,
  Sliders
} from "lucide-react";
import { DecisionCategory, DecisionItem, DecisionOption, JournalEntry, PostDecisionReview } from "../types";
import { UserStorageService } from "../lib/storage";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface DecisionCompanionProps {
  decisions: DecisionItem[];
  journalEntries: JournalEntry[];
  onOpenJournalModal?: (entryId: string) => void;
}

const CATEGORY_CONFIG: Record<DecisionCategory, { label: string; icon: string; color: string; badge: string }> = {
  career: { label: "Career & Vocation", icon: "💼", color: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  life: { label: "Life & Direction", icon: "🧭", color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  relationships: { label: "Relationships", icon: "🌱", color: "bg-pink-500", badge: "bg-pink-50 text-pink-700 border-pink-200" },
  wellbeing: { label: "Wellbeing & Health", icon: "🌿", color: "bg-teal-500", badge: "bg-teal-50 text-teal-700 border-teal-200" },
  finance: { label: "Finance & Security", icon: "💎", color: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  creativity: { label: "Creativity & Art", icon: "🎨", color: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  philosophy: { label: "Ethics & Philosophy", icon: "⚖️", color: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

export const DecisionCompanion: React.FC<DecisionCompanionProps> = ({ decisions, journalEntries }) => {
  const { user } = useAuth();
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Creation form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<DecisionCategory>("life");
  const [newUrgency, setNewUrgency] = useState<'low' | 'medium' | 'high'>("medium");
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingSeconds, setAnalyzingSeconds] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any pending abort controllers on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Sync selectedDecision if Firestore updates in real-time
  useEffect(() => {
    if (selectedDecision) {
      const found = decisions.find(d => d.id === selectedDecision.id);
      if (found) {
        setSelectedDecision(found);
      }
    }
  }, [decisions]);

  // Decision resolution modal state
  const [isResolving, setIsResolving] = useState(false);
  const [chosenOptionId, setChosenOptionId] = useState<string>("");
  const [decisionRationale, setDecisionRationale] = useState<string>("");

  // Deliberation scratchpad notes (for "Keep Exploring")
  const [deliberationNote, setDeliberationNote] = useState<string>("");
  const [isSavingDeliberation, setIsSavingDeliberation] = useState(false);
  const [deliberationSavedSuccess, setDeliberationSavedSuccess] = useState(false);

  // Post-decision review modal state with 7-part calibration arc
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewOutcomes, setReviewOutcomes] = useState("");
  const [reviewSurprises, setReviewSurprises] = useState("");
  const [reviewAccuratePredictions, setReviewAccuratePredictions] = useState("");
  const [reviewWrongAssumptions, setReviewWrongAssumptions] = useState("");
  const [reviewSatisfactionScore, setReviewSatisfactionScore] = useState<number>(8);
  const [reviewRepeatChoice, setReviewRepeatChoice] = useState<'yes' | 'nuanced' | 'no'>('yes');
  const [reviewSelfLearning, setReviewSelfLearning] = useState("");
  const [reviewIntuition, setReviewIntuition] = useState<PostDecisionReview['intuitionAccuracy']>("moderate");
  const [reviewLessons, setReviewLessons] = useState("");
  const [reviewEmotionalState, setReviewEmotionalState] = useState("");
  const [reviewAIInsight, setReviewAIInsight] = useState<any | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // User notes state for reflective questions
  const [clarificationNotes, setClarificationNotes] = useState<Record<string, string>>({});

  // Sync internal state when user opens a specific decision
  useEffect(() => {
    if (selectedDecision) {
      setDeliberationNote(selectedDecision.userClarificationNotes?.deliberation_scratchpad || "");
      setClarificationNotes(selectedDecision.userClarificationNotes || {});
      setChosenOptionId(selectedDecision.chosenOptionId || (selectedDecision.options[0]?.id || ""));
      setDecisionRationale(selectedDecision.decisionRationale || "");

      // Populate existing calibration review if already recorded
      if (selectedDecision.postDecisionReview) {
        setReviewOutcomes(selectedDecision.postDecisionReview.outcomesObserved || "");
        setReviewSurprises(selectedDecision.postDecisionReview.surprises || "");
        setReviewAccuratePredictions(selectedDecision.postDecisionReview.accuratePredictions || "");
        setReviewWrongAssumptions(selectedDecision.postDecisionReview.wrongAssumptions || "");
        setReviewSatisfactionScore(selectedDecision.postDecisionReview.satisfactionScore ?? 8);
        setReviewRepeatChoice(selectedDecision.postDecisionReview.repeatChoice || "yes");
        setReviewSelfLearning(selectedDecision.postDecisionReview.selfLearning || selectedDecision.postDecisionReview.lessonsLearned || "");
        setReviewIntuition(selectedDecision.postDecisionReview.intuitionAccuracy || "moderate");
        setReviewLessons(selectedDecision.postDecisionReview.lessonsLearned || "");
        if (selectedDecision.postDecisionReview.calibrationInsight) {
          setReviewAIInsight(selectedDecision.postDecisionReview.calibrationInsight);
        }
      } else {
        setReviewOutcomes("");
        setReviewSurprises("");
        setReviewAccuratePredictions("");
        setReviewWrongAssumptions("");
        setReviewSatisfactionScore(8);
        setReviewRepeatChoice("yes");
        setReviewSelfLearning("");
        setReviewLessons("");
        setReviewAIInsight(null);
      }
    }
  }, [selectedDecision?.id]);

  const handleAddCustomOption = () => {
    if (!customOptionInput.trim()) return;
    setCustomOptions([...customOptions, customOptionInput.trim()]);
    setCustomOptionInput("");
  };

  const handleRemoveCustomOption = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setAnalysisError("Decision analysis was cancelled.");
  };

  // Demo helpers for live presentations
  const handleLoadDemoDilemma = () => {
    setNewTitle("Senior Tech Lead at Stable Firm vs. Founding Architect at Climate Startup");
    setNewCategory("career");
    setNewUrgency("medium");
    setNewDescription(
      "I am facing a major career crossroads: continue in my predictable, highly compensated Senior Engineer role at an established software firm, OR accept an invitation to join an early-stage Climate Tech initiative as Founding Lead. Staying guarantees financial security, standard hours, and familiar colleagues, but my work feels routine and uninspiring. Joining the startup involves a 35% base pay reduction and significant market ambiguity, but directly aligns with my passion for environmental stewardship and grants total architectural autonomy. I notice hesitation stemming from financial runway fear, but staying feels like slow cognitive stagnation."
    );
    setCustomOptions([
      "Option 1: Remain at Stable Firm (Preserve Financial Security & Pursue Side Projects)",
      "Option 2: Join Climate Startup as Founding Lead (Embrace Autonomy & Deep Impact)"
    ]);
  };

  const handleLoadDemoCalibration = () => {
    setReviewOutcomes(
      "I committed to Option 2 and joined the Climate Tech venture as Founding Lead. In the first 90 days, we successfully engineered and deployed our carbon telemetry MVP to three pilot manufacturing clients. The daily pace is demanding and required disciplined personal budgeting, but my intellectual vitality and sense of purpose have increased tenfold."
    );
    setReviewSurprises(
      "Operating in ambiguity was surprisingly invigorating rather than paralyzing. What surprised me was how little I missed the corporate bureaucracy and consensus-driven meetings."
    );
    setReviewAccuratePredictions(
      "I predicted that having genuine creative ownership would reignite my motivation to code; this proved 100% accurate."
    );
    setReviewWrongAssumptions(
      "I assumed taking a 35% pay cut would cause constant daily anxiety; in practice, intentional spending and zero burnout brought much deeper serenity."
    );
    setReviewSatisfactionScore(9);
    setReviewRepeatChoice("yes");
    setReviewSelfLearning(
      "I thrive under high trust, mission alignment, and autonomy. My prior hesitation was merely fear of shedding comfortable golden handcuffs."
    );
    setReviewIntuition("high");
    setReviewLessons(
      "Always prioritize authentic intrinsic alignment over artificial certainty."
    );
    setReviewEmotionalState("Grounded, purposeful, and deeply energized.");
  };

  const handleCreateAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newDescription.trim() || isAnalyzing) return;

    // Abort previous if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    setAnalyzingSeconds(0);
    setAnalysisError(null);

    const timer = setInterval(() => {
      setAnalyzingSeconds((s) => s + 1);
    }, 1000);

    try {
      // 1. Prepare concise, high-signal journal context (top 3 most recent entries, max 140 chars each)
      const conciseJournalContext = (journalEntries || []).slice(0, 3).map((e) => ({
        title: e.title?.slice(0, 80) || "Entry",
        content: (e.summary || e.content || "").slice(0, 140),
        mood: e.mood,
        createdAt: e.createdAt,
      }));

      // 2. Send to server-side Gemini decision intelligence endpoint
      const analysis = await api.analyzeDecision(
        {
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          urgency: newUrgency,
          userProvidedOptions: customOptions.length > 0 ? customOptions : undefined,
          journalContext: conciseJournalContext.length > 0 ? conciseJournalContext : undefined,
        },
        user.token,
        controller.signal
      );

      // 3. Persist directly to isolated user Firestore
      const newDecision = await UserStorageService.addDecision(user.uid, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        urgency: newUrgency,
        status: "evaluating",
        options: analysis.options || [],
        emotionalConcerns: analysis.emotionalConcerns || [],
        practicalConcerns: analysis.practicalConcerns || [],
        hiddenAssumptions: analysis.hiddenAssumptions || [],
        reflectiveQuestions: analysis.reflectiveQuestions || [],
        journalContextInsights: analysis.journalContextInsights || [],
      });

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setCustomOptions([]);
      setIsCreating(false);
      setSelectedDecision(newDecision);
    } catch (err: any) {
      console.error("Decision analysis failed:", err);
      setAnalysisError(err.message || "Failed to analyze decision. Please try again.");
    } finally {
      clearInterval(timer);
      abortControllerRef.current = null;
      setIsAnalyzing(false);
    }
  };

  const handleSaveDeliberation = async () => {
    if (!user || !selectedDecision) return;
    setIsSavingDeliberation(true);
    try {
      const updatedNotes = {
        ...(selectedDecision.userClarificationNotes || {}),
        deliberation_scratchpad: deliberationNote.trim(),
        last_deliberation_at: new Date().toISOString(),
      };
      const updated: DecisionItem = {
        ...selectedDecision,
        status: "evaluating",
        userClarificationNotes: updatedNotes,
      };
      await UserStorageService.updateDecision(user.uid, updated);
      setSelectedDecision(updated);
      setDeliberationSavedSuccess(true);
      setTimeout(() => setDeliberationSavedSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to save deliberation notes:", err);
    } finally {
      setIsSavingDeliberation(false);
    }
  };

  const handleReopenDecision = async () => {
    if (!user || !selectedDecision) return;
    if (confirm("Re-open this crossroads to evaluating mode? You can choose a different path or continue exploring.")) {
      const updated: DecisionItem = {
        ...selectedDecision,
        status: "evaluating",
        chosenOptionId: undefined,
        decisionRationale: undefined,
        postDecisionReview: undefined,
      };
      await UserStorageService.updateDecision(user.uid, updated);
      setSelectedDecision(updated);
    }
  };

  const handleQuickSelectOption = (optionId: string) => {
    setChosenOptionId(optionId);
    setDecisionRationale(selectedDecision?.decisionRationale || "");
    setIsResolving(true);
  };

  const handleSaveResolution = async () => {
    if (!user || !selectedDecision || !chosenOptionId) return;

    const updated: DecisionItem = {
      ...selectedDecision,
      chosenOptionId,
      decisionRationale: decisionRationale.trim(),
      status: "decided",
      userClarificationNotes: clarificationNotes,
    };

    await UserStorageService.updateDecision(user.uid, updated);
    setSelectedDecision(updated);
    setIsResolving(false);
  };

  const handleSubmitPostReview = async () => {
    if (!user || !selectedDecision) return;

    setIsSubmittingReview(true);
    try {
      const chosenOption = selectedDecision.options.find(o => o.id === selectedDecision.chosenOptionId);
      
      // Get AI reflection on calibration
      const aiCalibration = await api.reviewDecision(
        {
          decisionTitle: selectedDecision.title,
          chosenOptionTitle: chosenOption?.title || "Custom Path",
          predictedOutcomes: chosenOption?.potentialOutcomes,
          initialAssumptions: selectedDecision.hiddenAssumptions,
          outcomesObserved: reviewOutcomes,
          surprises: reviewSurprises,
          accuratePredictions: reviewAccuratePredictions,
          wrongAssumptions: reviewWrongAssumptions,
          satisfactionScore: reviewSatisfactionScore,
          repeatChoice: reviewRepeatChoice,
          selfLearning: reviewSelfLearning || reviewLessons,
          intuitionAccuracy: reviewIntuition,
          userLessons: reviewLessons || reviewSelfLearning,
        },
        user.token
      );

      setReviewAIInsight(aiCalibration);

      const review: PostDecisionReview = {
        reflectedAt: new Date().toISOString(),
        outcomesObserved: reviewOutcomes,
        surprises: reviewSurprises,
        accuratePredictions: reviewAccuratePredictions,
        wrongAssumptions: reviewWrongAssumptions,
        satisfactionScore: reviewSatisfactionScore,
        repeatChoice: reviewRepeatChoice,
        selfLearning: reviewSelfLearning || reviewLessons,
        intuitionAccuracy: reviewIntuition,
        lessonsLearned: reviewLessons || reviewSelfLearning,
        emotionalStateNow: reviewEmotionalState,
        calibrationInsight: aiCalibration,
      };

      const updated: DecisionItem = {
        ...selectedDecision,
        status: "post_reflection",
        postDecisionReview: review,
      };

      await UserStorageService.updateDecision(user.uid, updated);
      setSelectedDecision(updated);
    } catch (err) {
      console.error("Error submitting post-decision review:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteDecision = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    if (confirm("Are you sure you want to delete this decision reflection?")) {
      await UserStorageService.deleteDecision(user.uid, id);
      if (selectedDecision?.id === id) {
        setSelectedDecision(null);
      }
    }
  };

  // Filtered decisions
  const filteredDecisions = decisions.filter(d => {
    if (filterCategory !== "all" && d.category !== filterCategory) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  return (
    <div id="decision-companion-container" className="space-y-6 animate-fadeIn pb-12">
      {/* Header & Value Proposition */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold tracking-wide">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Decision Intelligence & Life Socratic Companion</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Decision Companion
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            Describe a real-life crossroads. Gemini cross-references your journal history to illuminate distinct paths, hidden assumptions, emotional blindspots, and Socratic clarifying questions — without making the decision for you.
          </p>
        </div>
        <button
          id="btn-new-decision"
          onClick={() => {
            setIsCreating(true);
            setSelectedDecision(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold text-sm transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Decision</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Decisions" },
            { id: "evaluating", label: "Evaluating", count: decisions.filter(d => d.status === "evaluating").length },
            { id: "decided", label: "Decided", count: decisions.filter(d => d.status === "decided").length },
            { id: "post_reflection", label: "Reviewed", count: decisions.filter(d => d.status === "post_reflection").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label} {tab.count !== undefined ? `(${tab.count})` : ""}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout: List & Selected View */}
      {selectedDecision ? (
        /* Detailed Decision Intelligence View */
        <div className="space-y-6">
          {/* Back button & Meta banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDecision(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer text-xs font-medium inline-flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>All Decisions</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_CONFIG[selectedDecision.category]?.badge}`}>
                    {CATEGORY_CONFIG[selectedDecision.category]?.icon} {CATEGORY_CONFIG[selectedDecision.category]?.label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedDecision.status === 'evaluating' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    selectedDecision.status === 'decided' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}>
                    {selectedDecision.status === 'evaluating' ? '⚖️ Evaluating (Choice Pending)' :
                     selectedDecision.status === 'decided' ? '✓ Decided by You' : '✨ Post-Decision Review'}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{selectedDecision.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedDecision.status === "evaluating" && (
                <button
                  onClick={() => {
                    setIsResolving(true);
                    setChosenOptionId(selectedDecision.options[0]?.id || "");
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Choose an Option</span>
                </button>
              )}

              {selectedDecision.status === "decided" && (
                <>
                  <button
                    onClick={() => {
                      setIsReviewing(true);
                      setReviewAIInsight(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>Conduct Post-Decision Calibration</span>
                  </button>
                  <button
                    onClick={handleReopenDecision}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    title="Re-open this crossroads to exploring state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-open Crossroads</span>
                  </button>
                </>
              )}

              {selectedDecision.status === "post_reflection" && (
                <button
                  onClick={() => {
                    setIsReviewing(true);
                    setReviewAIInsight(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 font-medium text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>Review Calibration</span>
                </button>
              )}

              <button
                onClick={(e) => handleDeleteDecision(selectedDecision.id, e)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Delete decision"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dilemma Summary & Journal Historical Connections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                The Core Crossroads & Context
              </h3>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedDecision.description}
              </p>

              {/* If already decided, show resolution */}
              {selectedDecision.chosenOptionId && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Your Chosen Path:</span>
                    <span className="text-slate-900 font-bold">
                      {selectedDecision.options.find(o => o.id === selectedDecision.chosenOptionId)?.title || "Custom Resolved Path"}
                    </span>
                  </div>
                  {selectedDecision.decisionRationale && (
                    <p className="text-xs text-slate-700 mt-2 italic bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                      "{selectedDecision.decisionRationale}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Journal History & Contextual Anchors */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Past Journal Signals & Patterns
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Observational Evidence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                These signals highlight recurring themes and cognitive patterns from your past journal entries to inform your discernment, not to prescribe your choice.
              </p>
              {selectedDecision.journalContextInsights && selectedDecision.journalContextInsights.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {selectedDecision.journalContextInsights.map((insight, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 leading-relaxed">
                      💡 {insight}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Reflected against your general emotional baseline. Add more journal entries to deepen contextual pattern matching.
                </p>
              )}
            </div>
          </div>

          {/* Options Comparison Matrix */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Comparative Options & Trajectory Forecasting
              </h3>
              <span className="text-xs text-slate-500">
                All candidate paths are evaluated neutrally with equal weight
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {selectedDecision.options.map((opt, idx) => {
                const isChosen = selectedDecision.chosenOptionId === opt.id;
                return (
                  <div
                    key={opt.id || idx}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      isChosen 
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/10" 
                        : "border-slate-200 shadow-sm hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                          Option {idx + 1}
                        </span>
                        {isChosen && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            <Check className="w-3 h-3" /> Selected Choice
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900">{opt.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{opt.summary}</p>
                      </div>

                      {/* Scores */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Values Alignment</span>
                          <span className="text-sm font-bold text-indigo-600">{opt.valuesAlignmentScore || 8} / 10</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Feasibility</span>
                          <span className="text-sm font-bold text-emerald-600">{opt.feasibilityScore || 7} / 10</span>
                        </div>
                      </div>

                      {/* Pros & Cons */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <span className="text-xs font-semibold text-emerald-700 block mb-1.5">✓ Key Advantages (Pros):</span>
                          <ul className="space-y-1">
                            {opt.pros.map((pro, pIdx) => (
                              <li key={pIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-rose-700 block mb-1.5">✕ Trade-offs & Risks (Cons):</span>
                          <ul className="space-y-1">
                            {opt.cons.map((con, cIdx) => (
                              <li key={cIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Potential Outcomes */}
                      {opt.potentialOutcomes && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 mt-3">
                          <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">Scenario Trajectories:</div>
                          <div>
                            <span className="font-semibold text-emerald-700">Best Case: </span>
                            <span className="text-slate-600">{opt.potentialOutcomes.bestCase}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Most Likely: </span>
                            <span className="text-slate-600">{opt.potentialOutcomes.mostLikely}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-rose-700">Worst Case: </span>
                            <span className="text-slate-600">{opt.potentialOutcomes.worstCase}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Choose button if in evaluation mode */}
                    {selectedDecision.status === "evaluating" && !isChosen && (
                      <button
                        onClick={() => handleQuickSelectOption(opt.id)}
                        className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200 inline-flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Choose Option {idx + 1}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEDICATED SECTION: YOUR CHOICE & SOVEREIGN AGENCY */}
          <div id="your-choice-section" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Choice & Sovereign Agency</h3>
                  <p className="text-xs text-slate-500">
                    The AI illuminates options neutrally. The agency and decision are 100% yours.
                  </p>
                </div>
              </div>

              <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
                selectedDecision.status === 'evaluating' ? 'bg-amber-100 text-amber-800' :
                selectedDecision.status === 'decided' ? 'bg-emerald-100 text-emerald-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {selectedDecision.status === 'evaluating' ? '⚖️ Choice Pending' :
                 selectedDecision.status === 'decided' ? '✓ Decided' : '✨ Post-Decision Review'}
              </span>
            </div>

            {selectedDecision.status === "evaluating" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select a candidate path when you feel grounded, or continue deliberating and hold space for reflection without pressure.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Candidate Option Choices */}
                  {selectedDecision.options.map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex flex-col justify-between gap-3 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                            Option {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Values Score: {opt.valuesAlignmentScore || 8}/10
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{opt.summary}</p>
                      </div>

                      <button
                        onClick={() => handleQuickSelectOption(opt.id)}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Choose Option {idx + 1}</span>
                      </button>
                    </div>
                  ))}

                  {/* Keep Exploring / Deliberating Option */}
                  <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col justify-between gap-3 md:col-span-2 lg:col-span-1">
                    <div>
                      <div className="flex items-center gap-1.5 text-indigo-700 text-[11px] font-bold uppercase tracking-wide mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Keep Exploring (Deliberating)</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Hold Space & Gather Life Data</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Not ready to decide? Deliberating is a valid choice. Save your scratchpad thoughts below while keeping the crossroads active.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Scratchpad notes: what questions or signals are you waiting on?"
                        value={deliberationNote}
                        onChange={(e) => setDeliberationNote(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={handleSaveDeliberation}
                          disabled={isSavingDeliberation}
                          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                        >
                          {isSavingDeliberation ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileEdit className="w-3 h-3" />
                          )}
                          <span>Save Deliberation Notes</span>
                        </button>
                      </div>
                      {deliberationSavedSuccess && (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Notes saved. Decision remains in evaluating mode.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Already Decided State */
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Your Chosen Path:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedDecision.options.find(o => o.id === selectedDecision.chosenOptionId)?.title || "Custom Chosen Path"}
                    </span>
                  </div>
                  {selectedDecision.decisionRationale && (
                    <p className="text-xs text-slate-700 italic">
                      "{selectedDecision.decisionRationale}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setIsReviewing(true);
                      setReviewAIInsight(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Post-Decision Calibration</span>
                  </button>
                  <button
                    onClick={handleReopenDecision}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer inline-flex items-center gap-1"
                    title="Change your choice or continue exploring"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Change Choice</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deep Socratic Exploration: Assumptions, Concerns & Clarifying Questions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hidden Assumptions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                Hidden Assumptions Uncovered
              </h4>
              <ul className="space-y-2">
                {selectedDecision.hiddenAssumptions.map((assump, aIdx) => (
                  <li key={aIdx} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                    🔍 {assump}
                  </li>
                ))}
              </ul>
            </div>

            {/* Emotional & Practical Concerns */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Emotional & Practical Blindspots
              </h4>
              <div className="space-y-2">
                {selectedDecision.emotionalConcerns.map((ec, eIdx) => (
                  <div key={eIdx} className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 leading-relaxed">
                    💭 {ec}
                  </div>
                ))}
                {selectedDecision.practicalConcerns.map((pc, pIdx) => (
                  <div key={pIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    ⚙️ {pc}
                  </div>
                ))}
              </div>
            </div>

            {/* Socratic Clarifying Questions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Socratic Clarifying Questions
              </h4>
              <p className="text-[11px] text-slate-500">Hold space for these questions to sharpen your inner knowing:</p>
              <div className="space-y-2.5">
                {selectedDecision.reflectiveQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70 text-xs text-indigo-950 leading-relaxed">
                    ❓ {q}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post Decision Review Banner / Calibration Section */}
          {selectedDecision.postDecisionReview ? (
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-purple-800/80 shadow-md space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Post-Decision Calibration & Wisdom Harvest</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Calibrated on {new Date(selectedDecision.postDecisionReview.reflectedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedDecision.postDecisionReview.satisfactionScore !== undefined && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                      Satisfaction: {selectedDecision.postDecisionReview.satisfactionScore}/10
                    </span>
                  )}
                  {selectedDecision.postDecisionReview.repeatChoice && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {selectedDecision.postDecisionReview.repeatChoice === 'yes' ? '✓ Would Repeat Choice' :
                       selectedDecision.postDecisionReview.repeatChoice === 'nuanced' ? '⚖️ Nuanced Repeat' : '↺ Would Pivot'}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setIsReviewing(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Recalibrate
                  </button>
                </div>
              </div>

              {/* Synthesized Takeaway & Calibration Assessment */}
              {selectedDecision.postDecisionReview.calibrationInsight && (
                <div className="p-4 rounded-xl bg-purple-950/70 border border-purple-800/60 space-y-2 text-xs">
                  <span className="font-bold text-purple-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Intuition Calibration Takeaway
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {selectedDecision.postDecisionReview.calibrationInsight.synthesizedTakeaway}
                  </p>
                  {selectedDecision.postDecisionReview.calibrationInsight.intuitionCalibrationInsight && (
                    <p className="text-purple-300 pt-2 border-t border-purple-800/50 leading-relaxed">
                      <strong>Expectation vs. Reality:</strong> {selectedDecision.postDecisionReview.calibrationInsight.intuitionCalibrationInsight}
                    </p>
                  )}
                </div>
              )}

              {/* Prediction → Reality → Learning Comparison Cards */}
              {selectedDecision.postDecisionReview.calibrationInsight?.comparisonPoints && 
               selectedDecision.postDecisionReview.calibrationInsight.comparisonPoints.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Prediction → Reality → Learning Arc</span>
                  </h5>
                  <div className="space-y-2.5">
                    {selectedDecision.postDecisionReview.calibrationInsight.comparisonPoints.map((pt, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                          <span className="font-bold text-indigo-300 block text-[10px] uppercase tracking-wider mb-1">🔮 What was Anticipated</span>
                          <p className="text-slate-300 text-xs leading-relaxed">{pt.prediction}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                          <span className="font-bold text-emerald-300 block text-[10px] uppercase tracking-wider mb-1">🌿 What Materialized</span>
                          <p className="text-slate-300 text-xs leading-relaxed">{pt.reality}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/60">
                          <span className="font-bold text-purple-300 block text-[10px] uppercase tracking-wider mb-1">💡 Calibrated Wisdom</span>
                          <p className="text-slate-300 text-xs leading-relaxed">{pt.learning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observed Realities & Self-Learning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                  <span className="font-semibold text-slate-300 block">Observed Realities:</span>
                  <p className="text-slate-300 leading-relaxed">{selectedDecision.postDecisionReview.outcomesObserved}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                  <span className="font-semibold text-purple-300 block">Self-Knowledge Gained:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedDecision.postDecisionReview.selfLearning || selectedDecision.postDecisionReview.lessonsLearned}
                  </p>
                </div>
              </div>

              {/* Future Heuristics */}
              {selectedDecision.postDecisionReview.calibrationInsight?.futureHeuristics && (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                  <span className="font-semibold text-slate-300 block uppercase tracking-wide text-[11px]">
                    Future Decision Heuristics:
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {selectedDecision.postDecisionReview.calibrationInsight.futureHeuristics.map((h, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : selectedDecision.status === "decided" ? (
            <div className="p-6 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  Post-Decision Calibration Ready
                </h4>
                <p className="text-xs text-purple-800">
                  Once you take action on your chosen path and observe real-world results, calibrate your intuition to harvest lasting wisdom.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsReviewing(true);
                  setReviewAIInsight(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 inline-flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Conduct Calibration Review</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-500">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>Post-Decision Calibration</strong> is locked while evaluating. Once you make your choice and observe real-world outcomes, you can calibrate your intuition here.
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Decisions Grid / Empty State */
        <div>
          {filteredDecisions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
                🧭
              </div>
              <h3 className="text-lg font-bold text-slate-900">No decisions recorded yet</h3>
              <p className="text-sm text-slate-600">
                Facing a crossroads in your career, relationships, creative pursuits, or lifestyle? Start a new decision reflection to gain Socratic clarity.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Explore a Crossroads</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDecisions.map((decision) => (
                <div
                  key={decision.id}
                  onClick={() => setSelectedDecision(decision)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_CONFIG[decision.category]?.badge}`}>
                        {CATEGORY_CONFIG[decision.category]?.icon} {CATEGORY_CONFIG[decision.category]?.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        decision.status === 'evaluating' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        decision.status === 'decided' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {decision.status === 'evaluating' ? 'Evaluating' :
                         decision.status === 'decided' ? 'Decided' : 'Reviewed'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {decision.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {decision.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{decision.options?.length || 0} paths evaluated</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                      View Intelligence <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NEW DECISION STUDIO FORM */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">New Decision Reflection Studio</h3>
                  <p className="text-xs text-slate-500">Formulate your dilemma to receive multidimensional AI intelligence.</p>
                </div>
              </div>
              <button
                onClick={() => !isAnalyzing && setIsCreating(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {analysisError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Analysis Notice</p>
                    <p className="text-rose-700 mt-0.5 leading-relaxed">{analysisError}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-100">
                  <button
                    type="button"
                    onClick={() => setAnalysisError(null)}
                    className="px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:text-rose-900 transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCreateAndAnalyze(e as any)}
                    disabled={isAnalyzing}
                    className="px-3 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry Analysis
                  </button>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 text-xs space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-indigo-700">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>
                      {analyzingSeconds < 4 
                        ? "Synthesizing Core Decision Matrix & Paths..." 
                        : analyzingSeconds < 8 
                          ? "Evaluating Scenario Forecasts & Strategic Trade-offs..." 
                          : "Deconstructing Cognitive Blindspots & Values Alignment..."}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-800">
                    {analyzingSeconds}s
                  </span>
                </div>
                <p className="text-indigo-700/80 text-[11px] leading-relaxed">
                  Analyzing multi-path outcomes, feasibility scores, emotional hesitations, and reflective questions using server-side Gemini intelligence.
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCancelAnalysis}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-indigo-800 text-[11px] font-medium border border-indigo-200 transition cursor-pointer"
                  >
                    <StopCircle className="w-3 h-3 text-rose-500" />
                    Cancel Analysis
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAndAnalyze} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Decision Title *
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadDemoDilemma}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                    title="Prefill realistic career crossroads dilemma for demo presentation"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Demo Realistic Crossroads</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accept Senior Lead Offer vs. Start Boutique AI Studio"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DecisionCategory)}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urgency
                  </label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="low">Low (Long-term / Exploratory)</option>
                    <option value="medium">Medium (Deciding in 1-4 weeks)</option>
                    <option value="high">High (Immediate / Time-sensitive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe the Dilemma, Tensions & What's at Stake *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the trade-offs, how you feel about both paths, what is causing hesitation, what fears arise, and what your heart pulls toward..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Optional custom options user already has in mind */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Paths in Mind (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Path A: Negotiate part-time contract"
                    value={customOptionInput}
                    onChange={(e) => setCustomOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomOption();
                      }
                    }}
                    className="flex-1 text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomOption}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {customOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customOptions.map((opt, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                        <span>{opt}</span>
                        <button type="button" onClick={() => handleRemoveCustomOption(idx)} className="text-indigo-400 hover:text-indigo-700 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isAnalyzing) {
                      handleCancelAnalysis();
                    }
                    setIsCreating(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzing || !newTitle.trim() || !newDescription.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Intelligence ({analyzingSeconds}s)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Decision Intelligence</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD FINAL CHOICE */}
      {isResolving && selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Confirm & Record Your Choice</span>
              </div>
              <button onClick={() => setIsResolving(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select the path you are choosing to commit to. Recording your decision stores it in your private Firestore and unlocks Post-Decision Calibration.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Select Your Chosen Path:
              </label>
              <div className="space-y-2">
                {selectedDecision.options.map((opt, idx) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      chosenOptionId === opt.id
                        ? "border-emerald-500 bg-emerald-50/50 text-slate-900 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="chosen_option"
                      value={opt.id}
                      checked={chosenOptionId === opt.id}
                      onChange={() => setChosenOptionId(opt.id)}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Option {idx + 1}: {opt.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.summary}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Personal Rationale & Guiding Conviction:
              </label>
              <textarea
                rows={3}
                placeholder="Why did you choose this path? What values or convictions led you here?"
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResolving(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResolution}
                disabled={!chosenOptionId}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Record My Choice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONDUCT POST-DECISION REVIEW */}
      {isReviewing && selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Award className="w-5 h-5 text-purple-600" />
                <span>Post-Decision Calibration Review</span>
              </div>
              <button onClick={() => setIsReviewing(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewAIInsight ? (
              /* Review Result View */
              <div className="space-y-5 animate-fadeIn">
                {/* Calibration Insight Header */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Post-Decision Calibration Insight
                    </h4>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full border border-purple-200">
                      Satisfaction: {reviewSatisfactionScore}/10
                    </span>
                  </div>
                  <p className="text-xs text-purple-950 leading-relaxed font-medium">
                    {reviewAIInsight.synthesizedTakeaway}
                  </p>
                  {reviewAIInsight.intuitionCalibrationInsight && (
                    <p className="text-xs text-purple-800 leading-relaxed pt-2 border-t border-purple-200/60">
                      <strong>Calibration Assessment:</strong> {reviewAIInsight.intuitionCalibrationInsight}
                    </p>
                  )}
                </div>

                {/* Prediction → Reality → Learning Comparison Cards */}
                {reviewAIInsight.comparisonPoints && reviewAIInsight.comparisonPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      Prediction → Reality → Learning
                    </h4>
                    <div className="space-y-2.5">
                      {reviewAIInsight.comparisonPoints.map((pt: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
                              <span className="font-bold text-indigo-900 block text-[11px] uppercase tracking-wider mb-0.5">🔮 Prediction</span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">{pt.prediction}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                              <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider mb-0.5">🌿 Reality</span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">{pt.reality}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/70">
                              <span className="font-bold text-purple-900 block text-[11px] uppercase tracking-wider mb-0.5">💡 Learning</span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">{pt.learning}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future Heuristics */}
                {reviewAIInsight.futureHeuristics && reviewAIInsight.futureHeuristics.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Future Decision Heuristics & Rules of Thumb:
                    </h4>
                    <ul className="space-y-1.5">
                      {reviewAIInsight.futureHeuristics.map((h: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setReviewAIInsight(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Adjust Calibration Answers
                  </button>
                  <button
                    onClick={() => setIsReviewing(false)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700 transition cursor-pointer"
                  >
                    Save & Finish Calibration
                  </button>
                </div>
              </div>
            ) : (
              /* Review Input Form: 7 Precise Questions */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-purple-50/80 border border-purple-200">
                  <p className="text-xs text-purple-900 leading-relaxed">
                    Calibrating your decisions sharpens your intuition over time. Answer thoughtfully; there are no right or wrong answers.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadDemoCalibration}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-800 bg-white hover:bg-purple-100/70 border border-purple-300 transition cursor-pointer shrink-0 shadow-2xs"
                    title="Prefill realistic retrospective outcomes for demo presentation"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Demo Realistic Calibration Answers</span>
                  </button>
                </div>

                {/* 1. What actually happened? */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. What actually happened? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the real-world events, consequences, and outcomes that took place..."
                    value={reviewOutcomes}
                    onChange={(e) => setReviewOutcomes(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                  />
                </div>

                {/* 2. What surprised you? */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. What surprised you?
                  </label>
                  <input
                    type="text"
                    placeholder="Unexpected turns, reactions, or consequences you didn't foresee..."
                    value={reviewSurprises}
                    onChange={(e) => setReviewSurprises(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 3 & 4. Accurate prediction vs wrong assumption */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      3. Which prediction was accurate?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My fear of timeline delay was correct"
                      value={reviewAccuratePredictions}
                      onChange={(e) => setReviewAccuratePredictions(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      4. Which assumption was wrong?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. I assumed colleagues would push back"
                      value={reviewWrongAssumptions}
                      onChange={(e) => setReviewWrongAssumptions(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* 5. Satisfaction score (1-10) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      5. How satisfied are you with the outcome? (1–10)
                    </label>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      {reviewSatisfactionScore} / 10
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setReviewSatisfactionScore(num)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                          reviewSatisfactionScore === num
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Would you make the same decision again? */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6. Would you make the same decision again?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "yes", label: "✓ Yes, definitely" },
                      { id: "nuanced", label: "⚖️ With nuances" },
                      { id: "no", label: "↺ No, choose other" }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setReviewRepeatChoice(item.id as any)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                          reviewRepeatChoice === item.id
                            ? "bg-purple-50 border-purple-500 text-purple-900 font-semibold ring-1 ring-purple-500"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. What did you learn about yourself? */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    7. What did you learn about yourself? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Your values, courage, stress response, priorities, or what truly matters to you..."
                    value={reviewSelfLearning}
                    onChange={(e) => {
                      setReviewSelfLearning(e.target.value);
                      setReviewLessons(e.target.value);
                    }}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReviewing(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPostReview}
                    disabled={isSubmittingReview || !reviewOutcomes.trim() || !(reviewSelfLearning.trim() || reviewLessons.trim())}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isSubmittingReview ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing Calibration...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Compare: Prediction → Reality → Learning</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
