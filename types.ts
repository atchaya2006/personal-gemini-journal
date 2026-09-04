/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  token?: string;
}

export type MoodType = 'serene' | 'joyful' | 'reflective' | 'anxious' | 'fatigued' | 'frustrated' | 'neutral';

export interface MoodMetadata {
  type: MoodType;
  label: string;
  emoji: string;
  color: string;
  score: number; // -1.0 to 1.0
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: MoodType;
  moodScore: number;
  tags: string[];
  summary?: string;
  reframing?: string;
  actionItem?: string;
  dominantEmotions?: string[];
  wordCount: number;
  readingTimeMinutes: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface GrowthInsight {
  id: string;
  userId: string;
  generatedAt: string;
  periodLabel: string;
  overview: string;
  emotionalTrajectory: string;
  dominantThemes: string[];
  cognitiveStrengths: string[];
  mindfulRecommendations: string[];
  resilienceScore: number; // 0 to 100
}

export interface SecurityStatus {
  secretManagerActive: boolean;
  apiProxySecured: boolean;
  zeroTrustDataIsolation: boolean;
  serverSideIdentityVerified: boolean;
  sanitizationActive: boolean;
  clientSecretExposureRisk: 'ZERO' | 'LOW' | 'HIGH';
  backendVersion: string;
}

// ==========================================
// DECISION INTELLIGENCE TYPES
// ==========================================

export type DecisionCategory = 
  | 'career' 
  | 'life' 
  | 'relationships' 
  | 'wellbeing' 
  | 'finance' 
  | 'creativity' 
  | 'philosophy';

export type DecisionStatus = 'evaluating' | 'decided' | 'post_reflection';

export interface DecisionOption {
  id: string;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  potentialOutcomes: {
    bestCase: string;
    worstCase: string;
    mostLikely: string;
  };
  valuesAlignmentScore: number; // 1 to 10
  feasibilityScore: number; // 1 to 10
}

export interface CalibrationComparisonPoint {
  prediction: string;
  reality: string;
  learning: string;
}

export interface CalibrationInsightResult {
  synthesizedTakeaway: string;
  intuitionCalibrationInsight: string;
  futureHeuristics: string[];
  celebrationAnchor?: string;
  comparisonPoints?: CalibrationComparisonPoint[];
}

export interface PostDecisionReview {
  reflectedAt: string;
  outcomesObserved: string; // What actually happened?
  surprises?: string; // What surprised you?
  accuratePredictions?: string; // Which prediction was accurate?
  wrongAssumptions?: string; // Which assumption was wrong?
  satisfactionScore?: number; // How satisfied are you with the outcome? (1–10)
  repeatChoice?: 'yes' | 'nuanced' | 'no'; // Would you make the same decision again?
  selfLearning?: string; // What did you learn about yourself?
  intuitionAccuracy?: 'high' | 'moderate' | 'surprising' | 'misaligned';
  lessonsLearned?: string;
  emotionalStateNow?: string;
  calibrationInsight?: CalibrationInsightResult;
}

export interface DecisionItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: DecisionCategory;
  urgency: 'low' | 'medium' | 'high';
  status: DecisionStatus;
  
  // AI Decision Analysis
  options: DecisionOption[];
  emotionalConcerns: string[];
  practicalConcerns: string[];
  hiddenAssumptions: string[];
  reflectiveQuestions: string[];
  journalContextInsights: string[];
  
  // User Resolution
  chosenOptionId?: string;
  decisionRationale?: string;
  userClarificationNotes?: Record<string, string>; // question -> user answer
  
  // Post-Decision Evaluation
  postDecisionReview?: PostDecisionReview;
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PATTERN DISCOVERY TYPES
// ==========================================

export interface CognitiveLoop {
  loopName: string;
  trigger: string;
  impact: string;
  reframingStrategy: string;
}

export interface EmotionalAnchor {
  category: 'restorative' | 'depleting';
  theme: string;
  description: string;
  frequencyObservation: string;
  recommendation: string;
}

export interface ValueCongruenceItem {
  value: string;
  alignmentStatus: 'aligned' | 'drifting' | 'under_nurtured';
  observation: string;
}

export interface PatternDiscoveryResult {
  id: string;
  userId: string;
  analyzedAt: string;
  entriesAnalyzedCount: number;
  cognitiveLoops: CognitiveLoop[];
  emotionalAnchors: EmotionalAnchor[];
  peakClarityConditions: string[];
  valueCongruenceScore: number; // 0 to 100
  valueCongruenceBreakdown: ValueCongruenceItem[];
  behavioralCyclesSummary: string;
  actionableMicroHabits: string[];
}

// ==========================================
// PERSONAL GROWTH TIMELINE TYPES
// ==========================================

export type MilestoneCategory = 
  | 'mindset_shift' 
  | 'breakthrough' 
  | 'decision_point' 
  | 'emotional_milestone' 
  | 'life_transition';

export type MilestoneImpact = 'transformational' | 'significant' | 'notable';

export interface GrowthMilestone {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: MilestoneCategory;
  impactLevel: MilestoneImpact;
  date: string;
  relatedEntryId?: string;
  relatedDecisionId?: string;
  tags: string[];
  keyLearning: string;
  createdAt: string;
  isAutoDetected?: boolean;
}
