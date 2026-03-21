const {
  createDSAProblem,
  deleteDSAProblem,
  getDSAProblems,
  getDSAStats,
  updateDSAProblem,
} = require('../services/dsaService');
const {
  emitLeaderboardEvent,
  publishDomainUpdate,
  publishUserProgressUpdate,
} = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postDSAProblem = async (req, res, next) => {
  try {
    const result = await createDSAProblem({
      ...(req.body || {}),
      userId: req.user.userId,
    });

    publishUserProgressUpdate(req.user.userId, {
      profile: result.profile,
      level: result.level,
    });

    emitLeaderboardEvent({
      leaderboard: result.leaderboard,
      reason: 'dsa_problem_created',
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.DSA,
      action: REALTIME_ACTIONS.CREATED,
      message: 'A DSA problem was logged from another device.',
      metadata: {
        problemId: result.problem?._id || '',
      },
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const getProblemsList = async (req, res, next) => {
  try {
    const problems = await getDSAProblems({
      userId: req.user.userId,
      difficulty: req.query.difficulty,
      platform: req.query.platform,
      fromDateKey: req.query.fromDateKey,
      toDateKey: req.query.toDateKey,
      tag: req.query.tag,
    });

    return res.status(200).json({
      success: true,
      data: problems,
    });
  } catch (error) {
    return next(error);
  }
};

const getProblemStats = async (req, res, next) => {
  try {
    const stats = await getDSAStats({
      userId: req.user.userId,
      fromDateKey: req.query.fromDateKey,
      toDateKey: req.query.toDateKey,
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
};

const putDSAProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await updateDSAProblem(req.user.userId, id, req.body || {});

    publishUserProgressUpdate(req.user.userId, {
      profile: result.profile,
      level: result.level,
    });

    emitLeaderboardEvent({
      leaderboard: result.leaderboard,
      reason: 'dsa_problem_updated',
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.DSA,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'A DSA problem was updated from another device.',
      metadata: {
        problemId: result.problem?._id || id,
      },
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await deleteDSAProblem(req.user.userId, id);

    publishUserProgressUpdate(req.user.userId, {
      profile: result.profile,
      level: result.level,
    });

    emitLeaderboardEvent({
      leaderboard: result.leaderboard,
      reason: 'dsa_problem_deleted',
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.DSA,
      action: REALTIME_ACTIONS.DELETED,
      message: 'A DSA problem was deleted from another device.',
      metadata: {
        problemId: id,
      },
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteProblem,
  getProblemsList,
  getProblemStats,
  postDSAProblem,
  putDSAProblem,
};
