const axios = require('axios');
const { DSA_DIFFICULTY, DSA_DIFFICULTY_XP } = require('../constants/rpg');
const DSAProblem = require('../models/DSAProblem');
const UserProfile = require('../models/UserProfile');
const { toDateKey } = require('../utils/date');
const { createHttpError } = require('../utils/httpError');
const {
  ensureProfileById,
  recalculateProfileProgress,
  getLeaderboard,
  syncDailyQuestFromDomainActivity,
} = require('./rpgService');

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';
const LEETSCAN_ENDPOINT = 'https://leetscan.vercel.app';

const calculateDSAXp = (difficulty) => DSA_DIFFICULTY_XP[difficulty] || 0;

const getDifficultyRank = (difficulty) => {
  if (difficulty === DSA_DIFFICULTY.HARD) {
    return 3;
  }

  if (difficulty === DSA_DIFFICULTY.MEDIUM) {
    return 2;
  }

  return 1;
};

const normalizeDSAProblemPayload = (payload = {}) => {
  const dateKey = payload.dateCompletedKey ? toDateKey(payload.dateCompletedKey) : toDateKey(new Date());
  const rawSourceKey = String(payload.sourceKey || '').trim();

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
    ...(rawSourceKey ? { sourceKey: rawSourceKey } : {}),
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

  if (problem.sourceKey && problem.sourceKey.length > 120) {
    errors.push('Source key must not exceed 120 characters');
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
  const questSync = await syncDailyQuestFromDomainActivity(profile._id, {
    field: 'dsa',
    dsaDifficulty: normalized.difficulty,
  });

  return {
    problem: problem.toObject(),
    profile: questSync?.profile || refreshedProfile,
    level: questSync?.level || levelInfo,
    leaderboard: questSync?.leaderboard || leaderboard,
    todayQuest: questSync?.quest || null,
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

const normalizeLeetCodeUsername = (value) => String(value || '').trim();

const assertLeetCodeUsername = (username) => {
  if (!username) {
    return;
  }

  if (!/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) {
    throw createHttpError(400, 'LeetCode username is invalid');
  }
};

const getLeetCodeSettings = async (userId) => {
  const profile = await ensureProfileById(userId);
  const username = normalizeLeetCodeUsername(profile.leetcodeUsername);

  return {
    username,
  };
};

const updateLeetCodeSettings = async (userId, payload = {}) => {
  await ensureProfileById(userId);
  const username = normalizeLeetCodeUsername(payload.username);
  assertLeetCodeUsername(username);

  const updated = await UserProfile.findByIdAndUpdate(
    userId,
    {
      $set: {
        leetcodeUsername: username,
        leetcodeProfileUrl: username ? `https://leetcode.com/${username}/` : '',
      },
    },
    { new: true },
  ).lean();

  return {
    username: String(updated?.leetcodeUsername || ''),
  };
};

const fetchLeetScanProfile = async (username) => {
  const response = await axios.get(`${LEETSCAN_ENDPOINT}/${encodeURIComponent(username)}`, {
    timeout: 30000,
    headers: {
      Accept: 'application/json',
    },
  });

  return response?.data || null;
};

const normalizeLeetScanRecentAccepted = (recentSubmissions = []) => {
  if (!Array.isArray(recentSubmissions)) {
    return [];
  }

  return recentSubmissions
    .filter((item) => {
      const statusDisplay = String(item?.statusDisplay || '').trim().toLowerCase();
      return !statusDisplay || statusDisplay === 'accepted';
    })
    .map((item) => ({
      id: String(item?.id || `${item?.titleSlug || ''}:${item?.timestamp || ''}`).trim(),
      title: String(item?.title || '').trim(),
      titleSlug: String(item?.titleSlug || '').trim(),
      timestamp: String(item?.timestamp || '').trim(),
    }))
    .filter((item) => item.id && item.title && item.titleSlug)
    .slice(0, 50);
};

const fetchLeetCodeQuestionMeta = async (titleSlug) => {
  const query = `
    query questionMeta($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  `;

  const response = await axios.post(
    LEETCODE_GRAPHQL_ENDPOINT,
    {
      query,
      variables: {
        titleSlug,
      },
    },
    {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  return response?.data?.data?.question || null;
};

const fetchLeetCodeProfileFallback = async (username) => {
  const query = `
    query userAnalyticsBundle($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        submissionCalendar
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        problemsSolved
        totalProblems
        finishTimeInSeconds
        contest {
          title
          startTime
        }
      }
    }
  `;

  const response = await axios.post(
    LEETCODE_GRAPHQL_ENDPOINT,
    {
      query,
      variables: { username },
    },
    {
      timeout: 25000,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  const data = response?.data?.data || {};
  const acStats = Array.isArray(data?.matchedUser?.submitStatsGlobal?.acSubmissionNum)
    ? data.matchedUser.submitStatsGlobal.acSubmissionNum
    : [];

  const statByDiff = Object.fromEntries(
    acStats
      .map((item) => [String(item?.difficulty || '').toLowerCase(), Number(item?.count) || 0])
      .filter(([k]) => Boolean(k)),
  );

  const contestHistory = Array.isArray(data?.userContestRankingHistory)
    ? data.userContestRankingHistory
      .filter((item) => item?.attended)
      .map((item) => ({
        attended: Boolean(item?.attended),
        rating: Number(item?.rating) || 0,
        ranking: Number(item?.ranking) || 0,
        problemsSolved: Number(item?.problemsSolved) || 0,
        totalProblems: Number(item?.totalProblems) || 0,
        finishTimeInSeconds: Number(item?.finishTimeInSeconds) || 0,
        contestTitle: String(item?.contest?.title || '').trim(),
        contestStartTime: Number(item?.contest?.startTime) || 0,
      }))
      .sort((a, b) => a.contestStartTime - b.contestStartTime)
    : [];

  return {
    username: String(data?.matchedUser?.username || username),
    totalSolved: acStats.reduce((sum, item) => sum + (Number(item?.count) || 0), 0),
    easySolved: Number(statByDiff.easy) || 0,
    mediumSolved: Number(statByDiff.medium) || 0,
    hardSolved: Number(statByDiff.hard) || 0,
    ranking: Number(data?.matchedUser?.profile?.ranking) || 0,
    reputation: Number(data?.matchedUser?.profile?.reputation) || 0,
    submissionCalendar:
      data?.matchedUser?.submissionCalendar && typeof data.matchedUser.submissionCalendar === 'string'
        ? (() => {
          try {
            return JSON.parse(data.matchedUser.submissionCalendar);
          } catch {
            return {};
          }
        })()
        : {},
    contestRanking: {
      attendedContestsCount: Number(data?.userContestRanking?.attendedContestsCount) || 0,
      rating: Number(data?.userContestRanking?.rating) || 0,
      globalRanking: Number(data?.userContestRanking?.globalRanking) || 0,
      totalParticipants: Number(data?.userContestRanking?.totalParticipants) || 0,
      topPercentage: Number(data?.userContestRanking?.topPercentage) || 0,
    },
    contestHistory,
  };
};

const toRpgDifficulty = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'hard') {
    return DSA_DIFFICULTY.HARD;
  }

  if (normalized === 'medium') {
    return DSA_DIFFICULTY.MEDIUM;
  }

  return DSA_DIFFICULTY.EASY;
};

const buildTopicTags = (topicTags = []) =>
  topicTags
    .map((tag) => String(tag?.slug || tag?.name || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

const syncLeetCodeSubmissions = async (userId) => {
  const profile = await ensureProfileById(userId);
  const username = normalizeLeetCodeUsername(profile.leetcodeUsername);
  assertLeetCodeUsername(username);

  if (!username) {
    throw createHttpError(400, 'LeetCode username is not configured');
  }

  let leetScanProfile;
  try {
    leetScanProfile = await fetchLeetScanProfile(username);
  } catch {
    throw createHttpError(502, 'Unable to fetch LeetCode submissions right now');
  }

  const submissions = normalizeLeetScanRecentAccepted(leetScanProfile?.recentSubmissions);

  if (!Array.isArray(submissions) || !submissions.length) {
    return {
      username,
      fetchedCount: 0,
      importedCount: 0,
      skippedCount: 0,
      importedProblems: [],
      profile,
      level: null,
      leaderboard: await getLeaderboard(),
      achievements: null,
      leetCodeSnapshot: {
        username: String(leetScanProfile?.username || username),
        totalSolved: Number(leetScanProfile?.totalSolved) || 0,
        easySolved: Number(leetScanProfile?.easySolved) || 0,
        mediumSolved: Number(leetScanProfile?.mediumSolved) || 0,
        hardSolved: Number(leetScanProfile?.hardSolved) || 0,
        ranking: Number(leetScanProfile?.ranking) || 0,
      },
    };
  }

  const sourceKeys = submissions
    .map((entry) => String(entry?.id || '').trim())
    .filter(Boolean)
    .map((id) => `leetcode:${id}`);

  const existing = await DSAProblem.find({
    userId: profile._id,
    sourceKey: { $in: sourceKeys },
  })
    .select('sourceKey')
    .lean();

  const existingSet = new Set(existing.map((item) => item.sourceKey));
  const metadataCache = new Map();
  const docs = [];

  for (const entry of submissions) {
    const sourceKey = `leetcode:${String(entry?.id || '').trim()}`;
    if (!entry?.titleSlug || !entry?.title || !sourceKey || existingSet.has(sourceKey)) {
      continue;
    }

    let meta = metadataCache.get(entry.titleSlug);
    if (!meta) {
      try {
        meta = await fetchLeetCodeQuestionMeta(entry.titleSlug);
      } catch {
        meta = null;
      }
      metadataCache.set(entry.titleSlug, meta);
    }

    const difficulty = toRpgDifficulty(meta?.difficulty);
    const tags = buildTopicTags(meta?.topicTags || []);
    const submissionDate = Number(entry.timestamp) > 0
      ? new Date(Number(entry.timestamp) * 1000)
      : new Date();

    docs.push({
      userId: profile._id,
      title: String(entry.title).trim(),
      difficulty,
      platform: 'LeetCode',
      link: `https://leetcode.com/problems/${entry.titleSlug}/`,
      dateCompletedKey: toDateKey(submissionDate),
      xpEarned: calculateDSAXp(difficulty),
      notes: `Imported from LeetCode sync (${username})`,
      tags: [...new Set(['leetcode-sync', ...tags])],
      sourceKey,
    });
  }

  if (docs.length) {
    try {
      await DSAProblem.insertMany(docs, { ordered: false });
    } catch {
      // Ignore duplicate races and continue with recompute.
    }
  }

  const importedByDate = new Map();
  docs.forEach((item) => {
    const dateKey = String(item.dateCompletedKey || '').trim();
    if (!dateKey) {
      return;
    }

    const current = importedByDate.get(dateKey);
    if (!current || getDifficultyRank(item.difficulty) > getDifficultyRank(current.difficulty)) {
      importedByDate.set(dateKey, {
        dateKey,
        difficulty: item.difficulty,
      });
    }
  });

  if (importedByDate.size) {
    await Promise.all(
      [...importedByDate.values()].map((entry) =>
        syncDailyQuestFromDomainActivity(profile._id, {
          field: 'dsa',
          dsaDifficulty: entry.difficulty,
          dateKey: entry.dateKey,
        })
      ),
    );
  }

  const { profile: refreshedProfile, levelInfo, achievements } = await recalculateProfileProgress(profile._id);

  return {
    username,
    fetchedCount: submissions.length,
    importedCount: docs.length,
    skippedCount: Math.max(0, submissions.length - docs.length),
    importedProblems: docs.slice(0, 50).map((item) => ({
      title: item.title,
      difficulty: item.difficulty,
      dateCompletedKey: item.dateCompletedKey,
      xpEarned: item.xpEarned,
      tags: item.tags,
      sourceKey: item.sourceKey,
    })),
    profile: refreshedProfile,
    level: levelInfo,
    leaderboard: await getLeaderboard(),
    achievements,
    leetCodeSnapshot: {
      username: String(leetScanProfile?.username || username),
      totalSolved: Number(leetScanProfile?.totalSolved) || 0,
      easySolved: Number(leetScanProfile?.easySolved) || 0,
      mediumSolved: Number(leetScanProfile?.mediumSolved) || 0,
      hardSolved: Number(leetScanProfile?.hardSolved) || 0,
      ranking: Number(leetScanProfile?.ranking) || 0,
    },
  };
};

const toWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toDateKey(d);
};

const resolveTopicLabel = (tags = []) => {
  const tagSet = new Set(tags.map((item) => String(item || '').toLowerCase()));
  if (tagSet.has('dynamic-programming') || tagSet.has('dp')) {
    return 'DP';
  }
  if (tagSet.has('graph') || tagSet.has('graphs')) {
    return 'Graph';
  }
  if (tagSet.has('binary-search')) {
    return 'Binary Search';
  }
  if (tagSet.has('array') || tagSet.has('two-pointers')) {
    return 'Array';
  }
  if (tagSet.has('tree') || tagSet.has('binary-tree')) {
    return 'Tree';
  }
  return '';
};

const getDSAAnalytics = async (userId) => {
  const profile = await ensureProfileById(userId);
  const username = normalizeLeetCodeUsername(profile.leetcodeUsername);

  const problems = await DSAProblem.find({ userId })
    .sort({ dateCompletedKey: 1, createdAt: 1 })
    .lean();

  let leetCodeSnapshot = null;
  if (username) {
    try {
      const remote = await fetchLeetScanProfile(username);
      const recentSubmissions = normalizeLeetScanRecentAccepted(remote?.recentSubmissions).slice(0, 10);
      const contestRanking =
        remote?.contestRanking && typeof remote.contestRanking === 'object'
          ? {
            attendedContestsCount: Number(remote.contestRanking.attendedContestsCount) || 0,
            rating: Number(remote.contestRanking.rating) || 0,
            globalRanking: Number(remote.contestRanking.globalRanking) || 0,
            totalParticipants: Number(remote.contestRanking.totalParticipants) || 0,
            topPercentage: Number(remote.contestRanking.topPercentage) || 0,
          }
          : null;

      const contestHistory = Array.isArray(remote?.contestHistory)
        ? remote.contestHistory.map((item) => ({
          rating: Number(item?.rating) || 0,
          ranking: Number(item?.ranking) || 0,
          problemsSolved: Number(item?.problemsSolved) || 0,
          totalProblems: Number(item?.totalProblems) || 0,
          contestTitle: String(item?.contest?.title || item?.contestTitle || '').trim(),
          contestStartTime: Number(item?.contest?.startTime || item?.contestStartTime) || 0,
        }))
          .filter((item) => item.contestStartTime > 0)
          .sort((a, b) => a.contestStartTime - b.contestStartTime)
        : [];

      leetCodeSnapshot = {
        username: String(remote?.username || username),
        totalSolved: Number(remote?.totalSolved) || 0,
        easySolved: Number(remote?.easySolved) || 0,
        mediumSolved: Number(remote?.mediumSolved) || 0,
        hardSolved: Number(remote?.hardSolved) || 0,
        totalSubmissions: Number(remote?.totalSubmissions) || 0,
        ranking: Number(remote?.ranking) || 0,
        contributionPoints: Number(remote?.contributionPoints) || 0,
        reputation: Number(remote?.reputation) || 0,
        submissionCalendar:
          remote?.submissionCalendar && typeof remote.submissionCalendar === 'object'
            ? remote.submissionCalendar
            : {},
        recentSubmissions: recentSubmissions.map((item) => ({
          title: item.title,
          titleSlug: item.titleSlug,
          timestamp: item.timestamp,
          link: `https://leetcode.com/problems/${item.titleSlug}/`,
        })),
        contestRanking,
        contestHistory,
      };

      if (!leetCodeSnapshot.contestHistory.length || !leetCodeSnapshot.contestRanking) {
        try {
          const fallback = await fetchLeetCodeProfileFallback(username);
          leetCodeSnapshot.contestHistory = leetCodeSnapshot.contestHistory.length
            ? leetCodeSnapshot.contestHistory
            : fallback.contestHistory;
          leetCodeSnapshot.contestRanking = leetCodeSnapshot.contestRanking || fallback.contestRanking;
        } catch {
          // Keep existing leetscan values if fallback fails.
        }
      }
    } catch {
      try {
        leetCodeSnapshot = await fetchLeetCodeProfileFallback(username);
      } catch {
        leetCodeSnapshot = null;
      }
    }
  }

  const heatmapMap = new Map();
  const difficultyMap = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };
  const weekMap = new Map();
  const progressMap = new Map();

  const remoteCalendar = leetCodeSnapshot?.submissionCalendar || {};
  const remoteEntries = Object.entries(remoteCalendar)
    .map(([epochSeconds, count]) => {
      const ts = Number(epochSeconds);
      const solves = Number(count) || 0;
      if (!Number.isFinite(ts) || ts <= 0 || solves <= 0) {
        return null;
      }

      return {
        dateKey: toDateKey(new Date(ts * 1000)),
        solves,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const hasRemoteCalendar = remoteEntries.length > 0;

  if (hasRemoteCalendar) {
    let cumulativeSolves = 0;

    remoteEntries.forEach((entry) => {
      heatmapMap.set(entry.dateKey, entry.solves);
      const weekKey = toWeekKey(new Date(`${entry.dateKey}T00:00:00.000Z`));
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + entry.solves);

      cumulativeSolves += entry.solves;
      progressMap.set(entry.dateKey, cumulativeSolves);
    });

    difficultyMap.Easy = Number(leetCodeSnapshot?.easySolved) || 0;
    difficultyMap.Medium = Number(leetCodeSnapshot?.mediumSolved) || 0;
    difficultyMap.Hard = Number(leetCodeSnapshot?.hardSolved) || 0;
  } else {
    let runningXp = 0;

    problems.forEach((problem) => {
      const dateKey = String(problem.dateCompletedKey || '').trim();
      if (!dateKey) {
        return;
      }

      heatmapMap.set(dateKey, (heatmapMap.get(dateKey) || 0) + 1);
      difficultyMap[problem.difficulty] = (difficultyMap[problem.difficulty] || 0) + 1;

      const weekKey = toWeekKey(new Date(`${dateKey}T00:00:00.000Z`));
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);

      runningXp += Number(problem.xpEarned) || 0;
      progressMap.set(dateKey, runningXp);
    });
  }

  const heatmapMaxCount = Math.max(0, ...[...heatmapMap.values()].map((value) => Number(value) || 0));
  const heatStep = heatmapMaxCount > 0 ? Math.max(1, Math.ceil(heatmapMaxCount / 4)) : 1;

  const heatmap = [...heatmapMap.entries()]
    .map(([dateKey, count]) => ({
      dateKey,
      count,
      level: Math.min(4, Math.max(1, Math.ceil((Number(count) || 0) / heatStep))),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const byDifficulty = Object.entries(difficultyMap).map(([difficulty, count]) => ({ difficulty, count }));
  const byWeek = [...weekMap.entries()]
    .map(([weekStart, solves]) => ({ weekStart, solves }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const progressSeries = [...progressMap.entries()]
    .map(([dateKey, value]) => ({ dateKey, value }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1));
  const prevMonthKey = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const topicMonth = new Map();
  problems.forEach((problem) => {
    const label = resolveTopicLabel(problem.tags || []);
    if (!label) {
      return;
    }

    const monthKey = String(problem.dateCompletedKey || '').slice(0, 7);
    const compound = `${label}::${monthKey}`;
    topicMonth.set(compound, (topicMonth.get(compound) || 0) + 1);
  });

  const topicCandidates = ['DP', 'Graph', 'Binary Search', 'Array', 'Tree'];
  let bestTopic = '';
  let bestImprovement = 0;

  topicCandidates.forEach((topic) => {
    const currentCount = topicMonth.get(`${topic}::${currentMonthKey}`) || 0;
    const previousCount = topicMonth.get(`${topic}::${prevMonthKey}`) || 0;
    if (currentCount <= previousCount) {
      return;
    }

    const improvement = previousCount > 0
      ? Math.round(((currentCount - previousCount) / previousCount) * 100)
      : currentCount * 100;

    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestTopic = topic;
    }
  });

  const sourceMonthlyCounts = hasRemoteCalendar
    ? remoteEntries.reduce((acc, entry) => {
      const monthKey = String(entry.dateKey).slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + entry.solves;
      return acc;
    }, {})
    : problems.reduce((acc, problem) => {
      const dateKey = String(problem.dateCompletedKey || '').trim();
      if (!dateKey) {
        return acc;
      }
      const monthKey = dateKey.slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

  const currentMonthSolves = Number(sourceMonthlyCounts[currentMonthKey]) || 0;
  const previousMonthSolves = Number(sourceMonthlyCounts[prevMonthKey]) || 0;
  const overallDelta = previousMonthSolves > 0
    ? Math.round(((currentMonthSolves - previousMonthSolves) / previousMonthSolves) * 100)
    : currentMonthSolves * 100;

  const insights = [];
  if (bestTopic) {
    insights.push(`You improved ${bestImprovement}% in ${bestTopic} this month.`);
  }

  if (currentMonthSolves > 0) {
    insights.push(`This month: ${currentMonthSolves} solves (${overallDelta >= 0 ? '+' : ''}${overallDelta}% vs last month).`);
  }

  const hardCount = Number(difficultyMap.Hard) || 0;
  const totalSolvedForShare = Math.max(
    Number(leetCodeSnapshot?.totalSolved) || 0,
    (Number(difficultyMap.Easy) || 0) + (Number(difficultyMap.Medium) || 0) + (Number(difficultyMap.Hard) || 0),
    problems.length,
    1,
  );
  if (hardCount > 0) {
    insights.push(`Hard problem share is ${Math.round((hardCount / totalSolvedForShare) * 100)}%, showing strong growth in depth.`);
  } else {
    insights.push('Add more hard problems to accelerate interview readiness.');
  }

  const totalProblems = hasRemoteCalendar
    ? Math.max(Number(leetCodeSnapshot?.totalSolved) || 0, (Number(difficultyMap.Easy) || 0) + (Number(difficultyMap.Medium) || 0) + (Number(difficultyMap.Hard) || 0))
    : problems.length;

  return {
    username,
    totalProblems,
    heatmap,
    byDifficulty,
    byWeek,
    progressSeries,
    progressLabel: hasRemoteCalendar ? 'Cumulative Solves' : 'Cumulative XP',
    progressKey: 'value',
    insights,
    leetCodeSnapshot,
    contestRatingSeries: (leetCodeSnapshot?.contestHistory || [])
      .filter((item) => (Number(item?.contestStartTime) || 0) > 0)
      .map((item) => ({
        dateKey: toDateKey(new Date(Number(item.contestStartTime) * 1000)),
        contestTitle: String(item.contestTitle || 'Contest'),
        rating: Number(item.rating) || 0,
        ranking: Number(item.ranking) || 0,
      })),
  };
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
  const questSync = await syncDailyQuestFromDomainActivity(profile._id, {
    field: 'dsa',
    dsaDifficulty: normalized.difficulty,
  });

  return {
    problem: updated,
    profile: questSync?.profile || refreshedProfile,
    level: questSync?.level || levelInfo,
    leaderboard: questSync?.leaderboard || leaderboard,
    todayQuest: questSync?.quest || null,
  };
};

module.exports = {
  createDSAProblem,
  deleteDSAProblem,
  getDSAAnalytics,
  getLeetCodeSettings,
  getDSAProblems,
  getDSAStats,
  syncLeetCodeSubmissions,
  updateLeetCodeSettings,
  updateDSAProblem,
};
