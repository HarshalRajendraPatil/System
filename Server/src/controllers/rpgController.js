const {
  getDashboardData,
  getQuestHistory,
  upsertDailyQuest,
} = require('../services/rpgService');
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

module.exports = {
  getDashboard,
  getDailyQuestHistory,
  updateDailyQuest,
};
