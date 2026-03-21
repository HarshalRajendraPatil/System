const {
  generateCoachReport,
  getCoachHistory,
  getCoachSnapshot,
  getLatestCoachInsight,
} = require('../services/aiCoachService');
const { AI_COACH_TYPE } = require('../constants/ai');
const { publishDomainUpdate } = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postCoachReport = async (req, res, next) => {
  try {
    const report = await generateCoachReport(req.user.userId, {
      type: AI_COACH_TYPE.FULL_REPORT,
      focusArea: req.body?.focusArea,
      tone: req.body?.tone,
      customPrompt: req.body?.customPrompt,
      temperature: req.body?.temperature,
      maxTokens: req.body?.maxTokens,
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.AI,
      action: REALTIME_ACTIONS.GENERATED,
      message: 'A new AI coaching report was generated from another device.',
      metadata: {
        insightId: report?.insightId || '',
      },
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};

const postMotivation = async (req, res, next) => {
  try {
    const report = await generateCoachReport(req.user.userId, {
      type: AI_COACH_TYPE.MOTIVATION,
      focusArea: req.body?.focusArea,
      tone: req.body?.tone,
      customPrompt: req.body?.customPrompt,
      temperature: req.body?.temperature,
      maxTokens: req.body?.maxTokens,
    });

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.AI,
      action: REALTIME_ACTIONS.GENERATED,
      message: 'A fresh motivation insight was generated from another device.',
      metadata: {
        insightId: report?.insightId || '',
      },
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};

const getInsightHistory = async (req, res, next) => {
  try {
    const history = await getCoachHistory(req.user.userId, {
      limit: req.query.limit,
      type: req.query.type,
    });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return next(error);
  }
};

const getLatestInsight = async (req, res, next) => {
  try {
    const latest = await getLatestCoachInsight(req.user.userId, {
      type: req.query.type,
    });

    return res.status(200).json({
      success: true,
      data: latest,
    });
  } catch (error) {
    return next(error);
  }
};

const getSnapshot = async (req, res, next) => {
  try {
    const snapshot = await getCoachSnapshot(req.user.userId);

    return res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInsightHistory,
  getLatestInsight,
  getSnapshot,
  postCoachReport,
  postMotivation,
};
