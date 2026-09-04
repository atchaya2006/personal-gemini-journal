/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Lock, ShieldCheck, UserCheck, AlertCircle, KeyRound, User as UserIcon } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { UnauthorizedDomainBanner } from "./UnauthorizedDomainBanner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    authError, 
    authErrorCode, 
    isFirebaseConfigured, 
    signInWithGoogle, 
    signInAnonymously, 
    signOut,
    clearAuthError 
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await signInAnonymously();
      onClose();
    } catch (err: any) {
      setLocalError(err instanceof Error ? err.message : "Guest sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const isUnauthorizedDomain = authErrorCode === "auth/unauthorized-domain" || (authError && authError.toLowerCase().includes("unauthorized"));
  const errorMessage = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Identity & Access Control
              </h3>
              <p className="text-[11px] text-slate-500">Firebase Authentication Vault</p>
            </div>
          </div>

          <button
            onClick={() => {
              clearAuthError();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {isUnauthorizedDomain ? (
            <UnauthorizedDomainBanner 
              onRetryGoogle={handleGoogleSignIn} 
              compact={false} 
            />
          ) : errorMessage ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Notice</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          ) : null}

          {!isFirebaseConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Firebase Credentials Required
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                To sign in with Google and persist records to Cloud Firestore, please ensure <code className="font-mono text-[10px] bg-amber-100 px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code> and <code className="font-mono text-[10px] bg-amber-100 px-1 py-0.5 rounded">VITE_FIREBASE_PROJECT_ID</code> are configured.
              </p>
            </div>
          )}

          {user ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Active Authenticated Session
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-slate-700">
                  <span className="font-medium">Name:</span> {user.displayName || "User"}
                </div>
                {user.email && (
                  <div className="text-slate-700">
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                )}
                <div className="text-slate-700 font-mono text-[11px]">
                  <span className="font-medium font-sans">UID:</span> {user.uid}
                </div>
                {user.isAnonymous && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                    Guest Mode Session
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Isolated UID
                </span>
                <button
                  onClick={() => {
                    signOut();
                  }}
                  className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sign in with your Google account to access your user-isolated Cloud Firestore journal entries and secure Gemini reflection models.
              </p>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading || !isFirebaseConfigured}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-slate-800 text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400">or</span>
              </div>

              <button
                onClick={handleGuestSignIn}
                disabled={loading || !isFirebaseConfigured}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-xs transition-colors cursor-pointer min-h-[40px]"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Explore as Guest (No Google Login Required)</span>
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Privacy & Zero-Trust Architecture
            </div>
            <p className="text-[11px] leading-relaxed">
              Cloud Firestore security rules enforce strict ownership isolation (<code className="font-mono text-[10px]">request.auth.uid == userId</code>). No data is shared across accounts.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

