/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  ConversationSession, 
  DecisionItem, 
  GrowthInsight, 
  GrowthMilestone, 
  JournalEntry, 
  MoodMetadata, 
  MoodType, 
  PatternDiscoveryResult 
} from "../types";

export const MOOD_CONFIG: Record<MoodType, MoodMetadata> = {
  serene: {
    type: "serene",
    label: "Serene",
    emoji: "🌿",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    score: 0.8,
  },
  joyful: {
    type: "joyful",
    label: "Joyful",
    emoji: "✨",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    score: 0.9,
  },
  reflective: {
    type: "reflective",
    label: "Reflective",
    emoji: "🔍",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    score: 0.3,
  },
  anxious: {
    type: "anxious",
    label: "Anxious",
    emoji: "🌊",
    color: "bg-sky-50 text-sky-700 border-sky-200",
    score: -0.4,
  },
  fatigued: {
    type: "fatigued",
    label: "Fatigued",
    emoji: "🌙",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    score: -0.3,
  },
  frustrated: {
    type: "frustrated",
    label: "Frustrated",
    emoji: "⚡",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    score: -0.6,
  },
  neutral: {
    type: "neutral",
    label: "Centered",
    emoji: "⚖️",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    score: 0.0,
  },
};

/**
 * Removes any undefined fields recursively to prevent Firestore setDoc/updateDoc crashes.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export class UserStorageService {
  // Real Firestore paths scoped strictly by user UID
  private static entriesRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "entries");
  }

  private static decisionsRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "decisions");
  }

  private static milestonesRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "milestones");
  }

  private static patternsRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "patterns");
  }

  private static conversationsRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "conversations");
  }

  private static insightsRef(userId: string) {
    if (!db) throw new Error("Cloud Firestore is not initialized");
    return collection(db, "users", userId, "insights");
  }

  // =========================================================================
  // 1. JOURNAL ENTRIES
  // =========================================================================

  static subscribeToEntries(userId: string, callback: (entries: JournalEntry[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(this.entriesRef(userId), orderBy("createdAt", "desc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => docSnap.data() as JournalEntry);
          callback(items);
        },
        (error) => {
          console.error("Firestore entries subscription error:", error);
          callback([]);
        }
      );
    } catch (err) {
      console.error("Failed to establish Firestore onSnapshot listener:", err);
      callback([]);
      return () => {};
    }
  }

  static async getEntries(userId: string): Promise<JournalEntry[]> {
    if (!db) return [];
    try {
      const q = query(this.entriesRef(userId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as JournalEntry);
    } catch (err) {
      console.error("Firestore getEntries error:", err);
      return [];
    }
  }

  static async addEntry(
    userId: string,
    entry: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<JournalEntry> {
    if (!db) throw new Error("Firestore not initialized");

    const entryId = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
    const newEntry: JournalEntry = {
      ...entry,
      id: entryId,
      userId,
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const entryDocRef = doc(db, "users", userId, "entries", entryId);
    await setDoc(entryDocRef, sanitizeForFirestore(newEntry));
    return newEntry;
  }

  static async updateEntry(userId: string, updatedEntry: JournalEntry): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const wordCount = updatedEntry.content.trim().split(/\s+/).filter(Boolean).length;
    const finalEntry: JournalEntry = {
      ...updatedEntry,
      userId,
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      updatedAt: new Date().toISOString(),
    };

    const entryDocRef = doc(db, "users", userId, "entries", finalEntry.id);
    await setDoc(entryDocRef, sanitizeForFirestore(finalEntry), { merge: true });
  }

  static async deleteEntry(userId: string, entryId: string): Promise<void> {
    if (!db) {
      throw new Error("Firestore database client is not initialized.");
    }
    if (!userId || !entryId) {
      throw new Error("User ID and Entry ID are required to delete a journal document.");
    }
    const entryDocRef = doc(db, "users", userId, "entries", entryId);
    await deleteDoc(entryDocRef);
  }

  // =========================================================================
  // 2. DECISION COMPANION (AI DECISION INTELLIGENCE)
  // =========================================================================

  static subscribeToDecisions(userId: string, callback: (decisions: DecisionItem[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(this.decisionsRef(userId), orderBy("createdAt", "desc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) => d.data() as DecisionItem);
          callback(items);
        },
        (error) => {
          console.error("Firestore decisions subscription error:", error);
          callback([]);
        }
      );
    } catch (err) {
      console.error("Failed to subscribe to decisions:", err);
      callback([]);
      return () => {};
    }
  }

  static async getDecisions(userId: string): Promise<DecisionItem[]> {
    if (!db) return [];
    try {
      const q = query(this.decisionsRef(userId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as DecisionItem);
    } catch (err) {
      console.error("Firestore getDecisions error:", err);
      return [];
    }
  }

  static async addDecision(
    userId: string,
    decision: Omit<DecisionItem, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<DecisionItem> {
    if (!db) throw new Error("Firestore not initialized");

    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const newDecision: DecisionItem = {
      ...decision,
      id: decisionId,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(db, "users", userId, "decisions", decisionId);
    await setDoc(docRef, sanitizeForFirestore(newDecision));
    return newDecision;
  }

  static async updateDecision(userId: string, updatedDecision: DecisionItem): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const finalDecision: DecisionItem = {
      ...updatedDecision,
      userId,
      updatedAt: new Date().toISOString(),
    };
    const docRef = doc(db, "users", userId, "decisions", finalDecision.id);
    await setDoc(docRef, sanitizeForFirestore(finalDecision), { merge: true });
  }

  static async deleteDecision(userId: string, decisionId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "users", userId, "decisions", decisionId);
    await deleteDoc(docRef);
  }

  // =========================================================================
  // 3. PERSONAL GROWTH TIMELINE MILESTONES
  // =========================================================================

  static subscribeToMilestones(userId: string, callback: (milestones: GrowthMilestone[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(this.milestonesRef(userId), orderBy("date", "desc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) => d.data() as GrowthMilestone);
          callback(items);
        },
        (error) => {
          console.error("Firestore milestones subscription error:", error);
          callback([]);
        }
      );
    } catch (err) {
      console.error("Failed to subscribe to milestones:", err);
      callback([]);
      return () => {};
    }
  }

  static async getMilestones(userId: string): Promise<GrowthMilestone[]> {
    if (!db) return [];
    try {
      const q = query(this.milestonesRef(userId), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as GrowthMilestone);
    } catch (err) {
      console.error("Firestore getMilestones error:", err);
      return [];
    }
  }

  static async addMilestone(
    userId: string,
    milestone: Omit<GrowthMilestone, "id" | "userId" | "createdAt">
  ): Promise<GrowthMilestone> {
    if (!db) throw new Error("Firestore not initialized");

    const milestoneId = `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMilestone: GrowthMilestone = {
      ...milestone,
      id: milestoneId,
      userId,
      createdAt: new Date().toISOString(),
    };

    const docRef = doc(db, "users", userId, "milestones", milestoneId);
    await setDoc(docRef, sanitizeForFirestore(newMilestone));
    return newMilestone;
  }

  static async deleteMilestone(userId: string, milestoneId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "users", userId, "milestones", milestoneId);
    await deleteDoc(docRef);
  }

  // =========================================================================
  // 4. PATTERN DISCOVERY RESULTS
  // =========================================================================

  static async getLatestPattern(userId: string): Promise<PatternDiscoveryResult | null> {
    if (!db) return null;
    try {
      const q = query(this.patternsRef(userId), orderBy("analyzedAt", "desc"));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as PatternDiscoveryResult;
    } catch (err) {
      console.error("Firestore getLatestPattern error:", err);
      return null;
    }
  }

  static async savePattern(userId: string, pattern: PatternDiscoveryResult): Promise<void> {
    if (!db) return;
    const docRef = doc(db, "users", userId, "patterns", pattern.id);
    await setDoc(docRef, sanitizeForFirestore({ ...pattern, userId }), { merge: true });
  }

  // =========================================================================
  // 5. CHAT CONVERSATIONS & INSIGHTS
  // =========================================================================

  static async getConversations(userId: string): Promise<ConversationSession[]> {
    if (!db) return [];
    try {
      const q = query(this.conversationsRef(userId), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as ConversationSession);
    } catch (err) {
      console.error("Firestore getConversations error:", err);
      return [];
    }
  }

  static async saveConversation(userId: string, session: ConversationSession): Promise<void> {
    if (!db) return;
    const docRef = doc(db, "users", userId, "conversations", session.id);
    await setDoc(docRef, sanitizeForFirestore({ ...session, userId }), { merge: true });
  }

  static async getInsights(userId: string): Promise<GrowthInsight[]> {
    if (!db) return [];
    try {
      const q = query(this.insightsRef(userId), orderBy("generatedAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as GrowthInsight);
    } catch (err) {
      console.error("Firestore getInsights error:", err);
      return [];
    }
  }

  static async saveInsight(userId: string, insight: GrowthInsight): Promise<void> {
    if (!db) return;
    const docRef = doc(db, "users", userId, "insights", insight.id);
    await setDoc(docRef, sanitizeForFirestore({ ...insight, userId }), { merge: true });
  }

  // =========================================================================
  // 6. ZERO-TRUST USER DATA EXPORT
  // =========================================================================

  static async exportUserData(userId: string): Promise<string> {
    const entries = await this.getEntries(userId);
    const decisions = await this.getDecisions(userId);
    const milestones = await this.getMilestones(userId);
    const latestPattern = await this.getLatestPattern(userId);
    const conversations = await this.getConversations(userId);
    const insights = await this.getInsights(userId);

    const payload = {
      version: "3.0.0-decision-intelligence",
      exportedAt: new Date().toISOString(),
      userId,
      securityCheck: "Authenticated Firestore UID Isolated Payload",
      data: {
        entries,
        decisions,
        milestones,
        patternDiscovery: latestPattern,
        conversations,
        insights,
      },
    };

    return JSON.stringify(payload, null, 2);
  }
}
