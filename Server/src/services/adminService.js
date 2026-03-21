const { USER_ROLES } = require('../constants/auth');
const AICoachInsight = require('../models/AICoachInsight');
const BehavioralStory = require('../models/BehavioralStory');
const DSAProblem = require('../models/DSAProblem');
const DailyQuest = require('../models/DailyQuest');
const InterviewSimulation = require('../models/InterviewSimulation');
const LLDHLDDesign = require('../models/LLDHLDDesign');
const MockInterview = require('../models/MockInterview');
const PortfolioProfile = require('../models/PortfolioProfile');
const Project = require('../models/Project');
const UserBadge = require('../models/UserBadge');
const UserProfile = require('../models/UserProfile');
const { toDateKey } = require('../utils/date');
const { createHttpError } = require('../utils/httpError');

const ADMIN_USER_SORT_FIELDS = new Set([
  'createdAt',
  'lastLoginAt',
  'totalXp',
  'level',
  'username',
  'displayName',
]);

const clampLimit = (value, fallback = 20) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
};

const parsePage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
};

const buildUserCountMap = async (Model, userIds = []) => {
  if (!userIds.length) {
    return new Map();
  }

  const rows = await Model.aggregate([
    {
      $match: {
        userId: {
          $in: userIds,
        },
      },
    },
    {
      $group: {
        _id: '$userId',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  return new Map(rows.map((row) => [String(row._id), Number(row.count) || 0]));
};

const getAdminOverview = async ({ leaderboardLimit = 8, windowDays = 7 } = {}) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - Math.max(1, Number(windowDays) || 7) * 24 * 60 * 60 * 1000);
  const todayDateKey = toDateKey(now);

  const [
    totalUsers,
    activeUsers,
    adminUsers,
    newUsersInWindow,
    profileTotals,
    topUsers,
    totalDsaProblems,
    totalDesigns,
    totalProjects,
    totalMocks,
    totalBehavioralStories,
    totalAiInsights,
    totalSimulations,
    totalPortfolios,
    totalQuests,
    totalBadges,
    completedQuestsToday,
  ] = await Promise.all([
    UserProfile.countDocuments({}),
    UserProfile.countDocuments({ isActive: true }),
    UserProfile.countDocuments({ role: USER_ROLES.ADMIN }),
    UserProfile.countDocuments({ createdAt: { $gte: windowStart } }),
    UserProfile.aggregate([
      {
        $group: {
          _id: null,
          totalXp: { $sum: '$totalXp' },
          averageLevel: { $avg: '$level' },
          averageStreak: { $avg: '$currentStreak' },
        },
      },
    ]),
    UserProfile.find({ isActive: true })
      .sort({ totalXp: -1, level: -1, updatedAt: -1 })
      .limit(clampLimit(leaderboardLimit, 8))
      .select('username displayName role totalXp level currentStreak')
      .lean(),
    DSAProblem.countDocuments({}),
    LLDHLDDesign.countDocuments({}),
    Project.countDocuments({}),
    MockInterview.countDocuments({}),
    BehavioralStory.countDocuments({}),
    AICoachInsight.countDocuments({}),
    InterviewSimulation.countDocuments({}),
    PortfolioProfile.countDocuments({}),
    DailyQuest.countDocuments({}),
    UserBadge.countDocuments({}),
    DailyQuest.countDocuments({ dateKey: todayDateKey, completed: true }),
  ]);

  const totals = profileTotals?.[0] || {};

  return {
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      newlyRegisteredInWindow: newUsersInWindow,
    },
    engagement: {
      totalXp: Number(totals.totalXp) || 0,
      averageLevel: Number(totals.averageLevel || 0).toFixed(2),
      averageStreak: Number(totals.averageStreak || 0).toFixed(2),
      completedQuestsToday,
    },
    modules: {
      dsaProblems: totalDsaProblems,
      lldHldDesigns: totalDesigns,
      projects: totalProjects,
      mockInterviews: totalMocks,
      behavioralStories: totalBehavioralStories,
      aiCoachInsights: totalAiInsights,
      interviewSimulations: totalSimulations,
      portfolios: totalPortfolios,
      dailyQuests: totalQuests,
      badges: totalBadges,
    },
    topUsers: topUsers.map((user) => ({
      id: String(user._id),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      totalXp: user.totalXp,
      level: user.level,
      currentStreak: user.currentStreak,
    })),
  };
};

const listAdminUsers = async ({
  page = 1,
  limit = 20,
  query = '',
  role,
  isActive,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const safePage = parsePage(page);
  const safeLimit = clampLimit(limit, 20);
  const safeSortBy = ADMIN_USER_SORT_FIELDS.has(String(sortBy)) ? sortBy : 'createdAt';
  const safeSortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const searchTerm = String(query || '').trim();

  const filter = {};

  if (role && Object.values(USER_ROLES).includes(role)) {
    filter.role = role;
  }

  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  if (searchTerm) {
    filter.$or = [
      { username: { $regex: searchTerm, $options: 'i' } },
      { displayName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const [totalItems, users] = await Promise.all([
    UserProfile.countDocuments(filter),
    UserProfile.find(filter)
      .sort({ [safeSortBy]: safeSortDirection, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .select('username displayName email role isActive totalXp level currentStreak longestStreak lastLoginAt createdAt')
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const userIds = users.map((user) => user._id);

  const [questCountMap, dsaCountMap, mockCountMap, projectCountMap] = await Promise.all([
    buildUserCountMap(DailyQuest, userIds),
    buildUserCountMap(DSAProblem, userIds),
    buildUserCountMap(MockInterview, userIds),
    buildUserCountMap(Project, userIds),
  ]);

  return {
    items: users.map((user) => ({
      id: String(user._id),
      username: user.username,
      displayName: user.displayName,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
      totalXp: user.totalXp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      activityFootprint: {
        dailyQuests: questCountMap.get(String(user._id)) || 0,
        dsaProblems: dsaCountMap.get(String(user._id)) || 0,
        mockInterviews: mockCountMap.get(String(user._id)) || 0,
        projects: projectCountMap.get(String(user._id)) || 0,
      },
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
    },
    filters: {
      query: searchTerm,
      role: filter.role || '',
      isActive: typeof isActive === 'boolean' ? isActive : null,
      sortBy: safeSortBy,
      sortOrder: safeSortDirection === 1 ? 'asc' : 'desc',
    },
  };
};

const updateAdminUser = async (targetUserId, actorUserId, payload = {}) => {
  if (!targetUserId) {
    throw createHttpError(400, 'User id is required');
  }

  const user = await UserProfile.findById(targetUserId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const normalizedActorUserId = String(actorUserId || '');
  const normalizedTargetUserId = String(user._id);

  if (normalizedActorUserId && normalizedActorUserId === normalizedTargetUserId) {
    if (payload.role && payload.role !== user.role) {
      throw createHttpError(400, 'You cannot change your own role');
    }

    if (typeof payload.isActive === 'boolean' && payload.isActive === false) {
      throw createHttpError(400, 'You cannot deactivate your own account');
    }
  }

  if (payload.role && Object.values(USER_ROLES).includes(payload.role)) {
    user.role = payload.role;
  }

  if (typeof payload.isActive === 'boolean') {
    user.isActive = payload.isActive;
  }

  await user.save();

  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
  };
};

const deleteAdminUserAndData = async (targetUserId, actorUserId) => {
  if (!targetUserId) {
    throw createHttpError(400, 'User id is required');
  }

  if (String(targetUserId) === String(actorUserId || '')) {
    throw createHttpError(400, 'You cannot delete your own account');
  }

  const user = await UserProfile.findById(targetUserId).select('username displayName');

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const [
    dsaDeleted,
    designsDeleted,
    projectsDeleted,
    mocksDeleted,
    behavioralDeleted,
    aiDeleted,
    simulationsDeleted,
    portfolioDeleted,
    questsDeleted,
    badgesDeleted,
    userDeleted,
  ] = await Promise.all([
    DSAProblem.deleteMany({ userId: targetUserId }),
    LLDHLDDesign.deleteMany({ userId: targetUserId }),
    Project.deleteMany({ userId: targetUserId }),
    MockInterview.deleteMany({ userId: targetUserId }),
    BehavioralStory.deleteMany({ userId: targetUserId }),
    AICoachInsight.deleteMany({ userId: targetUserId }),
    InterviewSimulation.deleteMany({ userId: targetUserId }),
    PortfolioProfile.deleteMany({ userId: targetUserId }),
    DailyQuest.deleteMany({ userId: targetUserId }),
    UserBadge.deleteMany({ userId: targetUserId }),
    UserProfile.deleteOne({ _id: targetUserId }),
  ]);

  return {
    deletedUser: {
      id: String(targetUserId),
      username: user.username,
      displayName: user.displayName,
    },
    deletedCounts: {
      dsaProblems: dsaDeleted.deletedCount || 0,
      lldHldDesigns: designsDeleted.deletedCount || 0,
      projects: projectsDeleted.deletedCount || 0,
      mockInterviews: mocksDeleted.deletedCount || 0,
      behavioralStories: behavioralDeleted.deletedCount || 0,
      aiCoachInsights: aiDeleted.deletedCount || 0,
      interviewSimulations: simulationsDeleted.deletedCount || 0,
      portfolioProfiles: portfolioDeleted.deletedCount || 0,
      dailyQuests: questsDeleted.deletedCount || 0,
      badges: badgesDeleted.deletedCount || 0,
      userProfiles: userDeleted.deletedCount || 0,
    },
  };
};

const buildActivityRow = (record, domain, userMap) => {
  const userId = String(record.userId || '');
  const user = userMap.get(userId);

  return {
    id: String(record._id),
    domain,
    createdAt: record.createdAt,
    user: user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        }
      : {
          id: userId,
          username: 'unknown',
          displayName: 'Unknown User',
        },
    summary: {
      title: record.title || record.slug || record.type || domain,
    },
  };
};

const getAdminRecentActivity = async ({ page = 1, limit = 20 } = {}) => {
  const safePage = parsePage(page);
  const safeLimit = clampLimit(limit, 20);
  const pageWindow = safePage * safeLimit;
  const perModelLimit = Math.max(10, pageWindow);

  const [
    dsa,
    designs,
    projects,
    mocks,
    behavioral,
    ai,
    simulations,
    dsaCount,
    designsCount,
    projectsCount,
    mocksCount,
    behavioralCount,
    aiCount,
    simulationsCount,
  ] = await Promise.all([
    DSAProblem.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId title createdAt').lean(),
    LLDHLDDesign.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId title createdAt').lean(),
    Project.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId title createdAt').lean(),
    MockInterview.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId title createdAt').lean(),
    BehavioralStory.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId title createdAt').lean(),
    AICoachInsight.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId type createdAt').lean(),
    InterviewSimulation.find({}).sort({ createdAt: -1 }).limit(perModelLimit).select('userId difficulty roundType createdAt').lean(),
    DSAProblem.countDocuments({}),
    LLDHLDDesign.countDocuments({}),
    Project.countDocuments({}),
    MockInterview.countDocuments({}),
    BehavioralStory.countDocuments({}),
    AICoachInsight.countDocuments({}),
    InterviewSimulation.countDocuments({}),
  ]);

  const userIds = [
    ...dsa.map((row) => String(row.userId)),
    ...designs.map((row) => String(row.userId)),
    ...projects.map((row) => String(row.userId)),
    ...mocks.map((row) => String(row.userId)),
    ...behavioral.map((row) => String(row.userId)),
    ...ai.map((row) => String(row.userId)),
    ...simulations.map((row) => String(row.userId)),
  ];

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  const users = await UserProfile.find({
    _id: {
      $in: uniqueUserIds,
    },
  }).select('username displayName').lean();

  const userMap = new Map(
    users.map((user) => [
      String(user._id),
      {
        id: String(user._id),
        username: user.username,
        displayName: user.displayName,
      },
    ]),
  );

  const rows = [
    ...dsa.map((record) => buildActivityRow(record, 'dsa', userMap)),
    ...designs.map((record) => buildActivityRow(record, 'lld_hld', userMap)),
    ...projects.map((record) => buildActivityRow(record, 'projects', userMap)),
    ...mocks.map((record) => buildActivityRow(record, 'mocks', userMap)),
    ...behavioral.map((record) => buildActivityRow(record, 'behavioral', userMap)),
    ...ai.map((record) => buildActivityRow(record, 'ai_coach', userMap)),
    ...simulations.map((record) => buildActivityRow(record, 'interview_simulator', userMap)),
  ];

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalItems =
    Number(dsaCount || 0)
    + Number(designsCount || 0)
    + Number(projectsCount || 0)
    + Number(mocksCount || 0)
    + Number(behavioralCount || 0)
    + Number(aiCount || 0)
    + Number(simulationsCount || 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    items: rows.slice(start, end),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
    },
  };
};

module.exports = {
  deleteAdminUserAndData,
  getAdminOverview,
  getAdminRecentActivity,
  listAdminUsers,
  updateAdminUser,
};
