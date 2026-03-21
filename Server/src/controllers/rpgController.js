const {
  getAchievementsData,
  getDashboardData,
  getGlobalLeaderboardData,
  getQuestHistory,
  getQuestXpSummary,
  upsertDailyQuest,
  ensureProfileById,
} = require('../services/rpgService');
const DailyQuest = require('../models/DailyQuest');
const {
  emitLeaderboardEvent,
  publishDomainUpdate,
  publishUserProgressUpdate,
} = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await getDashboardData(req.user.userId, req.query.dateKey);

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    return next(error);
  }
};

const updateDailyQuest = async (req, res, next) => {
  try {
    const updated = await upsertDailyQuest(req.user.userId, req.body || {});

    publishUserProgressUpdate(req.user.userId, {
      profile: updated.profile,
      level: updated.level,
      rank: updated.rank,
      todayQuest: updated.quest,
    });

    emitLeaderboardEvent({
      leaderboard: updated.leaderboard,
      reason: 'daily_quest_update',
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.RPG,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'Daily quest progress updated from another session.',
      metadata: {
        dateKey: updated.quest?.dateKey || '',
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

const getDailyQuestHistory = async (req, res, next) => {
  try {
    const history = await getQuestHistory(req.user.userId, {
      fromDateKey: req.query.fromDateKey,
      toDateKey: req.query.toDateKey,
    });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return next(error);
  }
};

const getAchievements = async (req, res, next) => {
  try {
    const achievements = await getAchievementsData(req.user.userId);

    return res.status(200).json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    return next(error);
  }
};

const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const leaderboard = await getGlobalLeaderboardData(req.user.userId, limit);

    return res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    return next(error);
  }
};

const getQuestDetail = async (req, res, next) => {
  try {
    const profile = await ensureProfileById(req.user.userId);
    const { dateKey } = req.query;

    if (!dateKey) {
      return res.status(400).json({
        success: false,
        error: 'dateKey query parameter is required',
      });
    }

    const quest = await DailyQuest.findOne({
      userId: profile._id,
      dateKey,
    }).lean();

    if (!quest) {
      return res.status(404).json({
        success: false,
        error: 'Quest not found for the specified date',
      });
    }

    return res.status(200).json({
      success: true,
      data: quest,
    });
  } catch (error) {
    return next(error);
  }
};

const getQuestXpOverview = async (req, res, next) => {
  try {
    const { dateKey } = req.query;

    if (!dateKey) {
      return res.status(400).json({
        success: false,
        error: 'dateKey query parameter is required',
      });
    }

    const xpSummary = await getQuestXpSummary(req.user.userId, dateKey);

    return res.status(200).json({
      success: true,
      data: xpSummary,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAchievements,
  getDashboard,
  getDailyQuestHistory,
  getGlobalLeaderboard,
  getQuestDetail,
  getQuestXpOverview,
  updateDailyQuest,
};
