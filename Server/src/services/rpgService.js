const {
  BASE_QUEST_XP,
  DSA_DIFFICULTY,
  DSA_DIFFICULTY_XP,
  QUEST_FIELDS,
  resolveLevelFromXp,
} = require('../constants/rpg');
const DailyQuest = require('../models/DailyQuest');
const UserProfile = require('../models/UserProfile');
const { evaluateAndFetchAchievements } = require('./achievementService');
const { getDayDifference, shiftDateKey, toDateKey } = require('../utils/date');
const { createHttpError } = require('../utils/httpError');

const clampHours = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(24, Math.max(0, numericValue));
};

const parseDifficulty = (value) => {
  if (!value || typeof value !== 'string') {
    return DSA_DIFFICULTY.EASY;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'hard') {
    return DSA_DIFFICULTY.HARD;
  }

  if (normalizedValue === 'medium') {
    return DSA_DIFFICULTY.MEDIUM;
  }

  return DSA_DIFFICULTY.EASY;
};

const resolveHigherDifficulty = (currentDifficulty, nextDifficulty) => {
  const order = {
    [DSA_DIFFICULTY.EASY]: 1,
    [DSA_DIFFICULTY.MEDIUM]: 2,
    [DSA_DIFFICULTY.HARD]: 3,
  };

  const safeCurrent = parseDifficulty(currentDifficulty);
  const safeNext = parseDifficulty(nextDifficulty);

  return (order[safeNext] || 1) >= (order[safeCurrent] || 1) ? safeNext : safeCurrent;
};

const normalizeQuestPayload = (payload = {}) => {
  const normalizedDateKey = payload.dateKey ? toDateKey(payload.dateKey) : toDateKey(new Date());

  return {
    dateKey: normalizedDateKey,
    dsa: Boolean(payload.dsa),
    lldHld: Boolean(payload.lldHld),
    projectWork: Boolean(payload.projectWork),
    theoryRevision: Boolean(payload.theoryRevision),
    mockInterview: Boolean(payload.mockInterview),
    behavioralStories: Boolean(payload.behavioralStories),
    hoursLogged: clampHours(payload.hoursLogged),
    dsaDifficulty: parseDifficulty(payload.dsaDifficulty),
  };
};

const calculateDailyQuestXp = (quest) => {
  let xp = 0;

  if (quest.dsa && quest.lldHld) {
    xp += BASE_QUEST_XP.DSA_AND_LLD_BONUS;
  }

  if (quest.projectWork) {
    xp += BASE_QUEST_XP.PROJECT_WORK;
  }

  if (quest.theoryRevision) {
    xp += BASE_QUEST_XP.THEORY_REVISION;
  }

  if (quest.mockInterview) {
    xp += BASE_QUEST_XP.MOCK_INTERVIEW;
  }

  if (quest.behavioralStories) {
    xp += BASE_QUEST_XP.BEHAVIORAL_STORIES;
  }

  if (quest.dsa) {
    xp += DSA_DIFFICULTY_XP[quest.dsaDifficulty] || DSA_DIFFICULTY_XP[DSA_DIFFICULTY.EASY];
  }

  xp += Math.round(quest.hoursLogged * BASE_QUEST_XP.HOURS_MULTIPLIER);

  return Math.max(0, xp);
};

const calculateXpBreakdown = (quest) => {
  const breakdown = {};

  if (quest.dsa && quest.lldHld) {
    breakdown.dsaAndLldBonus = BASE_QUEST_XP.DSA_AND_LLD_BONUS;
  }

  if (quest.projectWork) {
    breakdown.projectWork = BASE_QUEST_XP.PROJECT_WORK;
  }

  if (quest.theoryRevision) {
    breakdown.theoryRevision = BASE_QUEST_XP.THEORY_REVISION;
  }

  if (quest.mockInterview) {
    breakdown.mockInterview = BASE_QUEST_XP.MOCK_INTERVIEW;
  }

  if (quest.behavioralStories) {
    breakdown.behavioralStories = BASE_QUEST_XP.BEHAVIORAL_STORIES;
  }

  if (quest.dsa) {
    breakdown.dsaDifficulty = DSA_DIFFICULTY_XP[quest.dsaDifficulty] || DSA_DIFFICULTY_XP[DSA_DIFFICULTY.EASY];
  }

  const hoursXp = Math.round(quest.hoursLogged * BASE_QUEST_XP.HOURS_MULTIPLIER);
  if (hoursXp > 0) {
    breakdown.hours = hoursXp;
  }

  return breakdown;
};

const isCompletedQuestDay = (quest) => {
  const completedQuestCount = QUEST_FIELDS.filter((field) => quest[field] === true).length;
  return completedQuestCount >= 3;
};

const calculateLongestStreak = (dateKeys) => {
  if (!dateKeys.length) {
    return 0;
  }

  const sortedDateKeys = [...dateKeys].sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let index = 1; index < sortedDateKeys.length; index += 1) {
    const previousDateKey = sortedDateKeys[index - 1];
    const currentDateKey = sortedDateKeys[index];
    const dayDifference = getDayDifference(previousDateKey, currentDateKey);

    if (dayDifference === 1) {
      currentStreak += 1;
    } else if (dayDifference > 1) {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return longestStreak;
};

const calculateCurrentStreak = (dateKeys, todayDateKey) => {
  if (!dateKeys.length) {
    return 0;
  }

  const dateSet = new Set(dateKeys);
  const latestDateKey = [...dateSet].sort().at(-1);

  if (!latestDateKey) {
    return 0;
  }

  const daysFromLatestToToday = getDayDifference(latestDateKey, todayDateKey);

  if (daysFromLatestToToday > 1) {
    return 0;
  }

  let streak = 0;
  let cursor = latestDateKey;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
};

const getDefaultQuestResponse = (dateKey) => ({
  dateKey,
  dsa: false,
  lldHld: false,
  projectWork: false,
  theoryRevision: false,
  mockInterview: false,
  behavioralStories: false,
  dsaDifficulty: DSA_DIFFICULTY.EASY,
  hoursLogged: 0,
  xpEarned: 0,
  bonusXp: 0,
  simulationCompletions: 0,
  xpBreakdown: {},
  completed: false,
});

const ensureProfileById = async (userId) => {
  if (!userId) {
    throw createHttpError(401, 'Authentication required');
  }

  const profile = await UserProfile.findById(userId).lean();

  if (!profile) {
    throw createHttpError(404, 'User profile not found');
  }

  if (profile.isActive === false) {
    throw createHttpError(403, 'Account is inactive');
  }

  return profile;
};

const recalculateProfileProgress = async (profileId) => {
  const quests = await DailyQuest.find({ userId: profileId })
    .select('dateKey xpEarned completed')
    .sort({ dateKey: 1 })
    .lean();

  const totalXp = quests.reduce((sum, quest) => sum + (Number(quest.xpEarned) || 0), 0);
  const completedDateKeys = quests.filter((quest) => quest.completed).map((quest) => quest.dateKey);

  const todayDateKey = toDateKey(new Date());
  const currentStreak = calculateCurrentStreak(completedDateKeys, todayDateKey);
  const longestStreak = calculateLongestStreak(completedDateKeys);
  const levelInfo = resolveLevelFromXp(totalXp);

  const updatedProfile = await UserProfile.findByIdAndUpdate(
    profileId,
    {
      $set: {
        totalXp,
        level: levelInfo.level,
        levelCap: levelInfo.levelCap,
        levelProgressPercent: levelInfo.levelProgressPercent,
        xpInCurrentLevel: levelInfo.xpInCurrentLevel,
        xpToNextLevel: levelInfo.xpToNextLevel,
        currentStreak,
        longestStreak,
      },
    },
    { new: true },
  ).lean();

  return {
    profile: updatedProfile,
    levelInfo,
    achievements: await evaluateAndFetchAchievements(updatedProfile._id, {
      profile: updatedProfile,
    }),
  };
};

const getLeaderboard = async (limit = 10) => {
  const leaderboard = await UserProfile.find({ isActive: true })
    .select('displayName username totalXp level currentStreak longestStreak')
    .sort({ totalXp: -1, updatedAt: 1 })
    .limit(limit)
    .lean();

  return leaderboard;
};

const getGlobalLeaderboardData = async (userId, limit = 50) => {
  const profile = await ensureProfileById(userId);
  const safeLimit = Math.min(200, Math.max(10, Number(limit) || 50));

  const [leaderboard, totalPlayers, currentUserRank] = await Promise.all([
    getLeaderboard(safeLimit),
    UserProfile.countDocuments({ isActive: true }),
    UserProfile.countDocuments({ isActive: true, totalXp: { $gt: profile.totalXp } }),
  ]);

  return {
    leaderboard,
    totalPlayers,
    currentUserRank: currentUserRank + 1,
  };
};

const getDashboardData = async (userId, dateKey) => {
  const profile = await ensureProfileById(userId);
  const {
    profile: refreshedProfile,
    levelInfo,
    achievements,
  } = await recalculateProfileProgress(profile._id);
  const effectiveDateKey = dateKey ? toDateKey(dateKey) : toDateKey(new Date());

  const todayQuest = await DailyQuest.findOne({
    userId: profile._id,
    dateKey: effectiveDateKey,
  }).lean();

  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    todayQuest: todayQuest || getDefaultQuestResponse(effectiveDateKey),
    leaderboard,
    achievements,
  };
};

const upsertDailyQuest = async (userId, payload) => {
  const profile = await ensureProfileById(userId);
  const previousLevel = profile.level;
  const normalizedQuest = normalizeQuestPayload(payload);
  const existingQuest = await DailyQuest.findOne({
    userId: profile._id,
    dateKey: normalizedQuest.dateKey,
  }).lean();
  const bonusXp = Number(existingQuest?.bonusXp) || 0;
  const xpEarned = calculateDailyQuestXp(normalizedQuest) + bonusXp;
  const completed = isCompletedQuestDay(normalizedQuest);
  const xpBreakdown = calculateXpBreakdown(normalizedQuest);

  const updatedQuest = await DailyQuest.findOneAndUpdate(
    {
      userId: profile._id,
      dateKey: normalizedQuest.dateKey,
    },
    {
      $set: {
        ...normalizedQuest,
        xpEarned,
        bonusXp,
        simulationCompletions: Number(existingQuest?.simulationCompletions) || 0,
        completed,
        xpBreakdown,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const {
    profile: refreshedProfile,
    levelInfo,
    achievements,
  } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    quest: updatedQuest,
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    leaderboard,
    achievements,
    leveledUp: refreshedProfile.level > previousLevel,
  };
};

const rewardSimulationQuestCompletion = async (userId, options = {}) => {
  const profile = await ensureProfileById(userId);
  const previousLevel = profile.level;

  const xpBonus = Math.max(0, Number(options.xpBonus) || 50);
  const todayDateKey = toDateKey(new Date());

  const existingQuest = await DailyQuest.findOne({
    userId: profile._id,
    dateKey: todayDateKey,
  }).lean();

  const normalizedQuest = {
    dateKey: todayDateKey,
    dsa: Boolean(existingQuest?.dsa),
    lldHld: Boolean(existingQuest?.lldHld),
    projectWork: Boolean(existingQuest?.projectWork),
    theoryRevision: Boolean(existingQuest?.theoryRevision),
    mockInterview: true,
    behavioralStories: Boolean(existingQuest?.behavioralStories),
    dsaDifficulty: existingQuest?.dsaDifficulty || DSA_DIFFICULTY.EASY,
    hoursLogged: clampHours(existingQuest?.hoursLogged),
  };

  const nextBonusXp = (Number(existingQuest?.bonusXp) || 0) + xpBonus;
  const simulationCompletions = (Number(existingQuest?.simulationCompletions) || 0) + 1;
  const xpEarned = calculateDailyQuestXp(normalizedQuest) + nextBonusXp;
  const completed = isCompletedQuestDay(normalizedQuest);
  const xpBreakdown = calculateXpBreakdown(normalizedQuest);

  const updatedQuest = await DailyQuest.findOneAndUpdate(
    {
      userId: profile._id,
      dateKey: todayDateKey,
    },
    {
      $set: {
        ...normalizedQuest,
        xpEarned,
        bonusXp: nextBonusXp,
        simulationCompletions,
        xpBreakdown,
        completed,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const {
    profile: refreshedProfile,
    levelInfo,
    achievements,
  } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    quest: updatedQuest,
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    leaderboard,
    achievements,
    leveledUp: refreshedProfile.level > previousLevel,
  };
};

const syncDailyQuestFromDomainActivity = async (userId, options = {}) => {
  const profile = await ensureProfileById(userId);
  const field = String(options.field || '').trim();
  const shouldEnableTheory = Boolean(options.enableTheoryRevision);

  if (!field || !QUEST_FIELDS.includes(field)) {
    return null;
  }

  const dateKey = options.dateKey ? toDateKey(options.dateKey) : toDateKey(new Date());

  const existingQuest = await DailyQuest.findOne({
    userId: profile._id,
    dateKey,
  }).lean();

  const nextQuest = {
    dateKey,
    dsa: Boolean(existingQuest?.dsa),
    lldHld: Boolean(existingQuest?.lldHld),
    projectWork: Boolean(existingQuest?.projectWork),
    theoryRevision: Boolean(existingQuest?.theoryRevision),
    mockInterview: Boolean(existingQuest?.mockInterview),
    behavioralStories: Boolean(existingQuest?.behavioralStories),
    dsaDifficulty: parseDifficulty(existingQuest?.dsaDifficulty),
    hoursLogged: clampHours(existingQuest?.hoursLogged),
  };

  nextQuest[field] = true;

  if (field === 'dsa' && options.dsaDifficulty) {
    nextQuest.dsaDifficulty = resolveHigherDifficulty(nextQuest.dsaDifficulty, options.dsaDifficulty);
  }

  if (shouldEnableTheory) {
    nextQuest.theoryRevision = true;
  }

  const bonusXp = Number(existingQuest?.bonusXp) || 0;
  const simulationCompletions = Number(existingQuest?.simulationCompletions) || 0;
  const xpBreakdown = calculateXpBreakdown(nextQuest);
  const xpEarned = calculateDailyQuestXp(nextQuest) + bonusXp;
  const completed = isCompletedQuestDay(nextQuest);

  const updatedQuest = await DailyQuest.findOneAndUpdate(
    {
      userId: profile._id,
      dateKey,
    },
    {
      $set: {
        ...nextQuest,
        bonusXp,
        simulationCompletions,
        xpBreakdown,
        xpEarned,
        completed,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const {
    profile: refreshedProfile,
    levelInfo,
    achievements,
  } = await recalculateProfileProgress(profile._id);

  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    quest: updatedQuest,
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    leaderboard,
    achievements,
  };
};

const getAchievementsData = async (userId) => {
  await ensureProfileById(userId);
  return evaluateAndFetchAchievements(userId, {});
};

const getQuestXpSummary = async (userId, dateKey) => {
  const profile = await ensureProfileById(userId);
  const normalizedDateKey = toDateKey(dateKey);
  const dailyQuest = await DailyQuest.findOne({
    userId: profile._id,
    dateKey: normalizedDateKey,
  }).lean();

  if (!dailyQuest) {
    return {
      dateKey: normalizedDateKey,
      questItems: [],
      sourceTotals: {
        dsa: 0,
        lldHld: 0,
        projectWork: 0,
        theoryRevision: 0,
        mockInterview: 0,
        behavioralStories: 0,
        hoursLogged: 0,
        simulationBonus: 0,
      },
      totalXp: 0,
    };
  }

  const breakdown = dailyQuest.xpBreakdown || {};
  const questItems = [
    {
      key: 'dsa',
      label: `DSA (${dailyQuest.dsaDifficulty || DSA_DIFFICULTY.EASY})`,
      completed: Boolean(dailyQuest.dsa),
      xp: Number(breakdown.dsaDifficulty) || 0,
    },
    {
      key: 'lldHld',
      label: 'LLD/HLD',
      completed: Boolean(dailyQuest.lldHld),
      xp: dailyQuest.dsa && dailyQuest.lldHld ? Number(breakdown.dsaAndLldBonus) || 0 : 0,
    },
    {
      key: 'projectWork',
      label: 'Project Work',
      completed: Boolean(dailyQuest.projectWork),
      xp: Number(breakdown.projectWork) || 0,
    },
    {
      key: 'theoryRevision',
      label: 'Theory Revision',
      completed: Boolean(dailyQuest.theoryRevision),
      xp: Number(breakdown.theoryRevision) || 0,
    },
    {
      key: 'mockInterview',
      label: 'Mocks',
      completed: Boolean(dailyQuest.mockInterview),
      xp: Number(breakdown.mockInterview) || 0,
    },
    {
      key: 'behavioralStories',
      label: 'Behaviorals',
      completed: Boolean(dailyQuest.behavioralStories),
      xp: Number(breakdown.behavioralStories) || 0,
    },
    {
      key: 'hoursLogged',
      label: `Hours Logged (${Number(dailyQuest.hoursLogged) || 0}h)`,
      completed: (Number(dailyQuest.hoursLogged) || 0) > 0,
      xp: Number(breakdown.hours) || 0,
    },
    {
      key: 'simulationBonus',
      label: `AI Simulator Bonus (${Number(dailyQuest.simulationCompletions) || 0})`,
      completed: (Number(dailyQuest.bonusXp) || 0) > 0,
      xp: Number(dailyQuest.bonusXp) || 0,
    },
  ];

  return {
    dateKey: normalizedDateKey,
    questItems,
    sourceTotals: {
      dsa: Number(breakdown.dsaDifficulty) || 0,
      lldHld: dailyQuest.dsa && dailyQuest.lldHld ? Number(breakdown.dsaAndLldBonus) || 0 : 0,
      projectWork: Number(breakdown.projectWork) || 0,
      theoryRevision: Number(breakdown.theoryRevision) || 0,
      mockInterview: Number(breakdown.mockInterview) || 0,
      behavioralStories: Number(breakdown.behavioralStories) || 0,
      hoursLogged: Number(breakdown.hours) || 0,
      simulationBonus: Number(dailyQuest.bonusXp) || 0,
    },
    totalXp: Number(dailyQuest.xpEarned) || 0,
  };
};

const getQuestHistory = async (userId, query = {}) => {
  const profile = await ensureProfileById(userId);

  const filter = {
    userId: profile._id,
  };

  if (query.fromDateKey || query.toDateKey) {
    filter.dateKey = {};

    if (query.fromDateKey) {
      filter.dateKey.$gte = toDateKey(query.fromDateKey);
    }

    if (query.toDateKey) {
      filter.dateKey.$lte = toDateKey(query.toDateKey);
    }
  }

  const quests = await DailyQuest.find(filter)
    .sort({ dateKey: -1 })
    .limit(120)
    .lean();

  return quests;
};

module.exports = {
  calculateDailyQuestXp,
  calculateXpBreakdown,
  ensureProfileById,
  getDashboardData,
  getGlobalLeaderboardData,
  getAchievementsData,
  getLeaderboard,
  getQuestHistory,
  getQuestXpSummary,
  isCompletedQuestDay,
  normalizeQuestPayload,
  recalculateProfileProgress,
  rewardSimulationQuestCompletion,
  syncDailyQuestFromDomainActivity,
  upsertDailyQuest,
};
