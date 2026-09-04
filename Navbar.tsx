/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  BookOpen, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  PenLine, 
  LogOut, 
  User as UserIcon, 
  Compass, 
  BrainCircuit, 
  Clock
} from "lucide-react";
import { useAuth } from "../lib/authContext";

export type TabType = "journal" | "decision" | "patterns" | "timeline" | "chat" | "growth" | "security";

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewEntry: () => void;
  onOpenSecurityModal: () => void;
  onOpenAuthModal: () => void;
  activeDecisionsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onNewEntry,
  onOpenSecurityModal,
  onOpenAuthModal,
  activeDecisionsCount = 0,
}) => {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* Logo & Privacy Badge */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button 
                onClick={() => onTabChange("journal")}
                className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
                title="Personal Gemini Journal Sanctuary"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-2xs group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 line-clamp-1">
                      Personal Gemini Journal
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 hidden sm:block">
                    AI Life-Reflection & Decision Intelligence
                  </p>
                </div>
              </button>

              {/* Small Secure / Privacy Indicator */}
              <button
                onClick={onOpenSecurityModal}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Zero-Trust Privacy & Security Rules"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Private & Secure</span>
                <span className="sm:hidden">Private</span>
              </button>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <button
                id="nav-tab-journal"
                onClick={() => onTabChange("journal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "journal"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Journal</span>
              </button>

              <button
                id="nav-tab-chat"
                onClick={() => onTabChange("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Reflection Partner</span>
              </button>

              <button
                id="nav-tab-decision"
                onClick={() => onTabChange("decision")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer relative ${
                  activeTab === "decision"
                    ? "bg-white text-violet-600 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-violet-600" />
                <span>Decision Companion</span>
                {activeDecisionsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white"></span>
                )}
              </button>

              <button
                id="nav-tab-patterns"
                onClick={() => onTabChange("patterns")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "patterns"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-600" />
                <span>Patterns</span>
              </button>

              <button
                id="nav-tab-timeline"
                onClick={() => onTabChange("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Timeline</span>
              </button>

              <button
                id="nav-tab-growth"
                onClick={() => onTabChange("growth")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "growth"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Analytics</span>
              </button>
            </nav>

            {/* Right Action Area: Profile & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Analytics button on mobile */}
              <button
                onClick={() => onTabChange("growth")}
                className={`lg:hidden p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === "growth" 
                    ? "text-emerald-600 bg-emerald-50" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
                title="Growth Analytics"
                aria-label="Growth Analytics"
              >
                <TrendingUp className="w-4 h-4" />
              </button>

              {/* User Profile / Session Switcher */}
              {user ? (
                <div className="flex items-center gap-1.5 border-l border-slate-200/80 pl-2">
                  <button
                    onClick={onOpenAuthModal}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
                    title="Account & Session"
                    aria-label="Account & Session"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200/80">
                      {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : (user.isAnonymous ? "G" : "U")}
                    </div>
                  </button>
                  <button
                    onClick={signOut}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Ergonomic Bottom Navigation Bar (5 core destinations) */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden shadow-lg safe-area-bottom pb-safe"
      >
        <div className="grid grid-cols-5 items-center px-1 py-1 max-w-md mx-auto">
          
          {/* 1. Journal / Home */}
          <button
            onClick={() => onTabChange("journal")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
              activeTab === "journal"
                ? "text-indigo-600 font-bold bg-indigo-50/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-0.5">Journal</span>
          </button>

          {/* 2. Reflection Partner */}
          <button
            onClick={() => onTabChange("chat")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
              activeTab === "chat"
                ? "text-indigo-600 font-bold bg-indigo-50/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-0.5">Reflect</span>
          </button>

          {/* 3. Decisions */}
          <button
            onClick={() => onTabChange("decision")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] relative ${
              activeTab === "decision"
                ? "text-violet-600 font-bold bg-violet-50/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="relative">
              <Compass className="w-5 h-5" />
              {activeDecisionsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-violet-600 ring-2 ring-white"></span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Decisions</span>
          </button>

          {/* 4. Patterns */}
          <button
            onClick={() => onTabChange("patterns")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
              activeTab === "patterns"
                ? "text-purple-600 font-bold bg-purple-50/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-0.5">Patterns</span>
          </button>

          {/* 5. Timeline */}
          <button
            onClick={() => onTabChange("timeline")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
              activeTab === "timeline"
                ? "text-blue-600 font-bold bg-blue-50/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-0.5">Timeline</span>
          </button>

        </div>
      </nav>
    </>
  );
};

