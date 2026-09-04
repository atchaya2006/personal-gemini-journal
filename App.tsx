/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/authContext";
import { Navbar, TabType } from "./components/Navbar";
import { HomeScreen } from "./components/HomeScreen";
import { JournalList } from "./components/JournalList";
import { JournalEditor } from "./components/JournalEditor";
import { JournalDetailModal } from "./components/JournalDetailModal";
import { ReflectionChat } from "./components/ReflectionChat";
import { GrowthAnalytics } from "./components/GrowthAnalytics";
import { DecisionCompanion } from "./components/DecisionCompanion";
import { PatternDiscovery } from "./components/PatternDiscovery";
import { PersonalGrowthTimeline } from "./components/PersonalGrowthTimeline";
import { SecurityAuditModal } from "./components/SecurityAuditModal";
import { AuthModal } from "./components/AuthModal";
import { UnauthorizedDomainBanner } from "./components/UnauthorizedDomainBanner";
import { DecisionItem, GrowthMilestone, JournalEntry } from "./types";
import { UserStorageService } from "./lib/storage";
import { Lock, ShieldCheck, Sparkles, LogIn, AlertTriangle, Compass, BrainCircuit, TrendingUp, PenLine, User as UserIcon } from "lucide-react";

function MainDashboard() {
  const { user, loading, authError, authErrorCode, isFirebaseConfigured, signInWithGoogle, signInAnonymously } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("journal");
  const [journalViewMode, setJournalViewMode] = useState<"home" | "archive">("home");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  
  // Modals & Panels
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<JournalEntry | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync isolated data from Cloud Firestore using real-time listeners
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setDecisions([]);
      setMilestones([]);
      return;
    }

    const unsubEntries = UserStorageService.subscribeToEntries(user.uid, (firestoreEntries) => {
      setEntries(firestoreEntries);
    });

    const unsubDecisions = UserStorageService.subscribeToDecisions(user.uid, (firestoreDecisions) => {
      setDecisions(firestoreDecisions);
    });

    const unsubMilestones = UserStorageService.subscribeToMilestones(user.uid, (firestoreMilestones) => {
      setMilestones(firestoreMilestones);
    });

    return () => {
      unsubEntries();
      unsubDecisions();
      unsubMilestones();
    };
  }, [user]);

  const handleNewEntry = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setEditingEntry(null);
    setIsEditorOpen(true);
    if (activeTab !== "journal") {
      setActiveTab("journal");
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    if (!user) return;
    setEditingEntry(entry);
    setIsEditorOpen(true);
    if (activeTab !== "journal") {
      setActiveTab("journal");
    }
  };

  const handleSaveEntry = async (_saved: JournalEntry) => {
    setIsEditorOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entryId: string): Promise<void> => {
    if (!user) {
      throw new Error("Authentication required to delete journal entry.");
    }
    // 1. Permanently delete from Cloud Firestore at /users/{uid}/entries/{entryId}
    await UserStorageService.deleteEntry(user.uid, entryId);

    // 2. Clear open modals/editors if this entry was active
    if (selectedDetailEntry?.id === entryId) {
      setSelectedDetailEntry(null);
    }
    if (editingEntry?.id === entryId) {
      setEditingEntry(null);
      setIsEditorOpen(false);
    }

    // 3. Refresh the Firestore-backed journal list
    try {
      const freshEntries = await UserStorageService.getEntries(user.uid);
      setEntries(freshEntries);
    } catch (err) {
      console.warn("Could not refetch entries directly, onSnapshot will sync:", err);
    }
  };

  const handleToggleFavorite = async (entry: JournalEntry) => {
    if (!user) return;
    await UserStorageService.updateEntry(user.uid, {
      ...entry,
      isFavorite: !entry.isFavorite,
    });
    if (selectedDetailEntry?.id === entry.id) {
      setSelectedDetailEntry({ ...entry, isFavorite: !entry.isFavorite });
    }
  };

  const handleChatSaveAsEntry = async (entryData: Partial<JournalEntry>) => {
    if (!user) return;
    const newEntry = await UserStorageService.addEntry(user.uid, {
      title: entryData.title || "Dialogue Reflection",
      content: entryData.content || "",
      mood: entryData.mood || "reflective",
      moodScore: 0.3,
      tags: entryData.tags || ["AI Dialogue", "Reflection"],
      wordCount: 0,
      readingTimeMinutes: 1,
    });
    setActiveTab("journal");
    setSelectedDetailEntry(newEntry);
  };

  const activeEvaluatingDecisionsCount = decisions.filter(d => d.status === "evaluating").length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsEditorOpen(false);
          setActiveTab(tab);
          if (tab === "journal") {
            setJournalViewMode("home");
          }
        }}
        onNewEntry={handleNewEntry}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeDecisionsCount={activeEvaluatingDecisionsCount}
      />

      {/* Main Canvas Area - with mobile bottom nav safe padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 lg:pb-10">
        
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                Verifying Zero-Trust Firebase Session...
              </p>
            </div>
          </div>
        ) : !user ? (
          /* Unauthenticated Zero-Trust Landing */
          <div className="max-w-2xl mx-auto my-6 sm:my-10 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 text-center space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mx-auto flex items-center justify-center shadow-xs">
              <Compass className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5" /> AI Life-Reflection & Decision Intelligence
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Personal Gemini Journal
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                A privacy-first decision companion and mindful reflection system. Navigate crossroads, discover cognitive loops, and chronicle your personal growth with user-isolated Cloud Firestore encryption.
              </p>
            </div>

            {authErrorCode === "auth/unauthorized-domain" || (authError && authError.toLowerCase().includes("unauthorized")) ? (
              <div className="pt-2">
                <UnauthorizedDomainBanner 
                  onRetryGoogle={() => signInWithGoogle().catch(() => {})} 
                  compact={false} 
                />
              </div>
            ) : authError ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authError}</span>
              </div>
            ) : null}

            {!isFirebaseConfigured && !authError && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 text-left">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-900">Firebase Configuration Pending</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Authentication and Cloud Firestore sync will activate once Firebase credentials (<code className="font-mono text-[10px] bg-amber-100 px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code>) are configured.
                  </p>
                </div>
              </div>
            )}

            {authErrorCode !== "auth/unauthorized-domain" && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => signInWithGoogle().catch(() => {})}
                  disabled={!isFirebaseConfigured}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
                <button
                  onClick={() => signInAnonymously().catch(() => {})}
                  disabled={!isFirebaseConfigured}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 min-h-[46px]"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>Continue as Guest</span>
                </button>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" /> Decision Intelligence
                </span>
                <p className="text-[11px] text-slate-500">Deconstructs options & hidden assumptions without deciding for you.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-600" /> Pattern Discovery
                </span>
                <p className="text-[11px] text-slate-500">Uncovers recurring cognitive loops & restorative emotional anchors.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Zero-Trust Vault
                </span>
                <p className="text-[11px] text-slate-500">Firestore user UID isolation & server-side Gemini execution.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard Content */
          <>
            {/* VIEW 1: Journal Entries Tab / Home Sanctuary */}
            {activeTab === "journal" && (
              <div className="space-y-4 sm:space-y-6">
                {isEditorOpen ? (
                  <JournalEditor
                    initialEntry={editingEntry}
                    onSave={handleSaveEntry}
                    onDelete={handleDeleteEntry}
                    onCancel={() => {
                      setIsEditorOpen(false);
                      setEditingEntry(null);
                    }}
                  />
                ) : journalViewMode === "home" ? (
                  <HomeScreen
                    entries={entries}
                    decisions={decisions}
                    onSelectEntry={setSelectedDetailEntry}
                    onEditEntry={handleEditEntry}
                    onNewEntry={handleNewEntry}
                    onToggleFavorite={handleToggleFavorite}
                    onTabChange={setActiveTab}
                    onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
                    onViewAllEntries={() => setJournalViewMode("archive")}
                  />
                ) : (
                  <JournalList
                    entries={entries}
                    onSelectEntry={setSelectedDetailEntry}
                    onEditEntry={handleEditEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onNewEntry={handleNewEntry}
                    onToggleFavorite={handleToggleFavorite}
                    onBackToHome={() => setJournalViewMode("home")}
                  />
                )}
              </div>
            )}

            {/* VIEW 2: Decision Companion */}
            {activeTab === "decision" && (
              <DecisionCompanion
                decisions={decisions}
                journalEntries={entries}
                onOpenJournalModal={(entryId) => {
                  const matched = entries.find(e => e.id === entryId);
                  if (matched) setSelectedDetailEntry(matched);
                }}
              />
            )}

            {/* VIEW 3: Cross-Journal Pattern Discovery */}
            {activeTab === "patterns" && (
              <PatternDiscovery entries={entries} decisions={decisions} />
            )}

            {/* VIEW 4: Personal Growth Timeline */}
            {activeTab === "timeline" && (
              <PersonalGrowthTimeline
                milestones={milestones}
                entries={entries}
                decisions={decisions}
              />
            )}

            {/* VIEW 5: Mindful Dialogue Reflection Chat */}
            {activeTab === "chat" && (
              <ReflectionChat entries={entries} onSaveAsEntry={handleChatSaveAsEntry} />
            )}

            {/* VIEW 6: Longitudinal Emotional Analytics */}
            {activeTab === "growth" && (
              <GrowthAnalytics entries={entries} />
            )}
          </>
        )}

      </main>

      {/* Ergonomic Floating Action Button (FAB) on Mobile Archive View */}
      {user && !isEditorOpen && activeTab === "journal" && journalViewMode === "archive" && (
        <button
          onClick={handleNewEntry}
          className="lg:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg active:scale-95 transition-all cursor-pointer font-semibold text-xs border border-white/20"
          aria-label="Create New Journal Entry"
        >
          <PenLine className="w-4 h-4" />
          <span>Write</span>
        </button>
      )}

      {/* Modals & Overlays */}
      <JournalDetailModal
        entry={selectedDetailEntry}
        onClose={() => setSelectedDetailEntry(null)}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
        onToggleFavorite={handleToggleFavorite}
      />

      <SecurityAuditModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Modern Minimalist Footer (Hidden on mobile or compact) */}
      <footer className="hidden sm:block border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600">
            Personal Gemini Journal • AI Life-Reflection & Decision Intelligence • Cloud Firestore Authenticated
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition cursor-pointer"
            >
              Zero-Trust Threat Model
            </button>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">
              Server-Side Gemini 2.5 Active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainDashboard />
    </AuthProvider>
  );
}
