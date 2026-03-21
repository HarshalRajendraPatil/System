const {
  BASE_QUEST_XP,
  DSA_DIFFICULTY,
  DSA_DIFFICULTY_XP,
  QUEST_FIELDS,
  resolveLevelFromXp,
} = require('../constants/rpg');
const DailyQuest = require('../models/DailyQuest');
const UserProfile = require('../models/UserProfile');
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

const isCompletedQuestDay = (quest) =>
  QUEST_FIELDS.some((field) => quest[field] === true) || quest.hoursLogged > 0;

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

const getDashboardData = async (userId, dateKey) => {
  const profile = await ensureProfileById(userId);
  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
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
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    quest: updatedQuest,
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    leaderboard,
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
        completed,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const { profile: refreshedProfile, levelInfo } = await recalculateProfileProgress(profile._id);
  const leaderboard = await getLeaderboard();
  const rank =
    (await UserProfile.countDocuments({ isActive: true, totalXp: { $gt: refreshedProfile.totalXp } })) + 1;

  return {
    quest: updatedQuest,
    profile: refreshedProfile,
    level: levelInfo,
    rank,
    leaderboard,
    leveledUp: refreshedProfile.level > previousLevel,
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
  ensureProfileById,
  getDashboardData,
  getLeaderboard,
  getQuestHistory,
  isCompletedQuestDay,
  normalizeQuestPayload,
  recalculateProfileProgress,
  rewardSimulationQuestCompletion,
  upsertDailyQuest,
};
