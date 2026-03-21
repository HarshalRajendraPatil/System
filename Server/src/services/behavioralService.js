const mongoose = require('mongoose');
const BehavioralStory = require('../models/BehavioralStory');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById } = require('./rpgService');
const { toDateKey, shiftDateKey } = require('../utils/date');
const {
  CORE_COMPETENCIES,
  PRACTICE_MODE,
  PRACTICE_MODE_ORDER,
  STORY_DIFFICULTY,
  STORY_DIFFICULTY_ORDER,
  STORY_OUTCOME,
  STORY_OUTCOME_ORDER,
} = require('../constants/behavioral');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeList = (value, { lowercase = true } = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => (lowercase ? item.toLowerCase() : item));

  return [...new Set(cleaned)];
};

const normalizeStoryPayload = (payload = {}) => {
  const storyPayload = payload.story || {};

  return {
    title: String(payload.title || '').trim(),
    questionPrompt: String(payload.questionPrompt || '').trim(),
    companyContext: String(payload.companyContext || '').trim(),
    roleContext: String(payload.roleContext || '').trim(),
    story: {
      situation: String(storyPayload.situation || '').trim(),
      task: String(storyPayload.task || '').trim(),
      action: String(storyPayload.action || '').trim(),
      result: String(storyPayload.result || '').trim(),
    },
    competencies: sanitizeList(payload.competencies),
    tags: sanitizeList(payload.tags),
    quantifiedImpact: String(payload.quantifiedImpact || '').trim(),
    reflectionNotes: String(payload.reflectionNotes || '').trim(),
    difficulty: STORY_DIFFICULTY_ORDER.includes(payload.difficulty)
      ? payload.difficulty
      : STORY_DIFFICULTY.MEDIUM,
    outcome: STORY_OUTCOME_ORDER.includes(payload.outcome)
      ? payload.outcome
      : STORY_OUTCOME.LEARNING,
    confidenceScore: clamp(toSafeNumber(payload.confidenceScore, 0), 0, 10),
    isFavorite: Boolean(payload.isFavorite),
  };
};

const validateStoryPayload = (payload) => {
  const errors = [];

  if (!payload.title || payload.title.length < 3) {
    errors.push('Story title must be at least 3 characters long');
  }

  if (!payload.questionPrompt || payload.questionPrompt.length < 6) {
    errors.push('Question prompt must be at least 6 characters long');
  }

  if (!payload.story.situation || payload.story.situation.length < 10) {
    errors.push('Situation should have meaningful context (minimum 10 characters)');
  }

  if (!payload.story.task || payload.story.task.length < 6) {
    errors.push('Task should be at least 6 characters long');
  }

  if (!payload.story.action || payload.story.action.length < 10) {
    errors.push('Action should be at least 10 characters long');
  }

  if (!payload.story.result || payload.story.result.length < 8) {
    errors.push('Result should be at least 8 characters long');
  }

  if (!STORY_DIFFICULTY_ORDER.includes(payload.difficulty)) {
    errors.push('Invalid difficulty value');
  }

  if (!STORY_OUTCOME_ORDER.includes(payload.outcome)) {
    errors.push('Invalid outcome value');
  }

  return errors;
};

const ensureStoryOwnership = async (userId, storyId) => {
  const story = await BehavioralStory.findOne({ _id: storyId, userId });
  if (!story) {
    throw createHttpError(404, 'Behavioral story not found or access denied');
  }

  return story;
};

const createStory = async (userId, payload = {}) => {
  await ensureProfileById(userId);

  const normalized = normalizeStoryPayload(payload);
  const validationErrors = validateStoryPayload(normalized);

  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  const created = await BehavioralStory.create({
    userId,
    ...normalized,
  });

  return created.toObject();
};

const getStories = async (userId, filters = {}) => {
  await ensureProfileById(userId);

  const query = { userId };

  if (filters.search && String(filters.search).trim()) {
    query.$text = {
      $search: String(filters.search).trim(),
    };
  }

  if (filters.competency && String(filters.competency).trim()) {
    query.competencies = { $in: [String(filters.competency).trim().toLowerCase()] };
  }

  if (filters.tag && String(filters.tag).trim()) {
    query.tags = { $in: [String(filters.tag).trim().toLowerCase()] };
  }

  if (filters.difficulty && STORY_DIFFICULTY_ORDER.includes(filters.difficulty)) {
    query.difficulty = filters.difficulty;
  }

  if (filters.outcome && STORY_OUTCOME_ORDER.includes(filters.outcome)) {
    query.outcome = filters.outcome;
  }

  if (String(filters.favorite || '').trim() === 'true') {
    query.isFavorite = true;
  }

  const minConfidence = toSafeNumber(filters.minConfidence, NaN);
  const maxConfidence = toSafeNumber(filters.maxConfidence, NaN);
  if (!Number.isNaN(minConfidence) || !Number.isNaN(maxConfidence)) {
    query.confidenceScore = {};
    if (!Number.isNaN(minConfidence)) {
      query.confidenceScore.$gte = clamp(minConfidence, 0, 10);
    }
    if (!Number.isNaN(maxConfidence)) {
      query.confidenceScore.$lte = clamp(maxConfidence, 0, 10);
    }
  }

  const limit = clamp(toSafeNumber(filters.limit, 200), 1, 500);
  const sortBy = String(filters.sortBy || 'updated_desc').trim();

  let sort = { updatedAt: -1 };
  if (sortBy === 'practice_least') {
    sort = { practiceCount: 1, lastPracticedAt: 1, updatedAt: -1 };
  } else if (sortBy === 'practice_most') {
    sort = { practiceCount: -1, lastPracticedAt: -1, updatedAt: -1 };
  } else if (sortBy === 'confidence_desc') {
    sort = { confidenceScore: -1, updatedAt: -1 };
  } else if (sortBy === 'confidence_asc') {
    sort = { confidenceScore: 1, updatedAt: -1 };
  }

  const stories = await BehavioralStory.find(query)
    .sort(sort)
    .limit(limit)
    .lean();

  return stories;
};

const getStoryById = async (userId, storyId) => {
  await ensureProfileById(userId);
  const story = await ensureStoryOwnership(userId, storyId);
  return story.toObject();
};

const updateStory = async (userId, storyId, payload = {}) => {
  await ensureProfileById(userId);

  const story = await ensureStoryOwnership(userId, storyId);
  const normalized = normalizeStoryPayload({
    ...story.toObject(),
    ...payload,
    story: {
      ...(story.story || {}),
      ...((payload && payload.story) || {}),
    },
  });

  const validationErrors = validateStoryPayload(normalized);
  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  story.title = normalized.title;
  story.questionPrompt = normalized.questionPrompt;
  story.companyContext = normalized.companyContext;
  story.roleContext = normalized.roleContext;
  story.story = normalized.story;
  story.competencies = normalized.competencies;
  story.tags = normalized.tags;
  story.quantifiedImpact = normalized.quantifiedImpact;
  story.reflectionNotes = normalized.reflectionNotes;
  story.difficulty = normalized.difficulty;
  story.outcome = normalized.outcome;
  story.confidenceScore = normalized.confidenceScore;
  story.isFavorite = normalized.isFavorite;

  const updated = await story.save();
  return updated.toObject();
};

const deleteStory = async (userId, storyId) => {
  await ensureProfileById(userId);

  const deleted = await BehavioralStory.findOneAndDelete({ _id: storyId, userId });
  if (!deleted) {
    throw createHttpError(404, 'Behavioral story not found or access denied');
  }

  return {
    deletedId: deleted._id,
  };
};

const logPracticeSession = async (userId, storyId, payload = {}) => {
  await ensureProfileById(userId);

  const story = await ensureStoryOwnership(userId, storyId);

  const mode = PRACTICE_MODE_ORDER.includes(payload.mode) ? payload.mode : PRACTICE_MODE.REVIEW;
  const selfScore = clamp(toSafeNumber(payload.selfScore, 0), 0, 10);
  const feedback = String(payload.feedback || '').trim();

  story.practiceLogs.push({
    practicedAt: new Date(),
    mode,
    selfScore,
    feedback,
  });

  if (story.practiceLogs.length > 60) {
    story.practiceLogs = story.practiceLogs.slice(story.practiceLogs.length - 60);
  }

  story.practiceCount = (story.practiceCount || 0) + 1;
  story.lastPracticedAt = new Date();

  if (payload.updateConfidence === true) {
    story.confidenceScore = selfScore;
  }

  const updated = await story.save();

  return {
    story: updated.toObject(),
    latestPractice: updated.practiceLogs[updated.practiceLogs.length - 1],
  };
};

const parseExcludeIds = (value) => {
  if (!value) {
    return [];
  }

  const objectIds = [];

  if (Array.isArray(value)) {
    value.forEach((id) => {
      const candidate = String(id).trim();
      if (mongoose.Types.ObjectId.isValid(candidate)) {
        objectIds.push(new mongoose.Types.ObjectId(candidate));
      }
    });

    return objectIds;
  }

  String(value)
    .split(',')
    .map((id) => id.trim())
    .forEach((candidate) => {
      if (mongoose.Types.ObjectId.isValid(candidate)) {
        objectIds.push(new mongoose.Types.ObjectId(candidate));
      }
    });

  return objectIds;
};

const getRandomPracticeStory = async (userId, options = {}) => {
  await ensureProfileById(userId);

  const match = { userId };

  if (options.difficulty && STORY_DIFFICULTY_ORDER.includes(options.difficulty)) {
    match.difficulty = options.difficulty;
  }

  if (options.competency && String(options.competency).trim()) {
    match.competencies = { $in: [String(options.competency).trim().toLowerCase()] };
  }

  if (options.tag && String(options.tag).trim()) {
    match.tags = { $in: [String(options.tag).trim().toLowerCase()] };
  }

  const excludeIds = parseExcludeIds(options.excludeIds);
  if (excludeIds.length) {
    match._id = { $nin: excludeIds };
  }

  if (String(options.unpracticedFirst || '').trim() === 'true') {
    match.$or = [
      { practiceCount: { $exists: false } },
      { practiceCount: 0 },
      { lastPracticedAt: { $exists: false } },
      { lastPracticedAt: null },
      { lastPracticedAt: { $lt: new Date(`${shiftDateKey(toDateKey(new Date()), -14)}T00:00:00.000Z`) } },
    ];
  }

  const sampled = await BehavioralStory.aggregate([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  if (!sampled.length) {
    throw createHttpError(404, 'No behavioral stories found for random practice');
  }

  return sampled[0];
};

const getBehavioralAnalytics = async (userId) => {
  await ensureProfileById(userId);

  const stories = await BehavioralStory.find({ userId }).lean();

  const totals = {
    totalStories: stories.length,
    totalPracticeSessions: 0,
    favoriteStories: 0,
    averageConfidence: 0,
    averagePracticeScore: 0,
  };

  const difficultyBreakdown = STORY_DIFFICULTY_ORDER.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const outcomeBreakdown = STORY_OUTCOME_ORDER.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const competencyCounts = new Map();
  const tagCounts = new Map();

  let confidenceSum = 0;
  let practiceScoreSum = 0;
  let practiceScoreCount = 0;

  stories.forEach((story) => {
    difficultyBreakdown[story.difficulty] = (difficultyBreakdown[story.difficulty] || 0) + 1;
    outcomeBreakdown[story.outcome] = (outcomeBreakdown[story.outcome] || 0) + 1;

    if (story.isFavorite) {
      totals.favoriteStories += 1;
    }

    confidenceSum += Number(story.confidenceScore) || 0;

    (story.competencies || []).forEach((competency) => {
      const key = String(competency || '').toLowerCase();
      if (!key) {
        return;
      }
      competencyCounts.set(key, (competencyCounts.get(key) || 0) + 1);
    });

    (story.tags || []).forEach((tag) => {
      const key = String(tag || '').toLowerCase();
      if (!key) {
        return;
      }
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    });

    (story.practiceLogs || []).forEach((log) => {
      totals.totalPracticeSessions += 1;
      const score = Number(log.selfScore);
      if (Number.isFinite(score)) {
        practiceScoreSum += score;
        practiceScoreCount += 1;
      }
    });
  });

  totals.averageConfidence = stories.length ? Number((confidenceSum / stories.length).toFixed(2)) : 0;
  totals.averagePracticeScore = practiceScoreCount
    ? Number((practiceScoreSum / practiceScoreCount).toFixed(2))
    : 0;

  const topCompetencies = [...competencyCounts.entries()]
    .map(([competency, count]) => ({ competency, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const leastPracticed = [...stories]
    .sort((a, b) => {
      const countDelta = (a.practiceCount || 0) - (b.practiceCount || 0);
      if (countDelta !== 0) {
        return countDelta;
      }

      const aTime = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : 0;
      const bTime = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, 5)
    .map((story) => ({
      _id: story._id,
      title: story.title,
      practiceCount: story.practiceCount || 0,
      lastPracticedAt: story.lastPracticedAt || null,
      confidenceScore: story.confidenceScore || 0,
    }));

  const competencyCoverage = CORE_COMPETENCIES.map((competency) => ({
    competency,
    covered: competencyCounts.has(competency),
    count: competencyCounts.get(competency) || 0,
  }));

  const missingCoreCompetencies = competencyCoverage
    .filter((item) => !item.covered)
    .map((item) => item.competency);

  const recentCutoffKey = shiftDateKey(toDateKey(new Date()), -14);
  const recentCutoff = new Date(`${recentCutoffKey}T00:00:00.000Z`);

  const recentPracticeSessions = stories.reduce((sum, story) => {
    const count = (story.practiceLogs || []).filter((log) => new Date(log.practicedAt) >= recentCutoff).length;
    return sum + count;
  }, 0);

  return {
    totals,
    difficultyBreakdown,
    outcomeBreakdown,
    topCompetencies,
    topTags,
    leastPracticed,
    competencyCoverage,
    missingCoreCompetencies,
    recentPracticeSessions,
  };
};

module.exports = {
  createStory,
  deleteStory,
  getBehavioralAnalytics,
  getRandomPracticeStory,
  getStories,
  getStoryById,
  logPracticeSession,
  updateStory,
};
