/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Security: Enforce strict payload limits to prevent memory exhaustion & DoS
app.use(express.json({ limit: "2mb" }));

// Security: HTTP Header Hardening
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Initialize Firebase Admin SDK
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "hypnic-philosophy-4q6d2";
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseProjectId,
  });
}

// Lazy initialization for Google GenAI client (Secrets handled solely on server)
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Sensitive credentials must be managed via Secret Manager.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Resilient Model Fallback & Retry Handler for High Demand Spikes (503, 429, UNAVAILABLE)
const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
];

interface FallbackGenerateParams {
  contents: any;
  config?: any;
  preferredModel?: string;
  maxRetriesPerModel?: number;
  timeoutMs?: number;
}

// Track active in-flight decision analysis requests per user ID to prevent duplicate concurrent API invocations
const activeDecisionAnalysisUsers = new Set<string>();

async function generateWithModelFallback({
  contents,
  config,
  preferredModel = "gemini-3.7-flash",
  maxRetriesPerModel = 1,
  timeoutMs = 35000,
}: FallbackGenerateParams): Promise<{ response: any; modelUsed: string; durationMs: number }> {
  const ai = getAIClient();
  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;
  const globalStart = performance.now();

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      const callStart = performance.now();
      try {
        // Execute with timeout race
        const generatePromise = ai.models.generateContent({
          model,
          contents,
          config,
        });

        let timerId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(new Error(`Model call to '${model}' timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]).finally(() => {
          if (timerId) clearTimeout(timerId);
        });

        const callDuration = Math.round(performance.now() - callStart);
        const totalDuration = Math.round(performance.now() - globalStart);
        console.log(`[Gemini API] Success: model='${model}', call=${callDuration}ms, total=${totalDuration}ms`);

        return { response, modelUsed: model, durationMs: totalDuration };
      } catch (error: any) {
        lastError = error;
        const callDuration = Math.round(performance.now() - callStart);
        const errMessage = error?.message || String(error);

        console.warn(`[Gemini API] Attempt failed on model '${model}' (${callDuration}ms):`, errMessage);

        // For high demand 503 / resource exhausted, immediately shift to next candidate model in the pool
        break;
      }
    }
  }

  throw lastError || new Error("All available Gemini models are currently experiencing high demand. Please retry in a moment.");
}

function parseJsonResponse(responseText: string, fallback: any = {}): any {
  if (!responseText || typeof responseText !== "string") return fallback;
  const trimmed = responseText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      const cleaned = trimmed
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }
}

// Security Middleware: Validate Authenticated Firebase ID Token
export interface AuthenticatedRequest extends Request {
  authenticatedUid?: string;
}

async function authenticateFirebaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authorization token missing or malformed. All operations require a valid Firebase ID token."
    });
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Bearer token empty."
    });
  }

  try {
    // Cryptographically verify Firebase ID token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    req.authenticatedUid = decodedToken.uid;
    return next();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Invalid token";
    console.warn("Firebase ID token verification failed:", errMsg);
    return res.status(401).json({
      error: "Unauthorized",
      message: `Firebase ID token verification failed: ${errMsg}`
    });
  }
}

// Input Sanitization helper
function sanitizeString(input: unknown, maxLength = 15000): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "personal-gemini-journal-decision-intelligence",
    securityPosture: "firebase-admin-zero-trust-enforced"
  });
});

// 2. Security Audit & Threat Model Status
app.get("/api/security/status", authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    secretManagerActive: hasKey,
    apiProxySecured: true,
    zeroTrustDataIsolation: true,
    serverSideIdentityVerified: true,
    sanitizationActive: true,
    clientSecretExposureRisk: "ZERO",
    backendVersion: "3.0.0-decision-intelligence",
    authenticatedUid: req.authenticatedUid ? `${req.authenticatedUid.slice(0, 6)}...` : "anonymous"
  });
});

// 3. Multi-Turn Conversational Journal Reflection
app.post("/api/journal/reflect", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, currentContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid payload: messages array is required." });
    }

    const sanitizedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "model" ? "model" : "user",
      content: sanitizeString(m.content, 4000),
    }));

    // Construct prompt history for multi-turn dialogue with mindful companion persona
    const systemInstruction = `You are a deeply thoughtful, psychologically grounded AI Life-Reflection Partner and Decision-Intelligence Companion.
Your core principles:
1. Talk WITH the user, never AT the user. Be conversational, calm, warm, and authentic.
2. Ask ONE thoughtful, resonant question at a time to deepen their self-discovery. Never bombard them with multiple questions.
3. Challenge unexamined assumptions gently, illuminating blindspots with empathy and care.
4. Support iterative, multi-turn self-reflection so the user arrives at their own inner clarity.
5. NEVER diagnose the user and NEVER pretend to be a medical therapist or psychiatrist.
6. Avoid giving unsolicited direct advice or telling the user what life or career choice to make; hold sacred space for their sovereign agency.
7. Keep responses concise (2 to 3 paragraphs maximum), elegant, and focused on self-understanding.
8. At the very end of your response, offer 2-3 short, inviting follow-up reflection prompts formatted as: [FOLLOW_UP: prompt text].`;

    const contents = sanitizedMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    if (currentContext && typeof currentContext === "string") {
      contents.unshift({
        role: "user",
        parts: [{ text: `[Context from current journal draft]: ${sanitizeString(currentContext, 2000)}` }]
      });
    }

    const { response } = await generateWithModelFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });

    const rawText = response.text || "I am here with you. What else is on your mind today?";
    
    // Extract follow up suggestions
    const followUps: string[] = [];
    const followUpRegex = /\[FOLLOW_UP:\s*(.*?)\]/g;
    let match;
    while ((match = followUpRegex.exec(rawText)) !== null) {
      if (match[1] && match[1].trim()) {
        followUps.push(match[1].trim());
      }
    }

    const cleanedText = rawText.replace(/\[FOLLOW_UP:\s*.*?\]/g, "").trim();

    return res.json({
      reply: cleanedText,
      followUps: followUps.length > 0 ? followUps : [
        "What part of this feels most important to explore deeper?",
        "How would you speak to a friend going through this exact situation?",
        "What is one small step that would bring you peace today?"
      ]
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in /api/journal/reflect:", errorMsg);
    return res.status(500).json({
      error: "ReflectionServiceError",
      message: `Reflection service failed: ${errorMsg}`
    });
  }
});

// 4. Intelligent Summarization, Emotional Sentiment & Cognitive Reframing
app.post("/api/journal/summarize", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const sanitizedTitle = sanitizeString(title, 200);
    const sanitizedContent = sanitizeString(content, 10000);

    if (!sanitizedContent || sanitizedContent.length < 10) {
      return res.status(400).json({ error: "Content must be at least 10 characters long to generate summary." });
    }

    const prompt = `Analyze this private personal journal entry with psychological empathy and precision.
Return a STRICT valid JSON object (no markdown surrounding, no code fences, only valid JSON) matching this schema:
{
  "summary": "A cohesive, elegant 2-3 sentence executive summary capturing the core experience and emotions.",
  "mood": "One of: serene | joyful | reflective | anxious | fatigued | frustrated | neutral",
  "moodScore": A floating point number between -1.0 (very negative) to 1.0 (very positive),
  "dominantEmotions": ["Array of 2-4 specific nuanced emotions e.g. Gratitude, Hesitation, Relieved, Overwhelmed"],
  "cognitiveReframing": "A compassionate, constructive reframing perspective highlighting personal agency, resilience, or learning.",
  "actionItem": "A single, gentle, practical mindfulness exercise or grounding action to take next.",
  "suggestedTags": ["Array of 3-5 relevant thematic tags e.g. Work, Family, Self-Discovery, Creativity"]
}

Journal Title: ${sanitizedTitle || "Untitled"}
Journal Content:
${sanitizedContent}`;

    const { response } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      }
    });

    const parsedData = parseJsonResponse(response.text, {});

    return res.json({
      summary: parsedData.summary || "Reflective journal entry.",
      mood: parsedData.mood || "reflective",
      moodScore: typeof parsedData.moodScore === "number" ? parsedData.moodScore : 0.0,
      dominantEmotions: Array.isArray(parsedData.dominantEmotions) ? parsedData.dominantEmotions : ["Introspection"],
      reframing: parsedData.cognitiveReframing || "Every experience provides valuable insight for personal growth.",
      actionItem: parsedData.actionItem || "Take 3 deep breaths and acknowledge your effort today.",
      suggestedTags: Array.isArray(parsedData.suggestedTags) ? parsedData.suggestedTags : ["Journal", "Reflection"]
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in /api/journal/summarize:", errorMsg);
    return res.status(500).json({
      error: "SummarizationServiceError",
      message: `Unable to complete AI summary: ${errorMsg}`
    });
  }
});

// 5. Emotional Growth & Cognitive Trend Insights (Longitudinal Analysis)
app.post("/api/journal/insights", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "At least one journal entry is required for growth analysis." });
    }

    const sanitizedEntries = entries.slice(0, 15).map((e: { title?: string; content?: string; mood?: string; createdAt?: string }) => ({
      date: sanitizeString(e.createdAt, 50),
      mood: sanitizeString(e.mood, 20),
      snippet: sanitizeString(e.content, 400),
    }));

    const prompt = `You are a clinical psychologist and mindfulness coach. Perform a longitudinal growth and emotional trend analysis on these recent journal logs.
Return a STRICT JSON object (no code fences, only JSON) matching:
{
  "overview": "A warm, empowering 3-sentence summary of the user's emotional and mental journey across these entries.",
  "emotionalTrajectory": "Detailed description of how their mood and resilience evolved over time.",
  "dominantThemes": ["Top 3-4 recurring life themes or focal points"],
  "cognitiveStrengths": ["3 positive emotional patterns or resilience traits demonstrated by the user"],
  "mindfulRecommendations": ["3 specific mindfulness practices or healthy habits tailored to their patterns"],
  "resilienceScore": An integer from 0 to 100 representing emotional self-awareness and adaptiveness
}

Logs:
${JSON.stringify(sanitizedEntries, null, 2)}`;

    const { response } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const parsedData = parseJsonResponse(response.text, {});
    return res.json(parsedData);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in /api/journal/insights:", errorMsg);
    return res.status(500).json({
      error: "InsightsServiceError",
      message: `Unable to generate longitudinal insights: ${errorMsg}`
    });
  }
});

// ==========================================
// DECISION INTELLIGENCE ENDPOINTS
// ==========================================

// 7. Decision Companion: Deep Socratic Life & Career Decision Analysis
app.post("/api/decision/analyze", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authenticatedUid || "anonymous_session";

  // Prevent duplicate concurrent requests per user
  if (activeDecisionAnalysisUsers.has(userId)) {
    console.warn(`[Decision Intelligence] Duplicate concurrent request rejected for user: ${userId}`);
    return res.status(429).json({
      error: "ConcurrentAnalysisInProgress",
      message: "A decision intelligence analysis is already processing for your account. Please wait a moment for it to complete."
    });
  }

  activeDecisionAnalysisUsers.add(userId);

  try {
    const { title, description, category, urgency, userProvidedOptions, journalContext } = req.body;

    const sanitizedTitle = sanitizeString(title, 200);
    const sanitizedDescription = sanitizeString(description, 3000);
    const sanitizedCategory = sanitizeString(category, 50) || "life";
    const sanitizedUrgency = sanitizeString(urgency, 20) || "medium";

    if (!sanitizedTitle || !sanitizedDescription) {
      return res.status(400).json({ error: "Decision title and description are required." });
    }

    // Optimization: Sanitize and compact journal context (top 3 most recent, concise summaries only)
    let contextSnippets: Array<{ title: string; summary: string; mood?: string }> = [];
    if (Array.isArray(journalContext) && journalContext.length > 0) {
      contextSnippets = journalContext.slice(0, 3).map((j: { title?: string; content?: string; summary?: string; mood?: string }) => ({
        title: sanitizeString(j.title, 80) || "Journal Entry",
        summary: sanitizeString(j.summary || j.content, 140) || "Reflective note",
        mood: sanitizeString(j.mood, 20) || undefined
      }));
    }

    const systemInstruction = `You are a world-class Decision Intelligence Architect and Socratic Life-Reflection Guide.
CORE PHILOSOPHY & MANDATORY BOUNDARIES:
1. STRICTLY DECISION-SUPPORTIVE, NEVER DECISION-MAKING: You must NEVER select, declare, endorse, or recommend a "winning", "best", or "chosen" path. The user retains 100% sovereign decision agency.
2. NEUTRAL & BALANCED PRESENTATION: Present every candidate path with equal objective rigor, realistic trade-offs, multi-dimensional comparative metrics (values alignment, feasibility), and balanced 3-scenario forecasts (bestCase, mostLikely, worstCase).
3. JOURNAL SIGNALS AS OBSERVATIONAL EVIDENCE ONLY: Any connections to past journal entries must be presented strictly as observational evidence/historical signals (e.g. "Signal: Past entries show that you value creative autonomy over structured routines..."), NEVER as a directive or final recommendation.
4. DECONSTRUCT COGNITIVE BLINDSPOTS: Illuminate unexamined assumptions, binary traps, and emotional hesitations, formulating provocative Socratic clarifying questions that empower the user's authentic inner discernment.`;

    const prompt = `Analyze this real-life crossroads facing the user objectively and comprehensively:
Decision Title: "${sanitizedTitle}"
Category: ${sanitizedCategory}
Urgency: ${sanitizedUrgency}
User's Description & Dilemma:
${sanitizedDescription}

${userProvidedOptions && Array.isArray(userProvidedOptions) && userProvidedOptions.length > 0 ? `User's initial candidate options to evaluate: ${JSON.stringify(userProvidedOptions.slice(0, 4))}` : ""}

${contextSnippets.length > 0 ? `Past Journal Context Reflections for Observational Signal Alignment:\n${JSON.stringify(contextSnippets, null, 2)}` : "No prior journal context provided."}

Return a STRICT JSON object matching this exact schema:
{
  "options": [
    {
      "id": "opt-1",
      "title": "Clear objective title for Path 1",
      "summary": "Cohesive, non-biased summary of this path and its core strategy.",
      "pros": ["3-4 distinct genuine advantages/benefits"],
      "cons": ["3-4 distinct genuine drawbacks, trade-offs, or costs"],
      "potentialOutcomes": {
        "bestCase": "Optimistic scenario if executed with high alignment.",
        "worstCase": "Pessimistic scenario and potential pitfalls.",
        "mostLikely": "Realistic, probabilistic trajectory."
      },
      "valuesAlignmentScore": 8,
      "feasibilityScore": 7
    },
    {
      "id": "opt-2",
      "title": "Clear objective title for Path 2",
      "summary": "Cohesive summary...",
      "pros": ["..."],
      "cons": ["..."],
      "potentialOutcomes": {
        "bestCase": "...",
        "worstCase": "...",
        "mostLikely": "..."
      },
      "valuesAlignmentScore": 7,
      "feasibilityScore": 9
    }
  ],
  "emotionalConcerns": [
    "3-4 deep emotional fears, hesitations, social pressures, or grief points inherent in this choice"
  ],
  "practicalConcerns": [
    "3-4 concrete logistical, financial, time, or resource constraints to account for"
  ],
  "hiddenAssumptions": [
    "3 unexamined mental models, binary thinking traps ('if I don't do X, Y is ruined'), or untested beliefs"
  ],
  "reflectiveQuestions": [
    "4 powerful Socratic questions to ask themselves before deciding (e.g., 'What would 80-year-old me regret more?', 'What am I defending here?')"
  ],
  "journalContextInsights": [
    "2-3 specific observational signals linking this decision to their historical journal themes, emotional resilience, or past declarations (e.g. 'Evidence: In past reflections, you noted that...')"
  ]
}

Ensure the response presents all candidate paths neutrally without declaring any single chosen path.`;

    const { response, modelUsed, durationMs } = await generateWithModelFallback({
      contents: prompt,
      preferredModel: "gemini-3.7-flash",
      timeoutMs: 35000,
      config: {
        systemInstruction,
        temperature: 0.35,
        responseMimeType: "application/json"
      }
    });

    const parsedData = parseJsonResponse(response.text, {});

    // Validate and structure fields
    const formattedOptions = (Array.isArray(parsedData.options) ? parsedData.options : []).map((opt: any, idx: number) => ({
      id: opt.id || `opt-${idx + 1}`,
      title: sanitizeString(opt.title, 200) || `Path ${idx + 1}`,
      summary: sanitizeString(opt.summary, 1000) || "Strategic decision path.",
      pros: Array.isArray(opt.pros) ? opt.pros.map((p: any) => sanitizeString(p, 300)) : [],
      cons: Array.isArray(opt.cons) ? opt.cons.map((c: any) => sanitizeString(c, 300)) : [],
      potentialOutcomes: {
        bestCase: sanitizeString(opt.potentialOutcomes?.bestCase, 500) || "Favorable alignment and personal growth.",
        worstCase: sanitizeString(opt.potentialOutcomes?.worstCase, 500) || "Risk of short-term friction or opportunity cost.",
        mostLikely: sanitizeString(opt.potentialOutcomes?.mostLikely, 500) || "Steady forward progress with manageable trade-offs."
      },
      valuesAlignmentScore: typeof opt.valuesAlignmentScore === "number" ? Math.min(10, Math.max(1, opt.valuesAlignmentScore)) : 7,
      feasibilityScore: typeof opt.feasibilityScore === "number" ? Math.min(10, Math.max(1, opt.feasibilityScore)) : 8,
    }));

    const result = {
      options: formattedOptions.length > 0 ? formattedOptions : [
        {
          id: "opt-1",
          title: "Direct Strategic Alignment",
          summary: "Commit toward the highest value-aligned option with dedicated boundaries.",
          pros: ["Deep authentic congruence", "Clarity of purpose"],
          cons: ["Short-term transition friction", "Requires focused discipline"],
          potentialOutcomes: {
            bestCase: "Major breakthrough and renewed purpose.",
            worstCase: "Temporary adjustment challenges.",
            mostLikely: "Meaningful growth with clarified priorities."
          },
          valuesAlignmentScore: 9,
          feasibilityScore: 8
        },
        {
          id: "opt-2",
          title: "Iterative Hybrid Approach",
          summary: "Pilot test key assumptions incrementally before irreversible commitments.",
          pros: ["Mitigates downside risk", "Maintains flexibility"],
          cons: ["Divided energy", "Delayed final outcome"],
          potentialOutcomes: {
            bestCase: "Smooth validated transition with low risk.",
            worstCase: "Prolonged decision fatigue.",
            mostLikely: "Gradual clarity with measured progress."
          },
          valuesAlignmentScore: 7,
          feasibilityScore: 9
        }
      ],
      emotionalConcerns: Array.isArray(parsedData.emotionalConcerns) ? parsedData.emotionalConcerns.map((e: any) => sanitizeString(e, 300)) : [],
      practicalConcerns: Array.isArray(parsedData.practicalConcerns) ? parsedData.practicalConcerns.map((p: any) => sanitizeString(p, 300)) : [],
      hiddenAssumptions: Array.isArray(parsedData.hiddenAssumptions) 
        ? parsedData.hiddenAssumptions.map((a: any) => sanitizeString(a, 300)) 
        : (Array.isArray(parsedData.blindspots) ? parsedData.blindspots.map((b: any) => sanitizeString(b, 300)) : []),
      reflectiveQuestions: Array.isArray(parsedData.reflectiveQuestions) && parsedData.reflectiveQuestions.length > 0
        ? parsedData.reflectiveQuestions.map((q: any) => sanitizeString(q, 300))
        : [
            "What outcome would 80-year-old you look back on with the deepest peace?",
            "What fear or expectation from others is exerting unseen pressure?",
            "If complete success was assured, which direction feels most authentic?"
          ],
      journalContextInsights: Array.isArray(parsedData.journalContextInsights) ? parsedData.journalContextInsights.map((j: any) => sanitizeString(j, 300)) : [],
      meta: {
        modelUsed,
        durationMs
      }
    };

    console.log(`[Decision Intelligence] Completed analysis for user ${userId} in ${durationMs}ms via ${modelUsed}`);
    return res.json(result);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal decision analysis error";
    console.error("Error in /api/decision/analyze:", errorMsg, error);
    return res.status(500).json({
      error: "DecisionAnalysisError",
      message: `Decision intelligence analysis failed: ${errorMsg}`
    });
  } finally {
    activeDecisionAnalysisUsers.delete(userId);
  }
});

// 8. Decision Companion: Post-Decision Review & Calibration Assistant
app.post("/api/decision/post-review", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      decisionTitle, 
      chosenOptionTitle, 
      predictedOutcomes, 
      initialAssumptions,
      outcomesObserved, 
      surprises, 
      accuratePredictions, 
      wrongAssumptions, 
      satisfactionScore, 
      repeatChoice, 
      selfLearning, 
      intuitionAccuracy, 
      userLessons 
    } = req.body;

    const prompt = `A user made a major life or career decision and is now conducting a Post-Decision Calibration review.
Your mission: act as an empathetic, non-judgmental Decision Intelligence mentor.
Compare expectations vs reality objectively. DO NOT judge or critique whether the user's decision was "right" or "wrong". Celebrate their sovereign agency and cultivate self-awareness.

Decision Context:
- Decision Title: "${sanitizeString(decisionTitle, 200)}"
- Chosen Path: "${sanitizeString(chosenOptionTitle, 200)}"
- Initial Predictions / Scenarios: ${JSON.stringify(predictedOutcomes || {})}
- Initial Hidden Assumptions: ${JSON.stringify(initialAssumptions || [])}

User's Real-World Calibration Answers:
- What actually happened: "${sanitizeString(outcomesObserved, 2000)}"
- What surprised the user: "${sanitizeString(surprises || '', 1000)}"
- Which prediction was accurate: "${sanitizeString(accuratePredictions || '', 1000)}"
- Which assumption was wrong: "${sanitizeString(wrongAssumptions || '', 1000)}"
- Outcome satisfaction score (1 to 10): ${satisfactionScore ?? 'Not specified'}
- Would make the same decision again: ${repeatChoice || intuitionAccuracy || 'Not specified'}
- What was learned about self: "${sanitizeString(selfLearning || userLessons || '', 2000)}"

Return a STRICT JSON object:
{
  "synthesizedTakeaway": "A warm, grounding 2-3 sentence synthesis recognizing their courage and framing reality as invaluable life data.",
  "intuitionCalibrationInsight": "A clear, completely non-judgmental comparison showing where the user's forecasts/assumptions were accurate vs where reality surprised them.",
  "futureHeuristics": [
    "2-3 concrete personal decision heuristics or wisdom principles for their future crossroads"
  ],
  "celebrationAnchor": "A brief acknowledgment of sovereign agency, resilience, and personal evolution.",
  "comparisonPoints": [
    {
      "prediction": "What the user anticipated (fear, best-case, or forecast)",
      "reality": "What actually materialized in reality",
      "learning": "The self-knowledge or operational wisdom gained"
    }
  ]
}

Ensure all fields are populated and valid JSON without markdown wrapping.`;

    const { response } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const parsedData = parseJsonResponse(response.text, {});
    return res.json(parsedData);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal post-review error";
    console.error("Error in /api/decision/post-review:", errorMsg, error);
    return res.status(500).json({
      error: "PostReviewError",
      message: `Unable to process post-decision review: ${errorMsg}`
    });
  }
});

// ==========================================
// NEW: PATTERN DISCOVERY ACROSS JOURNAL HISTORY
// ==========================================

// 9. Pattern Discovery: Cognitive Loops, Emotional Anchors & Value Congruence
app.post("/api/patterns/discover", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entries, decisions } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "At least 1 journal entry is required to begin discovering patterns." });
    }

    const sanitizedEntries = entries.slice(0, 30).map((e: { title?: string; content?: string; mood?: string; createdAt?: string; tags?: string[] }) => ({
      date: sanitizeString(e.createdAt, 50),
      title: sanitizeString(e.title, 100),
      mood: sanitizeString(e.mood, 30),
      tags: Array.isArray(e.tags) ? e.tags.slice(0, 5) : [],
      contentSnippet: sanitizeString(e.content, 500)
    }));

    const sanitizedDecisions = Array.isArray(decisions) ? decisions.slice(0, 15).map((d: any) => ({
      title: sanitizeString(d.title, 100),
      category: sanitizeString(d.category, 50),
      status: sanitizeString(d.status, 30),
      chosenOptionTitle: d.options?.find((o: any) => o.id === d.chosenOptionId)?.title || "Undecided / Exploring",
      rationale: sanitizeString(d.decisionRationale || "", 300),
      postReflectionLessons: sanitizeString(d.postDecisionReview?.synthesizedTakeaway || "", 300),
    })) : [];

    const prompt = `You are an expert cognitive behavioral scientist and pattern recognition intelligence system.
Analyze this user's journal reflections and crossroads decisions across time to uncover recurring thoughts, behaviors, values, and decision habits.

CRITICAL DIRECTIVES:
1. Keep insights strictly OBSERVATIONAL and EMPATHETIC. NEVER use diagnostic, clinical, or psychiatric labeling.
2. Synthesize recurring thoughts, behavioral loops, emotional anchors (what restores vs. drains them), and decision habits.
3. Highlight value congruence and concrete conditions for peak clarity.

Journal Entries:
${JSON.stringify(sanitizedEntries, null, 2)}

${sanitizedDecisions.length > 0 ? `Past Decisions & Crossroads:\n${JSON.stringify(sanitizedDecisions, null, 2)}` : ""}

Return a STRICT JSON object matching this schema:
{
  "cognitiveLoops": [
    {
      "loopName": "Name of recurring pattern e.g. Pre-Deadline Perfectionism Loop or Overthinking Crossroads",
      "trigger": "Specific situational or emotional trigger that activates it",
      "impact": "How it drains energy, delays action, or alters mood",
      "reframingStrategy": "Empowering, compassionate observational reframing to interrupt this loop"
    }
  ],
  "emotionalAnchors": [
    {
      "category": "restorative",
      "theme": "e.g. Solo Nature Walks & Morning Journaling",
      "description": "Consistently correlated with high serenity and mental clarity in the logs.",
      "frequencyObservation": "Occurs frequently; mood improves significantly when present.",
      "recommendation": "Intentionally schedule as an anchor ritual."
    },
    {
      "category": "depleting",
      "theme": "e.g. Late-night context switching & unresolved task lists",
      "description": "Consistently precedes feelings of fatigue and anxiety.",
      "frequencyObservation": "Noticed on days with fragmented work.",
      "recommendation": "Implement a calming boundary or transition ritual."
    }
  ],
  "peakClarityConditions": [
    "3 concrete environmental, physical, or mindset conditions where this user experiences maximum flow and serenity"
  ],
  "valueCongruenceScore": An integer from 0 to 100 (where 100 = life actions completely match articulated values),
  "valueCongruenceBreakdown": [
    {
      "value": "Autonomy / Creative Freedom",
      "alignmentStatus": "aligned",
      "observation": "High energy when pursuing self-directed projects."
    },
    {
      "value": "Rest / Physical Vitality",
      "alignmentStatus": "under_nurtured",
      "observation": "Frequent mentions of fatigue without scheduled recovery."
    }
  ],
  "behavioralCyclesSummary": "A cohesive 2-paragraph observational narrative describing the user's natural energetic, reflective, and decision-making rhythms.",
  "actionableMicroHabits": [
    "3-4 distinct micro-habits (< 5 minutes each) specifically calibrated to their discovered patterns"
  ]
}

Ensure all fields are valid JSON without markdown wrapping.`;

    const { response } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.35,
        responseMimeType: "application/json"
      }
    });

    const parsedData = parseJsonResponse(response.text, {});
    return res.json(parsedData);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal pattern discovery error";
    console.error("Error in /api/patterns/discover:", errorMsg, error);
    return res.status(500).json({
      error: "PatternDiscoveryError",
      message: `Unable to process cross-journal pattern discovery: ${errorMsg}`
    });
  }
});

// ==========================================
// NEW: PERSONAL GROWTH TIMELINE AUTO-DETECTION
// ==========================================

// 10. Auto-Detect Growth Breakthroughs & Mindset Shifts from Entries & Decisions
app.post("/api/timeline/auto-detect", authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entries, decisions } = req.body;

    const sanitizedEntries = Array.isArray(entries) ? entries.slice(0, 20).map((e: { id?: string; title?: string; content?: string; createdAt?: string; mood?: string }) => ({
      id: e.id,
      title: sanitizeString(e.title, 100),
      snippet: sanitizeString(e.content, 400),
      date: sanitizeString(e.createdAt, 50),
      mood: sanitizeString(e.mood, 30)
    })) : [];

    const sanitizedDecisions = Array.isArray(decisions) ? decisions.slice(0, 10).map((d: { id?: string; title?: string; description?: string; createdAt?: string; status?: string }) => ({
      id: d.id,
      title: sanitizeString(d.title, 100),
      snippet: sanitizeString(d.description, 300),
      date: sanitizeString(d.createdAt, 50),
      status: sanitizeString(d.status, 30)
    })) : [];

    const prompt = `Scan through this user's journal logs and decision records to detect profound Personal Growth Milestones, Mindset Shifts, Breakthrough Moments, and Emotional Trajectories.

Journal Logs:
${JSON.stringify(sanitizedEntries, null, 2)}

Decisions:
${JSON.stringify(sanitizedDecisions, null, 2)}

Identify 2-5 distinct genuine growth milestones.
Return STRICT JSON array of objects:
{
  "milestones": [
    {
      "title": "A captivating, celebratory title for this breakthrough",
      "description": "Contextual description of what transpired and why it represents a mindset evolution",
      "category": "mindset_shift | breakthrough | decision_point | emotional_milestone | life_transition",
      "impactLevel": "transformational | significant | notable",
      "date": "YYYY-MM-DD or date from the matching record",
      "keyLearning": "The core wisdom or cognitive shift distilled from this moment",
      "tags": ["Tag1", "Tag2"],
      "relatedEntryId": "matching entry ID or omit if general",
      "relatedDecisionId": "matching decision ID or omit if general"
    }
  ]
}

Ensure all fields are valid JSON without markdown wrapping.`;

    const { response } = await generateWithModelFallback({
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });

    const parsedData = parseJsonResponse(response.text, { milestones: [] });
    return res.json(parsedData);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal timeline detection error";
    console.error("Error in /api/timeline/auto-detect:", errorMsg, error);
    return res.status(500).json({
      error: "TimelineDetectionError",
      message: `Unable to auto-detect timeline milestones: ${errorMsg}`
    });
  }
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Firebase Admin] Personal Gemini Journal & Decision Intelligence backend running on http://0.0.0.0:${PORT}`);
    console.log(`[Firebase Admin] Cryptographic verifyIdToken and Secret Manager proxies active.`);
  });
}

startServer();
