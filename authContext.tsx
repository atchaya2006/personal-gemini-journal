/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously as fbSignInAnonymously,
  signOut as fbSignOut, 
  User 
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";
import { UserSession } from "../types";

interface AuthContextType {
  user: UserSession | null;
  firebaseUser: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  authError: string | null;
  authErrorCode: string | null;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (currentFbUser) => {
          if (currentFbUser) {
            try {
              const token = await currentFbUser.getIdToken();
              const userSession: UserSession = {
                uid: currentFbUser.uid,
                email: currentFbUser.email,
                displayName: currentFbUser.displayName || (currentFbUser.isAnonymous ? "Guest Explorer" : "Authenticated User"),
                photoURL: currentFbUser.photoURL,
                isAnonymous: currentFbUser.isAnonymous,
                token: token,
              };
              setFirebaseUser(currentFbUser);
              setUser(userSession);
              setAuthError(null);
              setAuthErrorCode(null);
            } catch (e) {
              console.error("Failed to retrieve Firebase ID token:", e);
              setUser(null);
              setFirebaseUser(null);
              setAuthError("Failed to retrieve valid authentication token.");
              setAuthErrorCode("auth/token-error");
            }
          } else {
            // Unauthenticated state
            setFirebaseUser(null);
            setUser(null);
            setAuthError(null);
            setAuthErrorCode(null);
          }
          setLoading(false);
        },
        (error: any) => {
          console.error("Firebase onAuthStateChanged error:", error);
          setAuthError(error?.message || "Authentication state error.");
          setAuthErrorCode(error?.code || null);
          setUser(null);
          setFirebaseUser(null);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Firebase auth initialization error:", err);
      setAuthError(err instanceof Error ? err.message : "Failed to initialize Firebase Auth.");
      setAuthErrorCode("auth/init-error");
      setLoading(false);
    }
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    if (auth?.currentUser) {
      try {
        return await auth.currentUser.getIdToken(true);
      } catch (err) {
        console.error("Error refreshing Firebase ID token:", err);
        return null;
      }
    }
    return null;
  };

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorCode(null);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error("Firebase Web API credentials are not yet configured. Please ensure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are set.");
      }
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const googleUser: UserSession = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || "Google User",
        photoURL: result.user.photoURL,
        isAnonymous: false,
        token: token,
      };
      setFirebaseUser(result.user);
      setUser(googleUser);
    } catch (err: any) {
      console.error("Google sign in error details:", err);
      const code = err?.code || "";
      setAuthErrorCode(code);
      let message = err?.message || "Google Authentication failed.";
      if (code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing.";
      } else if (code === "auth/cancelled-popup-request") {
        message = "Sign-in request was cancelled.";
      } else if (code === "auth/popup-blocked") {
        message = "Sign-in popup was blocked by browser. Please allow popups for this site.";
      } else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
        message = "Firebase Web API Key is missing or invalid. Please check VITE_FIREBASE_API_KEY.";
      } else if (code === "auth/unauthorized-domain") {
        const currentDomain = typeof window !== "undefined" ? window.location.hostname : "this domain";
        message = `Unauthorized Domain: "${currentDomain}" is not in Firebase Authorized Domains.`;
      } else if (code === "auth/operation-not-allowed") {
        message = "Google Sign-In is not enabled in Firebase Console. Please enable Google in Firebase Authentication > Sign-in method.";
      }
      setAuthError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymously = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error("Firebase is not yet configured.");
      }
      const result = await fbSignInAnonymously(auth);
      const token = await result.user.getIdToken();
      const guestUser: UserSession = {
        uid: result.user.uid,
        email: null,
        displayName: "Guest Explorer",
        photoURL: null,
        isAnonymous: true,
        token: token,
      };
      setFirebaseUser(result.user);
      setUser(guestUser);
    } catch (err: any) {
      console.error("Anonymous sign-in error details:", err);
      setAuthErrorCode(err?.code || "auth/anonymous-failed");
      setAuthError(err?.message || "Anonymous sign-in failed. Please verify Anonymous Auth is enabled in Firebase Console.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (auth) {
        await fbSignOut(auth);
      }
      setUser(null);
      setFirebaseUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        firebaseUser, 
        loading, 
        isFirebaseConfigured, 
        authError, 
        authErrorCode, 
        getIdToken, 
        signInWithGoogle, 
        signInAnonymously, 
        signOut,
        clearAuthError 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
