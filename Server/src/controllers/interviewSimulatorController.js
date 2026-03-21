const {
  answerSimulationQuestion,
  createSimulation,
  getSimulationById,
  getSimulationHistory,
} = require('../services/interviewSimulatorService');
const {
  emitLeaderboardEvent,
  publishDomainUpdate,
  publishUserProgressUpdate,
} = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postSimulationStart = async (req, res, next) => {
  try {
    const simulation = await createSimulation(req.user.userId, {
      difficulty: req.body?.difficulty,
      roundType: req.body?.roundType,
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.AI,
      action: REALTIME_ACTIONS.CREATED,
      message: 'An AI interview simulation started in another session.',
      metadata: {
        simulationId: simulation.simulationId,
      },
    });

    return res.status(201).json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    return next(error);
  }
};

const postSimulationAnswer = async (req, res, next) => {
  try {
    const simulation = await answerSimulationQuestion(req.user.userId, req.params.id, {
      answerRichText: req.body?.answerRichText,
      answerCode: req.body?.answerCode,
    });

    if (simulation?.reward?.profile) {
      publishUserProgressUpdate(req.user.userId, {
        profile: simulation.reward.profile,
        level: simulation.reward.level,
        rank: simulation.reward.rank,
        todayQuest: simulation.reward.todayQuest,
      });

      emitLeaderboardEvent({
        leaderboard: simulation.reward.leaderboard,
        reason: 'simulation_completion_reward',
      });

      publishDomainUpdate(req.user.userId, {
        domain: REALTIME_DOMAINS.MOCKS,
        action: REALTIME_ACTIONS.GENERATED,
        message: 'AI simulation completed with quest reward and mock auto-check.',
        metadata: {
          simulationId: simulation.simulationId,
          xpAwarded: simulation.reward.xpAwarded,
        },
      });
    } else {
      publishDomainUpdate(req.user.userId, {
        domain: REALTIME_DOMAINS.AI,
        action: REALTIME_ACTIONS.UPDATED,
        message: 'AI simulation answer submitted from another session.',
        metadata: {
          simulationId: simulation.simulationId,
          questionIndex: simulation.currentQuestionIndex,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    return next(error);
  }
};

const getSimulationHistoryList = async (req, res, next) => {
  try {
    const history = await getSimulationHistory(req.user.userId, {
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return next(error);
  }
};

const getSimulationDetails = async (req, res, next) => {
  try {
    const simulation = await getSimulationById(req.user.userId, req.params.id);

    return res.status(200).json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSimulationDetails,
  getSimulationHistoryList,
  postSimulationAnswer,
  postSimulationStart,
};
