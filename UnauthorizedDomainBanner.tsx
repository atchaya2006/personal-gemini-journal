/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, ExternalLink, Globe, ShieldAlert, Sparkles, User, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/authContext";

interface UnauthorizedDomainBannerProps {
  onRetryGoogle?: () => void;
  compact?: boolean;
}

export const UnauthorizedDomainBanner: React.FC<UnauthorizedDomainBannerProps> = ({
  onRetryGoogle,
  compact = false,
}) => {
  const { signInAnonymously, isFirebaseConfigured } = useAuth();
  const [copied, setCopied] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const [anonymousError, setAnonymousError] = useState<string | null>(null);

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy domain:", e);
    }
  };

  const handleGuestSignIn = async () => {
    setAnonymousLoading(true);
    setAnonymousError(null);
    try {
      await signInAnonymously();
    } catch (err: any) {
      setAnonymousError(
        err?.message || "Anonymous sign-in is not enabled in Firebase Authentication settings."
      );
    } finally {
      setAnonymousLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2.5 text-left">
        <div className="flex items-start gap-2 text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Domain Authorization Required</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-amber-200">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <code className="text-[11px] font-mono text-slate-800 flex-1 truncate select-all">
            {currentHostname}
          </code>
          <button
            type="button"
            onClick={handleCopyHostname}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onRetryGoogle && (
            <button
              type="button"
              onClick={onRetryGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Google Sign In</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={anonymousLoading || !isFirebaseConfigured}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <User className="w-3 h-3 text-slate-500" />
            <span>{anonymousLoading ? "Entering..." : "Continue as Guest"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl text-xs space-y-4 text-left shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-900 tracking-tight">
            Firebase Domain Authorization Required
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Google Sign-In blocked this request because this preview container domain has not been added to your Firebase project's authorized domains list yet.
          </p>
        </div>
      </div>

      {/* Copy Domain Box */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
          Current Domain to Authorize:
        </label>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-2xs">
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          <code className="text-xs font-mono font-semibold text-slate-800 flex-1 truncate select-all">
            {currentHostname}
          </code>
          <button
            type="button"
            onClick={handleCopyHostname}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied Domain!" : "Copy Domain"}</span>
          </button>
        </div>
      </div>

      {/* Quick 3-Step Setup Instructions */}
      <div className="bg-white/80 rounded-xl p-3.5 border border-amber-200/80 space-y-2 text-[11px] text-slate-700">
        <p className="font-semibold text-slate-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Quick 1-Minute Fix in Firebase Console:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600 leading-relaxed">
          <li>
            Go to{" "}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:underline"
            >
              Firebase Console <ExternalLink className="w-2.5 h-2.5" />
            </a>{" "}
            and select your project.
          </li>
          <li>
            Navigate to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.
          </li>
          <li>
            Click <strong>Add domain</strong>, paste <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">{currentHostname}</code>, and click <strong>Save</strong>.
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          {onRetryGoogle && (
            <button
              type="button"
              onClick={onRetryGoogle}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-xs cursor-pointer min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Google Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={anonymousLoading || !isFirebaseConfigured}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 min-h-[40px]"
            title="Explore features with an isolated guest session"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>{anonymousLoading ? "Connecting..." : "Continue as Guest"}</span>
          </button>
        </div>

        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:underline"
        >
          <span>Open Firebase Console</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {anonymousError && (
        <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
          {anonymousError}
        </p>
      )}
    </div>
  );
};
