const {
  createStory,
  deleteStory,
  getBehavioralAnalytics,
  getRandomPracticeStory,
  getStories,
  getStoryById,
  logPracticeSession,
  updateStory,
} = require('../services/behavioralService');
const { publishDomainUpdate } = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postStory = async (req, res, next) => {
  try {
    const story = await createStory(req.user.userId, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.BEHAVIORAL,
      action: REALTIME_ACTIONS.CREATED,
      message: 'A STAR story was added from another device.',
      metadata: {
        storyId: story?._id || '',
      },
    });

    return res.status(201).json({
      success: true,
      data: story,
    });
  } catch (error) {
    return next(error);
  }
};

const getStoryList = async (req, res, next) => {
  try {
    const stories = await getStories(req.user.userId, {
      search: req.query.search,
      competency: req.query.competency,
      tag: req.query.tag,
      difficulty: req.query.difficulty,
      outcome: req.query.outcome,
      favorite: req.query.favorite,
      minConfidence: req.query.minConfidence,
      maxConfidence: req.query.maxConfidence,
      sortBy: req.query.sortBy,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: stories,
    });
  } catch (error) {
    return next(error);
  }
};

const getStory = async (req, res, next) => {
  try {
    const story = await getStoryById(req.user.userId, req.params.id);

    return res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error) {
    return next(error);
  }
};

const putStory = async (req, res, next) => {
  try {
    const story = await updateStory(req.user.userId, req.params.id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.BEHAVIORAL,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'A STAR story was updated from another device.',
      metadata: {
        storyId: story?._id || req.params.id,
      },
    });

    return res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error) {
    return next(error);
  }
};

const removeStory = async (req, res, next) => {
  try {
    const result = await deleteStory(req.user.userId, req.params.id);

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.BEHAVIORAL,
      action: REALTIME_ACTIONS.DELETED,
      message: 'A STAR story was deleted from another device.',
      metadata: {
        storyId: result?.deletedId || req.params.id,
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

const postPracticeSession = async (req, res, next) => {
  try {
    const result = await logPracticeSession(req.user.userId, req.params.id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.BEHAVIORAL,
      action: REALTIME_ACTIONS.PRACTICED,
      message: 'A behavioral practice session was logged from another device.',
      metadata: {
        storyId: req.params.id,
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

const getRandomPractice = async (req, res, next) => {
  try {
    const randomStory = await getRandomPracticeStory(req.user.userId, {
      difficulty: req.query.difficulty,
      competency: req.query.competency,
      tag: req.query.tag,
      excludeIds: req.query.excludeIds,
      unpracticedFirst: req.query.unpracticedFirst,
    });

    return res.status(200).json({
      success: true,
      data: randomStory,
    });
  } catch (error) {
    return next(error);
  }
};

const getAnalyticsOverview = async (req, res, next) => {
  try {
    const analytics = await getBehavioralAnalytics(req.user.userId);

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAnalyticsOverview,
  getRandomPractice,
  getStory,
  getStoryList,
  postPracticeSession,
  postStory,
  putStory,
  removeStory,
};
