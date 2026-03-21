const { DSA_DIFFICULTY, DSA_DIFFICULTY_XP } = require('../constants/rpg');
const DSAProblem = require('../models/DSAProblem');
const { toDateKey } = require('../utils/date');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById, recalculateProfileProgress, getLeaderboard } = require('./rpgService');

const calculateDSAXp = (difficulty) => DSA_DIFFICULTY_XP[difficulty] || 0;

const normalizeDSAProblemPayload = (payload = {}) => {
  const dateKey = payload.dateCompletedKey ? toDateKey(payload.dateCompletedKey) : toDateKey(new Date());

  return {
    title: String(payload.title || '').trim(),
    difficulty: Object.values(DSA_DIFFICULTY).includes(payload.difficulty)
      ? payload.difficulty
      : DSA_DIFFICULTY.EASY,
    platform: ['LeetCode', 'Codeforces', 'HackerRank', 'InterviewBit', 'GeeksforGeeks', 'Other'].includes(
      payload.platform,
    )
      ? payload.platform
      : 'LeetCode',
    link: String(payload.link || '').trim(),
    dateCompletedKey: dateKey,
    notes: String(payload.notes || '').trim(),
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0)
      : [],
  };
};

const validateDSAProblem = (problem) => {
  const errors = [];

  if (!problem.title || problem.title.length === 0) {
    errors.push('Problem title is required');
  }

  if (problem.title && problem.title.length > 200) {
    errors.push('Problem title must not exceed 200 characters');
  }

  if (!Object.values(DSA_DIFFICULTY).includes(problem.difficulty)) {
    errors.push('Invalid difficulty level');
  }

  if (problem.link && !/^https?:\/\/.+/.test(problem.link)) {
    errors.push('Problem link must be a valid URL');
  }

  return errors;
};

const createDSAProblem = async (payload) => {
  const { userId } = payload;
  const profile = await ensureProfileById(userId);
  const normalized = normalizeDSAProblemPayload(payload);
  const errors = validateDSAProblem(normalized);

  if (errors.length > 0) {
    throw createHttpError(400, `Validation failed: ${errors.join(', ')}`);
  }

  const xpEarned = calculateDSAXp(normalized.difficulty);

  const problem = await DSAProblem.create({
    userId: profile._id,
    ...normalized,
    xpEarned,
  });

  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();

  return {
    problem: problem.toObject(),
    profile: refreshedProfile,
    level: levelInfo,
    leaderboard,
  };
};

const getDSAProblems = async (filters = {}) => {
  const profile = await ensureProfileById(filters.userId);

  const query = { userId: profile._id };

  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }

  if (filters.platform) {
    query.platform = filters.platform;
  }

  if (filters.fromDateKey || filters.toDateKey) {
    query.dateCompletedKey = {};

    if (filters.fromDateKey) {
      query.dateCompletedKey.$gte = toDateKey(filters.fromDateKey);
    }

    if (filters.toDateKey) {
      query.dateCompletedKey.$lte = toDateKey(filters.toDateKey);
    }
  }

  if (filters.tag) {
    query.tags = { $in: [filters.tag] };
  }

  const problems = await DSAProblem.find(query)
    .sort({ dateCompletedKey: -1, createdAt: -1 })
    .limit(300)
    .lean();

  return problems;
};

const getDSAStats = async (filters = {}) => {
  const profile = await ensureProfileById(filters.userId);

  const query = { userId: profile._id };

  if (filters.fromDateKey || filters.toDateKey) {
    query.dateCompletedKey = {};

    if (filters.fromDateKey) {
      query.dateCompletedKey.$gte = toDateKey(filters.fromDateKey);
    }

    if (filters.toDateKey) {
      query.dateCompletedKey.$lte = toDateKey(filters.toDateKey);
    }
  }

  const problems = await DSAProblem.find(query).lean();

  const stats = {
    totalProblems: problems.length,
    easyCount: problems.filter((p) => p.difficulty === DSA_DIFFICULTY.EASY).length,
    mediumCount: problems.filter((p) => p.difficulty === DSA_DIFFICULTY.MEDIUM).length,
    hardCount: problems.filter((p) => p.difficulty === DSA_DIFFICULTY.HARD).length,
    totalXpFromDSA: problems.reduce((sum, p) => sum + (Number(p.xpEarned) || 0), 0),
    easyXp: problems
      .filter((p) => p.difficulty === DSA_DIFFICULTY.EASY)
      .reduce((sum, p) => sum + (Number(p.xpEarned) || 0), 0),
    mediumXp: problems
      .filter((p) => p.difficulty === DSA_DIFFICULTY.MEDIUM)
      .reduce((sum, p) => sum + (Number(p.xpEarned) || 0), 0),
    hardXp: problems
      .filter((p) => p.difficulty === DSA_DIFFICULTY.HARD)
      .reduce((sum, p) => sum + (Number(p.xpEarned) || 0), 0),
    platformBreakdown: {},
  };

  problems.forEach((problem) => {
    if (!stats.platformBreakdown[problem.platform]) {
      stats.platformBreakdown[problem.platform] = 0;
    }

    stats.platformBreakdown[problem.platform] += 1;
  });

  return stats;
};

const deleteDSAProblem = async (userId, problemId) => {
  const profile = await ensureProfileById(userId);

  const problem = await DSAProblem.findOne({ _id: problemId, userId: profile._id });

  if (!problem) {
    throw createHttpError(404, 'Problem not found or access denied');
  }

  const xpToRemove = Number(problem.xpEarned) || 0;

  await DSAProblem.deleteOne({ _id: problemId });

  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();

  return {
    removedXp: xpToRemove,
    profile: refreshedProfile,
    level: levelInfo,
    leaderboard,
  };
};

const updateDSAProblem = async (userId, problemId, payload) => {
  const profile = await ensureProfileById(userId);

  const existing = await DSAProblem.findOne({ _id: problemId, userId: profile._id });

  if (!existing) {
    throw createHttpError(404, 'Problem not found or access denied');
  }

  const normalized = normalizeDSAProblemPayload(payload);
  const errors = validateDSAProblem(normalized);

  if (errors.length > 0) {
    throw createHttpError(400, `Validation failed: ${errors.join(', ')}`);
  }

  const xpEarned = calculateDSAXp(normalized.difficulty);

  const updated = await DSAProblem.findByIdAndUpdate(
    problemId,
    {
      $set: {
        ...normalized,
        xpEarned,
      },
    },
    { new: true },
  ).lean();

  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();

  return {
    problem: updated,
    profile: refreshedProfile,
    level: levelInfo,
    leaderboard,
  };
};

module.exports = {
  createDSAProblem,
  deleteDSAProblem,
  getDSAProblems,
  getDSAStats,
  updateDSAProblem,
};
