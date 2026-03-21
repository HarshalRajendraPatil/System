const MockInterview = require('../models/MockInterview');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById, syncDailyQuestFromDomainActivity } = require('./rpgService');
const { shiftDateKey, toDateKey } = require('../utils/date');
const {
  INTERVIEWER_TYPE,
  INTERVIEWER_TYPE_ORDER,
  MOCK_FORMAT,
  MOCK_FORMAT_ORDER,
  MOCK_SECTION_KEYS,
} = require('../constants/mocks');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeStringArray = (value, { lowercase = false } = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const result = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => (lowercase ? item.toLowerCase() : item));

  return [...new Set(result)];
};

const normalizeSectionScores = (scores = {}) =>
  MOCK_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = clamp(toSafeNumber(scores[key], 0), 0, 100);
    return acc;
  }, {});

const normalizeMockPayload = (payload = {}) => {
  const format = MOCK_FORMAT_ORDER.includes(payload.format) ? payload.format : MOCK_FORMAT.MIXED;
  const interviewerType = INTERVIEWER_TYPE_ORDER.includes(payload.interviewerType)
    ? payload.interviewerType
    : INTERVIEWER_TYPE.SELF;

  const dateKey = payload.dateKey ? toDateKey(payload.dateKey) : toDateKey(new Date());

  return {
    title: String(payload.title || '').trim(),
    dateKey,
    format,
    interviewerType,
    overallScore: clamp(toSafeNumber(payload.overallScore, 0), 0, 100),
    sectionScores: normalizeSectionScores(payload.sectionScores || {}),
    confidenceBefore: clamp(toSafeNumber(payload.confidenceBefore, 0), 0, 10),
    confidenceAfter: clamp(toSafeNumber(payload.confidenceAfter, 0), 0, 10),
    durationMinutes: clamp(toSafeNumber(payload.durationMinutes, 0), 0, 600),
    strengths: sanitizeStringArray(payload.strengths),
    weaknesses: sanitizeStringArray(payload.weaknesses, { lowercase: true }),
    actionItems: sanitizeStringArray(payload.actionItems),
    notes: String(payload.notes || '').trim(),
  };
};

const validateMockPayload = (mock) => {
  const errors = [];

  if (!mock.title || mock.title.length < 3) {
    errors.push('Mock title must be at least 3 characters long');
  }

  if (mock.notes && mock.notes.length > 4000) {
    errors.push('Notes must not exceed 4000 characters');
  }

  if (!MOCK_FORMAT_ORDER.includes(mock.format)) {
    errors.push('Invalid mock format');
  }

  if (!INTERVIEWER_TYPE_ORDER.includes(mock.interviewerType)) {
    errors.push('Invalid interviewer type');
  }

  return errors;
};

const ensureMockOwnership = async (userId, mockId) => {
  const entry = await MockInterview.findOne({ _id: mockId, userId });

  if (!entry) {
    throw createHttpError(404, 'Mock record not found or access denied');
  }

  return entry;
};

const createMockLog = async (userId, payload = {}) => {
  await ensureProfileById(userId);

  const normalized = normalizeMockPayload(payload);
  const validationErrors = validateMockPayload(normalized);

  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  const created = await MockInterview.create({
    userId,
    ...normalized,
  });

  await syncDailyQuestFromDomainActivity(userId, {
    field: 'mockInterview',
  });

  return created.toObject();
};

const getMockLogs = async (userId, filters = {}) => {
  await ensureProfileById(userId);

  const query = { userId };

  if (filters.fromDateKey || filters.toDateKey) {
    query.dateKey = {};

    if (filters.fromDateKey) {
      query.dateKey.$gte = toDateKey(filters.fromDateKey);
    }

    if (filters.toDateKey) {
      query.dateKey.$lte = toDateKey(filters.toDateKey);
    }
  }

  if (filters.format && MOCK_FORMAT_ORDER.includes(filters.format)) {
    query.format = filters.format;
  }

  if (filters.interviewerType && INTERVIEWER_TYPE_ORDER.includes(filters.interviewerType)) {
    query.interviewerType = filters.interviewerType;
  }

  if (filters.weakness) {
    query.weaknesses = { $in: [String(filters.weakness).trim().toLowerCase()] };
  }

  if (filters.search && String(filters.search).trim()) {
    query.$text = {
      $search: String(filters.search).trim(),
    };
  }

  const minScore = toSafeNumber(filters.minScore, NaN);
  const maxScore = toSafeNumber(filters.maxScore, NaN);
  if (!Number.isNaN(minScore) || !Number.isNaN(maxScore)) {
    query.overallScore = {};
    if (!Number.isNaN(minScore)) {
      query.overallScore.$gte = clamp(minScore, 0, 100);
    }

    if (!Number.isNaN(maxScore)) {
      query.overallScore.$lte = clamp(maxScore, 0, 100);
    }
  }

  const limit = clamp(toSafeNumber(filters.limit, 150), 1, 500);

  const entries = await MockInterview.find(query)
    .sort({ dateKey: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return entries;
};

const updateMockLog = async (userId, mockId, payload = {}) => {
  await ensureProfileById(userId);

  const existing = await ensureMockOwnership(userId, mockId);

  const normalized = normalizeMockPayload({
    ...existing.toObject(),
    ...payload,
    sectionScores: {
      ...(existing.sectionScores || {}),
      ...(payload.sectionScores || {}),
    },
  });

  const validationErrors = validateMockPayload(normalized);
  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  existing.title = normalized.title;
  existing.dateKey = normalized.dateKey;
  existing.format = normalized.format;
  existing.interviewerType = normalized.interviewerType;
  existing.overallScore = normalized.overallScore;
  existing.sectionScores = normalized.sectionScores;
  existing.confidenceBefore = normalized.confidenceBefore;
  existing.confidenceAfter = normalized.confidenceAfter;
  existing.durationMinutes = normalized.durationMinutes;
  existing.strengths = normalized.strengths;
  existing.weaknesses = normalized.weaknesses;
  existing.actionItems = normalized.actionItems;
  existing.notes = normalized.notes;

  const updated = await existing.save();

  await syncDailyQuestFromDomainActivity(userId, {
    field: 'mockInterview',
  });

  return updated.toObject();
};

const deleteMockLog = async (userId, mockId) => {
  await ensureProfileById(userId);

  const deleted = await MockInterview.findOneAndDelete({ _id: mockId, userId });
  if (!deleted) {
    throw createHttpError(404, 'Mock record not found or access denied');
  }

  return {
    deletedId: deleted._id,
  };
};

const parseMonthInput = (value) => {
  const raw = String(value || '').trim();

  if (!raw) {
    const today = new Date();
    return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  if (!/^\d{4}-\d{2}$/.test(raw)) {
    throw createHttpError(400, 'Month must be in YYYY-MM format');
  }

  return raw;
};

const getCalendarData = async (userId, monthInput) => {
  await ensureProfileById(userId);

  const month = parseMonthInput(monthInput);
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  const startDateKey = toDateKey(monthStart);
  const endDateKey = toDateKey(monthEnd);

  const entries = await MockInterview.find({
    userId,
    dateKey: {
      $gte: startDateKey,
      $lte: endDateKey,
    },
  })
    .sort({ dateKey: 1, createdAt: 1 })
    .lean();

  const dayMap = new Map();

  entries.forEach((entry) => {
    if (!dayMap.has(entry.dateKey)) {
      dayMap.set(entry.dateKey, {
        dateKey: entry.dateKey,
        count: 0,
        scoreTotal: 0,
        bestScore: -1,
        worstScore: 101,
        weaknesses: new Set(),
        entries: [],
      });
    }

    const bucket = dayMap.get(entry.dateKey);
    bucket.count += 1;
    bucket.scoreTotal += Number(entry.overallScore) || 0;
    bucket.bestScore = Math.max(bucket.bestScore, Number(entry.overallScore) || 0);
    bucket.worstScore = Math.min(bucket.worstScore, Number(entry.overallScore) || 0);

    (entry.weaknesses || []).forEach((weakness) => bucket.weaknesses.add(weakness));

    bucket.entries.push({
      id: entry._id,
      title: entry.title,
      score: entry.overallScore,
      format: entry.format,
      interviewerType: entry.interviewerType,
      weaknesses: entry.weaknesses || [],
    });
  });

  const days = [...dayMap.values()].map((bucket) => ({
    dateKey: bucket.dateKey,
    count: bucket.count,
    avgScore: Number((bucket.scoreTotal / bucket.count).toFixed(2)),
    bestScore: bucket.bestScore,
    worstScore: bucket.worstScore,
    weaknesses: [...bucket.weaknesses],
    entries: bucket.entries,
  }));

  return {
    month,
    startDateKey,
    endDateKey,
    totalMocks: entries.length,
    days,
  };
};

const averageSectionScores = (entries) => {
  const scoreBuckets = MOCK_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  entries.forEach((entry) => {
    MOCK_SECTION_KEYS.forEach((key) => {
      scoreBuckets[key] += Number(entry.sectionScores?.[key]) || 0;
    });
  });

  return MOCK_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = entries.length ? Number((scoreBuckets[key] / entries.length).toFixed(2)) : 0;
    return acc;
  }, {});
};

const buildTrendSeries = (entries) => {
  const grouped = new Map();

  entries.forEach((entry) => {
    if (!grouped.has(entry.dateKey)) {
      grouped.set(entry.dateKey, {
        dateKey: entry.dateKey,
        total: 0,
        count: 0,
      });
    }

    const bucket = grouped.get(entry.dateKey);
    bucket.total += Number(entry.overallScore) || 0;
    bucket.count += 1;
  });

  return [...grouped.values()].map((bucket) => ({
    dateKey: bucket.dateKey,
    avgScore: Number((bucket.total / bucket.count).toFixed(2)),
    attempts: bucket.count,
  }));
};

const buildRollingAverages = (entries, windowSize = 5) =>
  entries.map((entry, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = entries.slice(start, index + 1);
    const average = window.reduce((sum, item) => sum + (Number(item.overallScore) || 0), 0) / window.length;

    return {
      dateKey: entry.dateKey,
      rollingScore: Number(average.toFixed(2)),
    };
  });

const buildWeaknessDistribution = (entries) => {
  const frequency = new Map();

  entries.forEach((entry) => {
    (entry.weaknesses || []).forEach((weakness) => {
      const key = String(weakness).trim().toLowerCase();
      frequency.set(key, (frequency.get(key) || 0) + 1);
    });
  });

  return [...frequency.entries()]
    .map(([weakness, count]) => ({ weakness, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
};

const getTrendAnalytics = async (userId, rangeDaysInput) => {
  await ensureProfileById(userId);

  const rangeDays = clamp(toSafeNumber(rangeDaysInput, 90), 7, 365);
  const todayDateKey = toDateKey(new Date());
  const fromDateKey = shiftDateKey(todayDateKey, -rangeDays + 1);

  const entries = await MockInterview.find({
    userId,
    dateKey: {
      $gte: fromDateKey,
      $lte: todayDateKey,
    },
  })
    .sort({ dateKey: 1, createdAt: 1 })
    .lean();

  if (!entries.length) {
    return {
      rangeDays,
      fromDateKey,
      toDateKey: todayDateKey,
      totalMocks: 0,
      scoreTrend: [],
      rollingTrend: [],
      weaknessDistribution: [],
      sectionAverages: averageSectionScores([]),
      summary: {
        bestScore: 0,
        latestScore: 0,
        scoreDelta: 0,
        averageScore: 0,
        confidenceDelta: 0,
      },
    };
  }

  const scoreTrend = buildTrendSeries(entries);
  const rollingTrend = buildRollingAverages(entries, 5);
  const weaknessDistribution = buildWeaknessDistribution(entries);
  const sectionAverages = averageSectionScores(entries);

  const firstScore = Number(entries[0].overallScore) || 0;
  const latestScore = Number(entries[entries.length - 1].overallScore) || 0;
  const bestScore = entries.reduce((max, entry) => Math.max(max, Number(entry.overallScore) || 0), 0);
  const averageScore = Number(
    (
      entries.reduce((sum, entry) => sum + (Number(entry.overallScore) || 0), 0)
      / entries.length
    ).toFixed(2),
  );
  const averageConfidenceBefore = Number(
    (
      entries.reduce((sum, entry) => sum + (Number(entry.confidenceBefore) || 0), 0)
      / entries.length
    ).toFixed(2),
  );
  const averageConfidenceAfter = Number(
    (
      entries.reduce((sum, entry) => sum + (Number(entry.confidenceAfter) || 0), 0)
      / entries.length
    ).toFixed(2),
  );

  return {
    rangeDays,
    fromDateKey,
    toDateKey: todayDateKey,
    totalMocks: entries.length,
    scoreTrend,
    rollingTrend,
    weaknessDistribution,
    sectionAverages,
    summary: {
      bestScore,
      latestScore,
      scoreDelta: Number((latestScore - firstScore).toFixed(2)),
      averageScore,
      confidenceDelta: Number((averageConfidenceAfter - averageConfidenceBefore).toFixed(2)),
    },
  };
};

module.exports = {
  createMockLog,
  deleteMockLog,
  getCalendarData,
  getMockLogs,
  getTrendAnalytics,
  updateMockLog,
};
