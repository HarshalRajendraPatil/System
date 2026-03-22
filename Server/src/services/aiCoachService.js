const { env } = require('../config/env');
const { createHttpError } = require('../utils/httpError');
const { shiftDateKey, toDateKey } = require('../utils/date');
const {
  ensureProfileById,
  getQuestHistory,
  recalculateProfileProgress,
} = require('./rpgService');
const { getDSAStats } = require('./dsaService');
const { getTrendAnalytics } = require('./mockService');
const { getBehavioralAnalytics } = require('./behavioralService');
const { getProjectMetrics } = require('./projectService');
const AICoachInsight = require('../models/AICoachInsight');
const {
  AI_COACH_TYPE,
  AI_PRIORITY,
  AI_PRIORITY_ORDER,
  AI_TONE,
  AI_TONE_ORDER,
} = require('../constants/ai');

let geminiClientPromise = null;

// const GEMINI_MODEL_FALLBACK_ORDER = [
//   'gemini-2.5-flash',
//   'gemini-2.0-flash',
//   'gemini-1.5-flash',
// ];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const withTimeout = async (promise, timeoutMs, label = 'Operation') =>
  new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(createHttpError(504, `${label} timed out`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutHandle);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
  });

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value, fallback = '') => {
  const next = String(value || '').trim();
  return next || fallback;
};

const getGeminiClient = async () => {
  if (!geminiClientPromise) {
    geminiClientPromise = import('@google/genai').then(({ GoogleGenAI }) =>
      new GoogleGenAI({ apiKey: env.geminiApiKey })
    );
  }

  return geminiClientPromise;
};

const sanitizeTextArray = (value, maxItems = 8) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, maxItems);
};

const sanitizeSuggestionList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 7).map((item) => {
    const priority = AI_PRIORITY_ORDER.includes(item?.priority) ? item.priority : AI_PRIORITY.MEDIUM;

    return {
      title: asString(item?.title, 'Focused improvement step'),
      why: asString(item?.why, 'This addresses your current prep bottleneck.'),
      actions: sanitizeTextArray(item?.actions, 5),
      priority,
    };
  });
};

const sanitizeWeaknessList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 7).map((item) => ({
    area: asString(item?.area, 'General consistency'),
    evidence: asString(item?.evidence, 'Recent prep signals indicate room to improve.'),
    impact: asString(item?.impact, 'Could slow interview readiness if left untreated.'),
    recommendation: asString(item?.recommendation, 'Create one measurable weekly action.'),
  }));
};

const sanitizeWeeklyPlan = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 7).map((item, index) => ({
    day: asString(item?.day, `Day ${index + 1}`),
    focus: asString(item?.focus, 'Balanced prep'),
    task: asString(item?.task, 'Complete one measurable prep task.'),
  }));
};

const compactSnapshotForStorage = (snapshot = {}) => ({
  generatedAt: snapshot.generatedAt,
  profile: snapshot.profile,
  questSignals: snapshot.questSignals,
  dsaStats: snapshot.dsaStats,
  mockSummary: {
    totalMocks: snapshot.mockTrends?.totalMocks || 0,
    summary: snapshot.mockTrends?.summary || {},
    topWeaknesses: (snapshot.mockTrends?.weaknessDistribution || []).slice(0, 5),
  },
  behavioralSummary: {
    totals: snapshot.behavioralAnalytics?.totals || {},
    missingCoreCompetencies: snapshot.behavioralAnalytics?.missingCoreCompetencies || [],
  },
  projectMetrics: snapshot.projectMetrics || {},
});

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonObject = (content) => {
  if (!content) {
    return null;
  }

  const trimmed = String(content).trim();
  const direct = safeJsonParse(trimmed);
  if (direct && typeof direct === 'object') {
    return direct;
  }

  const blockMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (blockMatch?.[1]) {
    const parsed = safeJsonParse(blockMatch[1]);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    const parsed = safeJsonParse(candidate);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  }

  return null;
};

const summarizeQuestConsistency = (quests, windowDays) => {
  const endKey = toDateKey(new Date());
  const startKey = shiftDateKey(endKey, -(windowDays - 1));

  const filtered = quests.filter((quest) => quest.dateKey >= startKey && quest.dateKey <= endKey);
  const completed = filtered.filter((quest) => Boolean(quest.completed));

  const completionRate = windowDays > 0 ? completed.length / windowDays : 0;
  const averageHours = filtered.length
    ? filtered.reduce((sum, item) => sum + (Number(item.hoursLogged) || 0), 0) / filtered.length
    : 0;

  return {
    windowDays,
    trackedDays: filtered.length,
    completedDays: completed.length,
    completionRate: Number(completionRate.toFixed(3)),
    averageHours: Number(averageHours.toFixed(2)),
  };
};

const buildPerformanceSnapshot = async (userId) => {
  const baseProfile = await ensureProfileById(userId);
  const refreshed = await recalculateProfileProgress(baseProfile._id);

  const todayDateKey = toDateKey(new Date());
  const historyStart = shiftDateKey(todayDateKey, -59);

  const [questHistory, dsaStats, mockTrends, behavioralAnalytics, projectMetrics] = await Promise.all([
    getQuestHistory(userId, { fromDateKey: historyStart, toDateKey: todayDateKey }),
    getDSAStats({ userId, fromDateKey: historyStart, toDateKey: todayDateKey }),
    getTrendAnalytics(userId, 90),
    getBehavioralAnalytics(userId),
    getProjectMetrics(userId),
  ]);

  const consistency14 = summarizeQuestConsistency(questHistory, 14);
  const consistency30 = summarizeQuestConsistency(questHistory, 30);

  const questSignals = {
    totalTrackedDays: questHistory.length,
    totalQuestXp: questHistory.reduce((sum, quest) => sum + (Number(quest.xpEarned) || 0), 0),
    consistency14,
    consistency30,
  };

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      level: refreshed.profile.level,
      totalXp: refreshed.profile.totalXp,
      currentStreak: refreshed.profile.currentStreak,
      longestStreak: refreshed.profile.longestStreak,
      xpToNextLevel: refreshed.profile.xpToNextLevel,
      levelProgressPercent: refreshed.profile.levelProgressPercent,
    },
    questSignals,
    dsaStats,
    mockTrends,
    behavioralAnalytics,
    projectMetrics,
  };
};

const buildStreakProjection = (snapshot) => {
  const currentStreak = Number(snapshot?.profile?.currentStreak) || 0;
  const completionRate = Number(snapshot?.questSignals?.consistency14?.completionRate) || 0;

  const likelyGain = Math.round(7 * clamp(completionRate * 0.9, 0, 1));
  const bestGain = Math.round(7 * clamp(completionRate + 0.2, 0, 1));
  const riskGain = Math.round(7 * clamp(completionRate - 0.3, 0, 1));

  const confidence = completionRate >= 0.75 ? 'high' : completionRate >= 0.45 ? 'medium' : 'low';

  return {
    currentStreak,
    projectedBestCase: currentStreak + bestGain,
    projectedLikely: currentStreak + likelyGain,
    projectedRiskCase: currentStreak + riskGain,
    confidence,
    rationale:
      completionRate >= 0.75
        ? 'Recent consistency is strong; keep the cadence to compound streak momentum.'
        : completionRate >= 0.45
          ? 'Consistency is moderate; one missed day can flatten growth.'
          : 'Streak recovery needs tighter daily minimum commitments.',
  };
};

const buildFallbackReport = (snapshot, options = {}) => {
  const topMockWeakness = snapshot?.mockTrends?.weaknessDistribution?.[0]?.weakness || 'inconsistent communication clarity';
  const mockAverage = Number(snapshot?.mockTrends?.summary?.averageScore) || 0;
  const dsaHard = Number(snapshot?.dsaStats?.hardCount) || 0;
  const behaviorMissing = snapshot?.behavioralAnalytics?.missingCoreCompetencies || [];

  const suggestions = [
    {
      title: 'Enforce a daily minimum commitment',
      why: 'Small guaranteed wins improve streak retention and reduce zero-days.',
      actions: [
        'Set a non-negotiable 45-minute prep block for every day this week.',
        'Prioritize one DSA or mock follow-up before optional tasks.',
      ],
      priority: AI_PRIORITY.HIGH,
    },
    {
      title: 'Strengthen mock interview weak areas',
      why: `Top repeated weakness appears to be ${topMockWeakness}.`,
      actions: [
        'After each mock, add one corrective drill and re-practice within 48 hours.',
        'Use explicit STAR transitions while answering behavioral prompts.',
      ],
      priority: AI_PRIORITY.HIGH,
    },
    {
      title: 'Upgrade depth of technical prep',
      why: 'A higher share of harder problems improves interview resilience.',
      actions: [
        `Complete at least 3 hard DSA problems this week (current recent hard count: ${dsaHard}).`,
        'Write short post-solve notes focused on trade-offs and complexity.',
      ],
      priority: AI_PRIORITY.MEDIUM,
    },
  ];

  if (behaviorMissing.length) {
    suggestions.push({
      title: 'Close behavioral competency gaps',
      why: 'Missing competency coverage can limit answer variety in interviews.',
      actions: [
        `Add 2 STAR stories covering: ${behaviorMissing.slice(0, 3).join(', ')}.`,
        'Practice one missing-competency story in random mode every two days.',
      ],
      priority: AI_PRIORITY.MEDIUM,
    });
  }

  const weaknessAnalysis = [
    {
      area: 'Mock performance consistency',
      evidence: `Current mock average score is ${mockAverage}.`,
      impact: 'Unstable mock outcomes reduce confidence under real interview pressure.',
      recommendation: 'Set one measurable quality rubric and score each mock against it.',
    },
    {
      area: 'Daily execution discipline',
      evidence: `14-day completion rate is ${Math.round((snapshot?.questSignals?.consistency14?.completionRate || 0) * 100)}%.`,
      impact: 'Irregular prep slows both streak growth and skill compounding.',
      recommendation: 'Protect a fixed daily prep slot and track completion before sleep.',
    },
  ];

  const tone = AI_TONE_ORDER.includes(options.tone) ? options.tone : AI_TONE.BALANCED;
  const motivationBase = {
    balanced: 'You are closer than your current metrics suggest. Consistency in the next 7 days will create visible confidence gains.',
    tough_love: 'Potential is not the issue. Execution is. Hit your daily baseline every day this week or expect flat outcomes.',
    supportive: 'You are building real momentum. Keep stacking focused sessions and trust the process.',
  };

  const weeklyPlan = [
    { day: 'Day 1', focus: 'DSA depth', task: 'Solve one medium/hard problem and document trade-offs.' },
    { day: 'Day 2', focus: 'Behavioral STAR', task: 'Practice one favorite and one weak story aloud.' },
    { day: 'Day 3', focus: 'Mock correction', task: 'Run one mock and fix top weakness immediately.' },
    { day: 'Day 4', focus: 'System design', task: 'Draft one design in 30 minutes and review bottlenecks.' },
    { day: 'Day 5', focus: 'Communication polish', task: 'Record and refine two answer walkthroughs.' },
    { day: 'Day 6', focus: 'Mixed drill', task: 'Do one DSA + one behavioral rapid round.' },
    { day: 'Day 7', focus: 'Review and reset', task: 'Audit wins, misses, and set next week objectives.' },
  ];

  return {
    motivation: motivationBase[tone],
    focusTheme: asString(options.focusArea, 'Execution consistency and interview clarity'),
    suggestions: suggestions.slice(0, 6),
    weaknessAnalysis,
    streakProjection: buildStreakProjection(snapshot),
    weeklyPlan,
    riskAlerts: [
      'Skipping practice for two consecutive days may collapse streak growth.',
      'Repeating mocks without post-analysis slows improvement velocity.',
    ],
  };
};

const buildPrompt = (snapshot, options = {}) => {
  const tone = AI_TONE_ORDER.includes(options.tone) ? options.tone : AI_TONE.BALANCED;
  const type = options.type || AI_COACH_TYPE.FULL_REPORT;
  const isMotivationOnly = type === AI_COACH_TYPE.MOTIVATION;

  const schemaDescription = isMotivationOnly
    ? 'motivation (string), focusTheme (string).'
    : [
      'motivation (string), focusTheme (string), suggestions (array of {title, why, actions, priority}),',
      'weaknessAnalysis (array of {area, evidence, impact, recommendation}),',
      'streakProjection ({currentStreak, projectedBestCase, projectedLikely, projectedRiskCase, confidence, rationale}),',
      'weeklyPlan (array of 7 items {day, focus, task}), riskAlerts (array of strings).',
    ].join(' ');

  return {
    system: [
      'You are a disciplined placement interview coach for a software engineer.',
      'Use only the provided performance snapshot.',
      'Return strict JSON without markdown fences.',
      'Be specific, measurable, and realistic for a 7-day horizon.',
      'JSON schema keys required:',
      schemaDescription,
      `Tone: ${tone}.`,
    ].join(' '),
    user: JSON.stringify({
      requestType: type,
      focusArea: asString(options.focusArea, ''),
      customPrompt: asString(options.customPrompt, ''),
      snapshot,
    }),
  };
};

// const buildGeminiModelCandidates = () => {
//   const configured = asString(env.geminiModel, '');
//   const ordered = configured
//     ? [configured, ...GEMINI_MODEL_FALLBACK_ORDER]
//     : [...GEMINI_MODEL_FALLBACK_ORDER];

//   return [...new Set(ordered)];
// };

const resolveGeminiText = async (response) => {
  if (typeof response?.text === 'function') {
    return asString(await response.text(), '');
  }

  return asString(response?.text, '');
};

const callGeminiJson = async (snapshot, options = {}) => {
  if (env.aiCoachFallbackOnly || !env.geminiApiKey) {
    throw createHttpError(503, 'Gemini AI is not configured. Falling back to local coach logic.');
  }

  const prompt = buildPrompt(snapshot, options);
  const ai = await getGeminiClient();
  console.log("hi there")
  const started = Date.now();
  let lastError = createHttpError(502, 'Gemini request failed');

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt.user }],
          },
        ],
        config: {
          systemInstruction: prompt.system,
          responseMimeType: 'application/json',
        },
      }),
      env.geminiTimeoutMs,
      'Gemini request',
    );
    console.log("gemini response received:", response);

    const content = await resolveGeminiText(response);
    console.log("gemini response content:", content);
    lastError = createHttpError(502, 'Gemini response was empty');

    const parsed = extractJsonObject(content);
    console.log("gemini response parsed:", parsed);

    lastError = createHttpError(502, 'Gemini response could not be parsed as JSON');

    const latencyMs = Date.now() - started;

    return {
      parsed,
      provider: 'gemini',
      model: response?.modelVersion || modelName,
      latencyMs,
      usage: {
        promptTokens: toSafeNumber(response?.usageMetadata?.promptTokenCount, 0),
        completionTokens: toSafeNumber(response?.usageMetadata?.candidatesTokenCount, 0),
        totalTokens: toSafeNumber(response?.usageMetadata?.totalTokenCount, 0),
      },
    };
  } catch (error) {
    lastError = error;
  }

  throw lastError;
};

const sanitizeCoachReport = (raw, snapshot, options = {}) => {
  const fallback = buildFallbackReport(snapshot, options);

  return {
    motivation: asString(raw?.motivation, fallback.motivation),
    focusTheme: asString(raw?.focusTheme, fallback.focusTheme),
    suggestions: sanitizeSuggestionList(raw?.suggestions).length
      ? sanitizeSuggestionList(raw?.suggestions)
      : fallback.suggestions,
    weaknessAnalysis: sanitizeWeaknessList(raw?.weaknessAnalysis).length
      ? sanitizeWeaknessList(raw?.weaknessAnalysis)
      : fallback.weaknessAnalysis,
    streakProjection: {
      ...fallback.streakProjection,
      ...(raw?.streakProjection || {}),
    },
    weeklyPlan: sanitizeWeeklyPlan(raw?.weeklyPlan).length
      ? sanitizeWeeklyPlan(raw?.weeklyPlan)
      : fallback.weeklyPlan,
    riskAlerts: sanitizeTextArray(raw?.riskAlerts, 8).length
      ? sanitizeTextArray(raw?.riskAlerts, 8)
      : fallback.riskAlerts,
  };
};

const persistInsight = async (userId, options, snapshot, result) => {
  const record = await AICoachInsight.create({
    userId,
    type: options.type || AI_COACH_TYPE.FULL_REPORT,
    focusArea: asString(options.focusArea),
    tone: AI_TONE_ORDER.includes(options.tone) ? options.tone : AI_TONE.BALANCED,
    customPrompt: asString(options.customPrompt),
    provider: result.provider,
    model: result.model,
    latencyMs: toSafeNumber(result.latencyMs, 0),
    usage: result.usage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    snapshot: compactSnapshotForStorage(snapshot),
    insight: result.report,
  });

  return record.toObject();
};

const generateCoachReport = async (userId, options = {}) => {
  await ensureProfileById(userId);

  const type = options.type || AI_COACH_TYPE.FULL_REPORT;
  if (![AI_COACH_TYPE.FULL_REPORT, AI_COACH_TYPE.MOTIVATION].includes(type)) {
    throw createHttpError(400, 'Invalid AI coach request type');
  }

  const snapshot = await buildPerformanceSnapshot(userId);

  let providerResult;
  try {
    const gemini = await callGeminiJson(snapshot, options);
    console.log("gemini result:", gemini);
    providerResult = {
      provider: gemini.provider,
      model: gemini.model,
      latencyMs: gemini.latencyMs,
      usage: gemini.usage,
      report: sanitizeCoachReport(gemini.parsed, snapshot, options),
    };
  } catch (error) {
    console.error("Error generating coach report:", error);
    providerResult = {
      provider: 'fallback',
      model: 'heuristic-engine-v1',
      latencyMs: 0,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      report: buildFallbackReport(snapshot, options),
    };
  }

  if (type === AI_COACH_TYPE.MOTIVATION) {
    providerResult.report = {
      ...providerResult.report,
      suggestions: [],
      weaknessAnalysis: [],
      weeklyPlan: [],
      riskAlerts: [],
    };
  }

  const insightRecord = await persistInsight(userId, { ...options, type }, snapshot, providerResult);

  return {
    report: providerResult.report,
    provider: providerResult.provider,
    model: providerResult.model,
    generatedAt: new Date().toISOString(),
    snapshot,
    insightId: insightRecord._id,
  };
};

const getCoachHistory = async (userId, query = {}) => {
  await ensureProfileById(userId);

  const limit = clamp(toSafeNumber(query.limit, 15), 1, 50);
  const type = asString(query.type);

  const filter = { userId };
  if (type && [AI_COACH_TYPE.FULL_REPORT, AI_COACH_TYPE.MOTIVATION].includes(type)) {
    filter.type = type;
  }

  const records = await AICoachInsight.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return records;
};

const getLatestCoachInsight = async (userId, query = {}) => {
  await ensureProfileById(userId);

  const type = asString(query.type);
  const filter = { userId };
  if (type && [AI_COACH_TYPE.FULL_REPORT, AI_COACH_TYPE.MOTIVATION].includes(type)) {
    filter.type = type;
  }

  const latest = await AICoachInsight.findOne(filter)
    .sort({ createdAt: -1 })
    .lean();

  return latest;
};

const getCoachSnapshot = async (userId) => buildPerformanceSnapshot(userId);

const deleteCoachInsight = async (userId, insightId) => {
  await ensureProfileById(userId);

  const deleted = await AICoachInsight.findOneAndDelete({
    _id: insightId,
    userId,
  });

  if (!deleted) {
    throw createHttpError(404, 'AI coach history item not found');
  }

  return {
    deletedId: deleted._id,
  };
};

module.exports = {
  deleteCoachInsight,
  generateCoachReport,
  getCoachHistory,
  getCoachSnapshot,
  getLatestCoachInsight,
};
