const {
  createProject,
  deleteProject,
  getKanbanBoard,
  getProjectById,
  getProjectMetrics,
  moveProjectStatus,
  updateProject,
} = require('../services/projectService');
const { publishDomainUpdate } = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postProject = async (req, res, next) => {
  try {
    const project = await createProject(req.user.userId, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.PROJECTS,
      action: REALTIME_ACTIONS.CREATED,
      message: 'A project was created from another device.',
      metadata: {
        projectId: project?._id || '',
      },
    });

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
};

const getKanban = async (req, res, next) => {
  try {
    const board = await getKanbanBoard(req.user.userId, {
      search: req.query.search,
      priority: req.query.priority,
      tag: req.query.tag,
    });

    return res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    return next(error);
  }
};

const getMetrics = async (req, res, next) => {
  try {
    const metrics = await getProjectMetrics(req.user.userId);

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const project = await getProjectById(req.user.userId, req.params.id);

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
};

const putProject = async (req, res, next) => {
  try {
    const updated = await updateProject(req.user.userId, req.params.id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.PROJECTS,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'A project was updated from another device.',
      metadata: {
        projectId: updated?._id || req.params.id,
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

const patchMoveProject = async (req, res, next) => {
  try {
    const moved = await moveProjectStatus(req.user.userId, req.params.id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.PROJECTS,
      action: REALTIME_ACTIONS.MOVED,
      message: 'A project stage moved from another device.',
      metadata: {
        projectId: moved?._id || req.params.id,
        status: moved?.status || '',
      },
    });

    return res.status(200).json({
      success: true,
      data: moved,
    });
  } catch (error) {
    return next(error);
  }
};

const removeProject = async (req, res, next) => {
  try {
    const result = await deleteProject(req.user.userId, req.params.id);

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.PROJECTS,
      action: REALTIME_ACTIONS.DELETED,
      message: 'A project was deleted from another device.',
      metadata: {
        projectId: result?.deletedId || req.params.id,
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
  getKanban,
  getMetrics,
  getProject,
  patchMoveProject,
  postProject,
  putProject,
  removeProject,
};
