const {
  createMockLog,
  deleteMockLog,
  getCalendarData,
  getMockLogs,
  getTrendAnalytics,
  updateMockLog,
} = require('../services/mockService');
const { publishDomainUpdate } = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postMockLog = async (req, res, next) => {
  try {
    const mock = await createMockLog(req.user.userId, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.MOCKS,
      action: REALTIME_ACTIONS.CREATED,
      message: 'A mock interview log was added from another device.',
      metadata: {
        mockId: mock?._id || '',
      },
    });

    return res.status(201).json({
      success: true,
      data: mock,
    });
  } catch (error) {
    return next(error);
  }
};

const getMockLogList = async (req, res, next) => {
  try {
    const logs = await getMockLogs(req.user.userId, {
      fromDateKey: req.query.fromDateKey,
      toDateKey: req.query.toDateKey,
      format: req.query.format,
      interviewerType: req.query.interviewerType,
      weakness: req.query.weakness,
      search: req.query.search,
      minScore: req.query.minScore,
      maxScore: req.query.maxScore,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return next(error);
  }
};

const putMockLog = async (req, res, next) => {
  try {
    const updated = await updateMockLog(req.user.userId, req.params.id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.MOCKS,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'A mock interview log was updated from another device.',
      metadata: {
        mockId: updated?._id || req.params.id,
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

const removeMockLog = async (req, res, next) => {
  try {
    const deleted = await deleteMockLog(req.user.userId, req.params.id);

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.MOCKS,
      action: REALTIME_ACTIONS.DELETED,
      message: 'A mock interview log was deleted from another device.',
      metadata: {
        mockId: deleted?.deletedId || req.params.id,
      },
    });

    return res.status(200).json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    return next(error);
  }
};

const getMockCalendar = async (req, res, next) => {
  try {
    const calendar = await getCalendarData(req.user.userId, req.query.month);

    return res.status(200).json({
      success: true,
      data: calendar,
    });
  } catch (error) {
    return next(error);
  }
};

const getMockTrends = async (req, res, next) => {
  try {
    const trends = await getTrendAnalytics(req.user.userId, req.query.rangeDays);

    return res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMockCalendar,
  getMockLogList,
  getMockTrends,
  postMockLog,
  putMockLog,
  removeMockLog,
};
