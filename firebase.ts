/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Read Firebase Web App configuration dynamically if generated in workspace, or from environment variables
const configFiles = import.meta.glob<{ default: Record<string, string> }>("/firebase-applet-config.json", {
  eager: true,
});
const fileConfig = configFiles["/firebase-applet-config.json"]?.default || {};

const projectId =
  fileConfig.projectId ||
  import.meta.env.VITE_FIREBASE_PROJECT_ID ||
  "";

const apiKey =
  fileConfig.apiKey ||
  import.meta.env.VITE_FIREBASE_API_KEY ||
  "";

const authDomain =
  fileConfig.authDomain ||
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  (projectId ? `${projectId}.firebaseapp.com` : "");

const storageBucket =
  fileConfig.storageBucket ||
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
  (projectId ? `${projectId}.firebasestorage.app` : "");

const messagingSenderId =
  fileConfig.messagingSenderId ||
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
  "";

const appId =
  fileConfig.appId ||
  import.meta.env.VITE_FIREBASE_APP_ID ||
  "";

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Check if valid Firebase configuration is present
export const isFirebaseConfigured = Boolean(apiKey && apiKey.trim().length > 0 && projectId);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
  } catch (err) {
    console.warn("Firebase initialization notice:", err);
  }
}

export const app: FirebaseApp | null = firebaseApp;
export const auth: Auth | null = firebaseAuth;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db: Firestore | null = firestoreDb;
