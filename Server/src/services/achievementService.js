const UserProfile = require('../models/UserProfile');
const DailyQuest = require('../models/DailyQuest');
const DSAProblem = require('../models/DSAProblem');
const MockInterview = require('../models/MockInterview');
const Project = require('../models/Project');
const BehavioralStory = require('../models/BehavioralStory');
const UserBadge = require('../models/UserBadge');
const { BADGE_DEFINITIONS } = require('../constants/achievements');

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCriteriaLabel = (criteriaType, threshold) => {
  if (criteriaType === 'xp') {
    return `Reach ${threshold} XP`;
  }

  if (criteriaType === 'streak') {
    return `Reach ${threshold} day streak`;
  }

  return `Reach ${threshold} count`;
};

const getAchievementMetrics = async (userId, profileOverride = null) => {
  const profilePromise = profileOverride
    ? Promise.resolve(profileOverride)
    : UserProfile.findById(userId)
      .select('totalXp currentStreak')
      .lean();

  const [
    profile,
    questCompletedCount,
    dsaSolvedCount,
    mockCount,
    projectShippedCount,
    behavioralPracticeAgg,
  ] = await Promise.all([
    profilePromise,
    DailyQuest.countDocuments({ userId, completed: true }),
    DSAProblem.countDocuments({ userId }),
    MockInterview.countDocuments({ userId }),
    Project.countDocuments({ userId, status: 'shipped' }),
    BehavioralStory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalPractice: { $sum: { $ifNull: ['$practiceCount', 0] } },
        },
      },
    ]),
  ]);

  const behavioralPracticeCount = toSafeNumber(behavioralPracticeAgg?.[0]?.totalPractice, 0);

  return {
    total_xp: toSafeNumber(profile?.totalXp, 0),
    current_streak: toSafeNumber(profile?.currentStreak, 0),
    quest_completed_count: toSafeNumber(questCompletedCount, 0),
    dsa_solved_count: toSafeNumber(dsaSolvedCount, 0),
    mock_count: toSafeNumber(mockCount, 0),
    project_shipped_count: toSafeNumber(projectShippedCount, 0),
    behavioral_practice_count: toSafeNumber(behavioralPracticeCount, 0),
  };
};

const buildBadgeState = (definition, unlockedEntry, currentValue) => {
  const progressPercent = definition.threshold > 0
    ? Math.min(100, Math.round((currentValue / definition.threshold) * 100))
    : 100;

  return {
    badgeId: definition.badgeId,
    title: definition.title,
    description: definition.description,
    criteriaType: definition.criteriaType,
    metricKey: definition.metricKey,
    threshold: definition.threshold,
    criteriaLabel: toCriteriaLabel(definition.criteriaType, definition.threshold),
    currentValue,
    progressPercent,
    unlocked: Boolean(unlockedEntry),
    unlockedAt: unlockedEntry?.unlockedAt || null,
  };
};

const evaluateAndFetchAchievements = async (userId, options = {}) => {
  const metrics = await getAchievementMetrics(userId, options.profile || null);

  const existing = await UserBadge.find({ userId })
    .select('badgeId unlockedAt')
    .lean();

  const existingMap = new Map(existing.map((entry) => [entry.badgeId, entry]));

  const toUnlock = BADGE_DEFINITIONS.filter((definition) => {
    const currentValue = toSafeNumber(metrics[definition.metricKey], 0);
    return currentValue >= definition.threshold && !existingMap.has(definition.badgeId);
  });

  if (toUnlock.length) {
    try {
      await UserBadge.insertMany(
        toUnlock.map((definition) => ({
          userId,
          badgeId: definition.badgeId,
          title: definition.title,
          description: definition.description,
          criteriaType: definition.criteriaType,
          metricKey: definition.metricKey,
          threshold: definition.threshold,
          unlockedAt: new Date(),
          progressValueAtUnlock: toSafeNumber(metrics[definition.metricKey], 0),
        })),
        { ordered: false },
      );
    } catch {
      // Ignore duplicate key races from concurrent progress updates.
    }
  }

  const refreshed = await UserBadge.find({ userId })
    .select('badgeId unlockedAt')
    .lean();

  const refreshedMap = new Map(refreshed.map((entry) => [entry.badgeId, entry]));

  const allBadges = BADGE_DEFINITIONS.map((definition) =>
    buildBadgeState(
      definition,
      refreshedMap.get(definition.badgeId) || null,
      toSafeNumber(metrics[definition.metricKey], 0),
    ),
  );

  const earnedBadges = allBadges
    .filter((item) => item.unlocked)
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());

  const newlyUnlocked = allBadges
    .filter((item) => item.unlocked && toUnlock.some((entry) => entry.badgeId === item.badgeId));

  return {
    totalBadges: BADGE_DEFINITIONS.length,
    earnedCount: earnedBadges.length,
    earnedBadges,
    allBadges,
    newlyUnlocked,
    metrics,
  };
};

const getUserAchievementSummary = async (userId) => evaluateAndFetchAchievements(userId, {});

module.exports = {
  evaluateAndFetchAchievements,
  getUserAchievementSummary,
};
