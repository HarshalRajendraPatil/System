const PortfolioProfile = require('../models/PortfolioProfile');
const UserProfile = require('../models/UserProfile');
const { env } = require('../config/env');
const { createHttpError } = require('../utils/httpError');
const { shiftDateKey, toDateKey } = require('../utils/date');
const { ensureProfileById, getQuestHistory } = require('./rpgService');
const { getDSAStats } = require('./dsaService');
const { getProjectMetrics } = require('./projectService');
const { getTrendAnalytics } = require('./mockService');
const { getBehavioralAnalytics } = require('./behavioralService');
const { getLatestCoachInsight } = require('./aiCoachService');
const {
  PORTFOLIO_SLUG_PATTERN,
  PORTFOLIO_THEME,
  PORTFOLIO_THEME_ORDER,
} = require('../constants/portfolio');

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44);

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonObject = (content) => {
  const trimmed = String(content || '').trim();
  if (!trimmed) {
    return null;
  }

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
    return safeJsonParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
};

const normalizeUrl = (value) => {
  const next = String(value || '').trim();
  if (!next) {
    return '';
  }

  if (!/^https?:\/\/.+/i.test(next)) {
    throw createHttpError(400, 'Portfolio links must be valid HTTP/HTTPS URLs');
  }

  return next;
};

const ensureUniqueSlug = async (baseSlug, excludedUserId = null) => {
  const safeBase = slugify(baseSlug) || `portfolio-${Date.now()}`;

  let candidate = safeBase;
  let suffix = 1;

  while (true) {
    const existing = await PortfolioProfile.findOne({ slug: candidate })
      .select('userId')
      .lean();

    if (!existing || String(existing.userId) === String(excludedUserId || '')) {
      return candidate;
    }

    suffix += 1;
    candidate = `${safeBase}-${suffix}`;
  }
};

const ensurePortfolioProfile = async (userId) => {
  const profile = await ensureProfileById(userId);

  let settings = await PortfolioProfile.findOne({ userId });

  if (!settings) {
    const startingSlug = await ensureUniqueSlug(
      `${profile.displayName || profile.username}-${profile.username || 'portfolio'}`,
      userId,
    );

    settings = await PortfolioProfile.create({
      userId,
      slug: startingSlug,
      headline: `Placement journey of ${profile.displayName || profile.username}`,
      summary: 'Building interview readiness with consistent practice and measurable outcomes.',
      themePreference: PORTFOLIO_THEME.DARK,
    });
  }

  return settings;
};

const buildQuestTrend = (quests = []) => {
  const map = new Map();

  quests.forEach((quest) => {
    map.set(quest.dateKey, {
      dateKey: quest.dateKey,
      xpEarned: Number(quest.xpEarned) || 0,
      completed: Boolean(quest.completed),
      hoursLogged: Number(quest.hoursLogged) || 0,
    });
  });

  const today = toDateKey(new Date());

  const trend = [];
  for (let index = 29; index >= 0; index -= 1) {
    const dateKey = shiftDateKey(today, -index);
    trend.push(map.get(dateKey) || {
      dateKey,
      xpEarned: 0,
      completed: false,
      hoursLogged: 0,
    });
  }

  return trend;
};

const buildReadinessRadar = (snapshot) => {
  const consistency = clamp((toSafeNumber(snapshot?.profile?.currentStreak, 0) / 30) * 100, 0, 100);
  const dsaDepth = clamp((toSafeNumber(snapshot?.dsa?.totalProblems, 0) / 40) * 100, 0, 100);
  const systemAndProjects = clamp(toSafeNumber(snapshot?.projects?.averageImpactScore, 0), 0, 100);
  const interviewReadiness = clamp(toSafeNumber(snapshot?.mocks?.averageScore, 0), 0, 100);
  const communication = clamp((toSafeNumber(snapshot?.behavioral?.averageConfidence, 0) / 10) * 100, 0, 100);

  return [
    { axis: 'Consistency', score: Number(consistency.toFixed(2)) },
    { axis: 'Problem Solving', score: Number(dsaDepth.toFixed(2)) },
    { axis: 'Project Impact', score: Number(systemAndProjects.toFixed(2)) },
    { axis: 'Interview Readiness', score: Number(interviewReadiness.toFixed(2)) },
    { axis: 'Communication', score: Number(communication.toFixed(2)) },
  ];
};

const buildPortfolioFallbackInsights = (snapshot) => {
  const avgMock = toSafeNumber(snapshot?.mocks?.averageScore, 0);
  const dsaTotal = toSafeNumber(snapshot?.dsa?.totalProblems, 0);
  const currentStreak = toSafeNumber(snapshot?.profile?.currentStreak, 0);
  const weakestArea = (snapshot?.mocks?.topWeaknesses || [])[0]?.weakness || 'answer structure clarity';

  const readinessScore = clamp(
    Math.round(
      ((avgMock / 100) * 35)
      + ((dsaTotal / 40) * 25)
      + ((currentStreak / 21) * 20)
      + ((toSafeNumber(snapshot?.projects?.averageImpactScore, 0) / 100) * 20),
    ),
    0,
    100,
  );

  return {
    readinessScore,
    executiveSummary:
      readinessScore >= 75
        ? 'High interview readiness trajectory with strong execution consistency.'
        : readinessScore >= 50
          ? 'Solid momentum with clear upside by tightening mock-feedback loops.'
          : 'Early-to-mid readiness stage; consistency and focused revision can accelerate outcomes quickly.',
    strengths: [
      `Streak momentum: ${currentStreak} active days`,
      `Technical practice volume: ${dsaTotal} DSA problems in window`,
      `Project delivery signal: ${toSafeNumber(snapshot?.projects?.shipped, 0)} shipped projects`,
    ],
    risks: [
      `Most repeated mock weakness: ${weakestArea}`,
      'Score volatility can increase in final interview rounds without deliberate correction loops.',
      'Behavioral competency coverage gaps may limit answer variety under pressure.',
    ],
    nextWeekPlan: [
      'Run 2 mocks and close the top weakness within 48 hours each.',
      'Solve at least 5 medium/hard DSA problems with post-solve notes.',
      'Add 2 STAR stories for missing competencies and practice them aloud.',
    ],
    statHighlights: [
      `Quest XP in window: ${(snapshot?.graphs?.questTrend || []).reduce((sum, row) => sum + (row.xpEarned || 0), 0)}`,
      `Total study hours in window: ${(snapshot?.graphs?.questTrend || []).reduce((sum, row) => sum + (row.hoursLogged || 0), 0).toFixed(1)}`,
      `Mock attempts analyzed: ${toSafeNumber(snapshot?.mocks?.totalMocks, 0)}`,
    ],
    tacticalStats: {
      weakAreasCount: (snapshot?.mocks?.topWeaknesses || []).length,
      shippedProjects: toSafeNumber(snapshot?.projects?.shipped, 0),
      hardProblems: toSafeNumber(snapshot?.dsa?.hardCount, 0),
      practiceSessions: toSafeNumber(snapshot?.behavioral?.totalPracticeSessions, 0),
    },
    forecast: {
      likelyReadinessIn14Days: clamp(readinessScore + 8, 0, 100),
      bestCaseIn14Days: clamp(readinessScore + 15, 0, 100),
      riskCaseIn14Days: clamp(readinessScore - 4, 0, 100),
    },
  };
};

const buildPortfolioInsightsPrompt = (snapshot) => {
  const schema = {
    readinessScore: 'number 0-100',
    executiveSummary: 'string under 220 chars',
    strengths: 'array of 3 concise strings',
    risks: 'array of 3 concise strings',
    nextWeekPlan: 'array of 3 actionable strings',
    statHighlights: 'array of 3 concise stat strings',
    tacticalStats: {
      weakAreasCount: 'number',
      shippedProjects: 'number',
      hardProblems: 'number',
      practiceSessions: 'number',
    },
    forecast: {
      likelyReadinessIn14Days: 'number 0-100',
      bestCaseIn14Days: 'number 0-100',
      riskCaseIn14Days: 'number 0-100',
    },
  };

  return [
    'You are an interview performance analyst.',
    'Use this user performance snapshot and return strict JSON only.',
    'Avoid markdown and code fences.',
    `Required schema: ${JSON.stringify(schema)}.`,
    `Snapshot: ${JSON.stringify(snapshot)}.`,
  ].join(' ');
};

const generatePortfolioInsightsWithGemini = async (snapshot) => {
  if (!env.geminiApiKey || env.aiCoachFallbackOnly) {
    return {
      provider: 'fallback',
      model: 'heuristic-engine-v1',
      insight: buildPortfolioFallbackInsights(snapshot),
    };
  }

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => timeoutController.abort(), env.geminiTimeoutMs);

  try {
    const response = await fetch(
      `${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildPortfolioInsightsPrompt(snapshot) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
        signal: timeoutController.signal,
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw createHttpError(response.status || 502, payload?.error?.message || 'Gemini request failed');
    }

    const rawText = (payload?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || '')
      .join('\n');
    const parsed = extractJsonObject(rawText);

    if (!parsed || typeof parsed !== 'object') {
      throw createHttpError(502, 'Gemini portfolio insight response was not valid JSON');
    }

    const fallback = buildPortfolioFallbackInsights(snapshot);

    return {
      provider: 'gemini',
      model: payload?.modelVersion || env.geminiModel,
      insight: {
        ...fallback,
        ...parsed,
        statHighlights: Array.isArray(parsed.statHighlights) && parsed.statHighlights.length
          ? parsed.statHighlights.slice(0, 4)
          : fallback.statHighlights,
        tacticalStats: {
          ...fallback.tacticalStats,
          ...(parsed.tacticalStats || {}),
        },
        forecast: {
          ...fallback.forecast,
          ...(parsed.forecast || {}),
        },
      },
    };
  } catch {
    return {
      provider: 'fallback',
      model: 'heuristic-engine-v1',
      insight: buildPortfolioFallbackInsights(snapshot),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const buildSnapshot = async (userId, { publicView = false } = {}) => {
  const profile = await ensureProfileById(userId);

  const todayDateKey = toDateKey(new Date());
  const start30 = shiftDateKey(todayDateKey, -29);

  const [questHistory, dsaStats, projectMetrics, mockAnalytics, behavioralAnalytics, latestAi] = await Promise.all([
    getQuestHistory(userId, { fromDateKey: start30, toDateKey: todayDateKey }),
    getDSAStats({ userId, fromDateKey: start30, toDateKey: todayDateKey }),
    getProjectMetrics(userId),
    getTrendAnalytics(userId, 90),
    getBehavioralAnalytics(userId),
    getLatestCoachInsight(userId, {}),
  ]);

  const questTrend = buildQuestTrend(questHistory);

  const publicAi = latestAi
    ? {
      generatedAt: latestAi.createdAt,
      focusTheme: latestAi.insight?.focusTheme || '',
      motivation: latestAi.insight?.motivation || '',
      topSuggestions: Array.isArray(latestAi.insight?.suggestions)
        ? latestAi.insight.suggestions.slice(0, 3).map((item) => ({
          title: item.title,
          priority: item.priority,
        }))
        : [],
    }
    : null;

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      level: profile.level,
      totalXp: profile.totalXp,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      levelProgressPercent: profile.levelProgressPercent,
    },
    graphs: {
      questTrend,
      questHoursTrend: questTrend.map((item) => ({
        dateKey: item.dateKey,
        hoursLogged: item.hoursLogged,
      })),
      questCompletionTrend: questTrend.map((item) => ({
        dateKey: item.dateKey,
        completed: item.completed ? 1 : 0,
      })),
      mockScoreTrend: mockAnalytics?.scoreTrend || [],
      mockRollingTrend: mockAnalytics?.rollingTrend || [],
      dsaDifficultyBreakdown: [
        { label: 'Easy', value: dsaStats.easyCount || 0 },
        { label: 'Medium', value: dsaStats.mediumCount || 0 },
        { label: 'Hard', value: dsaStats.hardCount || 0 },
      ],
      mockSectionAverages: Object.entries(mockAnalytics?.sectionAverages || {}).map(([section, score]) => ({
        section,
        score: Number(score) || 0,
      })),
    },
    dsa: {
      totalProblems: dsaStats.totalProblems,
      hardCount: dsaStats.hardCount,
      mediumCount: dsaStats.mediumCount,
      easyCount: dsaStats.easyCount,
      totalXpFromDSA: dsaStats.totalXpFromDSA,
    },
    projects: {
      totalProjects: projectMetrics.totalProjects,
      shipped: projectMetrics.throughputShipped,
      averageImpactScore: projectMetrics.averageImpactScore,
      highImpactProjects: projectMetrics.highImpactProjects,
    },
    mocks: {
      totalMocks: mockAnalytics.totalMocks,
      bestScore: mockAnalytics.summary?.bestScore || 0,
      latestScore: mockAnalytics.summary?.latestScore || 0,
      averageScore: mockAnalytics.summary?.averageScore || 0,
      confidenceDelta: mockAnalytics.summary?.confidenceDelta || 0,
      topWeaknesses: (mockAnalytics.weaknessDistribution || []).slice(0, 5),
    },
    behavioral: {
      totalStories: behavioralAnalytics.totals?.totalStories || 0,
      totalPracticeSessions: behavioralAnalytics.totals?.totalPracticeSessions || 0,
      averageConfidence: behavioralAnalytics.totals?.averageConfidence || 0,
      missingCoreCompetencies: behavioralAnalytics.missingCoreCompetencies || [],
    },
    summary: {
      readinessRadar: buildReadinessRadar({
        profile,
        dsa: {
          totalProblems: dsaStats.totalProblems,
        },
        projects: {
          averageImpactScore: projectMetrics.averageImpactScore,
        },
        mocks: {
          averageScore: mockAnalytics.summary?.averageScore || 0,
        },
        behavioral: {
          averageConfidence: behavioralAnalytics.totals?.averageConfidence || 0,
        },
      }),
    },
    ai: publicView ? publicAi : latestAi,
  };
};

const getPortfolioMe = async (userId) => {
  const settings = await ensurePortfolioProfile(userId);
  const snapshot = await buildSnapshot(userId, { publicView: false });

  return {
    settings: settings.toObject(),
    snapshot,
  };
};

const updatePortfolioSettings = async (userId, payload = {}) => {
  const settings = await ensurePortfolioProfile(userId);

  if (payload.publicEnabled !== undefined) {
    settings.publicEnabled = Boolean(payload.publicEnabled);
    settings.lastPublishedAt = settings.publicEnabled ? new Date() : settings.lastPublishedAt;
  }

  if (payload.themePreference !== undefined) {
    if (!PORTFOLIO_THEME_ORDER.includes(payload.themePreference)) {
      throw createHttpError(400, 'Invalid theme preference value');
    }

    settings.themePreference = payload.themePreference;
  }

  if (payload.headline !== undefined) {
    settings.headline = String(payload.headline || '').trim().slice(0, 180);
  }

  if (payload.summary !== undefined) {
    settings.summary = String(payload.summary || '').trim().slice(0, 900);
  }

  if (payload.accentColor !== undefined) {
    const value = String(payload.accentColor || '').trim();
    settings.accentColor = /^#?[0-9a-f]{6}$/i.test(value)
      ? `#${value.replace('#', '').toLowerCase()}`
      : '#00bcd4';
  }

  if (payload.slug !== undefined) {
    const requested = slugify(payload.slug);
    if (!PORTFOLIO_SLUG_PATTERN.test(requested)) {
      throw createHttpError(400, 'Slug must use lowercase letters, numbers, and hyphens only');
    }

    settings.slug = await ensureUniqueSlug(requested, userId);
  }

  if (payload.sections && typeof payload.sections === 'object') {
    settings.sections = {
      ...settings.sections,
      showDSA: payload.sections.showDSA !== undefined ? Boolean(payload.sections.showDSA) : settings.sections.showDSA,
      showProjects:
        payload.sections.showProjects !== undefined
          ? Boolean(payload.sections.showProjects)
          : settings.sections.showProjects,
      showMocks:
        payload.sections.showMocks !== undefined ? Boolean(payload.sections.showMocks) : settings.sections.showMocks,
      showBehavioral:
        payload.sections.showBehavioral !== undefined
          ? Boolean(payload.sections.showBehavioral)
          : settings.sections.showBehavioral,
      showAI: payload.sections.showAI !== undefined ? Boolean(payload.sections.showAI) : settings.sections.showAI,
    };
  }

  if (payload.contactLinks && typeof payload.contactLinks === 'object') {
    settings.contactLinks = {
      ...settings.contactLinks,
      github:
        payload.contactLinks.github !== undefined
          ? normalizeUrl(payload.contactLinks.github)
          : settings.contactLinks.github,
      linkedin:
        payload.contactLinks.linkedin !== undefined
          ? normalizeUrl(payload.contactLinks.linkedin)
          : settings.contactLinks.linkedin,
      website:
        payload.contactLinks.website !== undefined
          ? normalizeUrl(payload.contactLinks.website)
          : settings.contactLinks.website,
    };
  }

  await settings.save();

  return settings.toObject();
};

const buildPublicPayload = async (settings) => {
  const user = await UserProfile.findById(settings.userId)
    .select('username displayName level totalXp currentStreak longestStreak levelProgressPercent')
    .lean();

  if (!user || user.isActive === false) {
    throw createHttpError(404, 'Public portfolio not found');
  }

  const snapshot = await buildSnapshot(settings.userId, { publicView: true });

  return {
    public: {
      slug: settings.slug,
      headline: settings.headline,
      summary: settings.summary,
      themePreference: settings.themePreference,
      accentColor: settings.accentColor,
      sections: settings.sections,
      contactLinks: settings.contactLinks,
      totalPublicViews: settings.totalPublicViews,
      lastPublishedAt: settings.lastPublishedAt,
    },
    profile: {
      username: user.username,
      displayName: user.displayName,
      level: user.level,
      totalXp: user.totalXp,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      levelProgressPercent: user.levelProgressPercent,
    },
    snapshot,
  };
};

const getPortfolioPublicBySlug = async (slug) => {
  const normalizedSlug = slugify(slug);
  if (!PORTFOLIO_SLUG_PATTERN.test(normalizedSlug)) {
    throw createHttpError(400, 'Invalid public portfolio slug');
  }

  const settings = await PortfolioProfile.findOne({
    slug: normalizedSlug,
    publicEnabled: true,
  });

  if (!settings) {
    throw createHttpError(404, 'Public portfolio not found');
  }

  settings.totalPublicViews = (toSafeNumber(settings.totalPublicViews, 0) + 1);
  await settings.save();

  return buildPublicPayload(settings);
};

const getPortfolioExportData = async (userId) => {
  const settings = await ensurePortfolioProfile(userId);
  const snapshot = await buildSnapshot(userId, { publicView: false });

  const performanceScore = clamp(
    Math.round(
      ((snapshot.dsa.totalProblems / 30) * 30)
      + ((snapshot.projects.averageImpactScore / 100) * 30)
      + ((snapshot.mocks.averageScore / 100) * 20)
      + ((snapshot.behavioral.averageConfidence / 10) * 20),
    ),
    0,
    100,
  );

  return {
    exportedAt: new Date().toISOString(),
    settings: settings.toObject(),
    snapshot,
    summary: {
      performanceScore,
      readinessRadar: buildReadinessRadar(snapshot),
      activityTotals: {
        totalQuestXp: (snapshot.graphs.questTrend || []).reduce((sum, row) => sum + (row.xpEarned || 0), 0),
        totalHoursLogged: (snapshot.graphs.questTrend || []).reduce((sum, row) => sum + (row.hoursLogged || 0), 0),
        totalMockAttempts: snapshot.mocks.totalMocks,
      },
      badges: [
        snapshot.profile.currentStreak >= 7 ? 'Consistency Builder' : null,
        snapshot.projects.shipped >= 1 ? 'Shipper' : null,
        snapshot.dsa.hardCount >= 5 ? 'Hard Problem Grinder' : null,
      ].filter(Boolean),
    },
    aiPortfolioInsights: await generatePortfolioInsightsWithGemini(snapshot),
  };
};

module.exports = {
  getPortfolioExportData,
  getPortfolioMe,
  getPortfolioPublicBySlug,
  updatePortfolioSettings,
};