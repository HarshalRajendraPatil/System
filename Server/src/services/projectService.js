const Project = require('../models/Project');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById } = require('./rpgService');
const {
  PROJECT_PRIORITY,
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS,
  PROJECT_STATUS_ORDER,
} = require('../constants/projects');

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeStringList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

const validateUrl = (value) => {
  if (!value) {
    return true;
  }

  return /^https?:\/\/.+/.test(String(value).trim());
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeImpact = (impact = {}) => ({
  usersImpacted: Math.max(0, toSafeNumber(impact.usersImpacted, 0)),
  revenueImpact: Math.max(0, toSafeNumber(impact.revenueImpact, 0)),
  performanceGainPercent: Math.max(0, toSafeNumber(impact.performanceGainPercent, 0)),
  timeSavedHours: Math.max(0, toSafeNumber(impact.timeSavedHours, 0)),
  qualityScore: clamp(toSafeNumber(impact.qualityScore, 0), 0, 100),
  adoptionRatePercent: clamp(toSafeNumber(impact.adoptionRatePercent, 0), 0, 100),
  confidence: ['low', 'medium', 'high'].includes(impact.confidence) ? impact.confidence : 'medium',
});

const calculateImpactScore = (impact = {}) => {
  const usersScore = clamp((impact.usersImpacted / 2000) * 30, 0, 30);
  const revenueScore = clamp((impact.revenueImpact / 50000) * 25, 0, 25);
  const performanceScore = clamp((impact.performanceGainPercent / 100) * 15, 0, 15);
  const timeSavedScore = clamp((impact.timeSavedHours / 200) * 10, 0, 10);
  const qualityScore = clamp((impact.qualityScore / 100) * 10, 0, 10);
  const adoptionScore = clamp((impact.adoptionRatePercent / 100) * 10, 0, 10);

  return Number((usersScore + revenueScore + performanceScore + timeSavedScore + qualityScore + adoptionScore).toFixed(2));
};

const normalizeProjectPayload = (payload = {}) => {
  const normalizedStatus = PROJECT_STATUS_ORDER.includes(payload.status) ? payload.status : PROJECT_STATUS.IDEA;
  const normalizedPriority = PROJECT_PRIORITY_ORDER.includes(payload.priority)
    ? payload.priority
    : PROJECT_PRIORITY.MEDIUM;

  const impact = normalizeImpact(payload.impact || {});

  return {
    title: String(payload.title || '').trim(),
    summary: String(payload.summary || '').trim(),
    description: String(payload.description || '').trim(),
    status: normalizedStatus,
    priority: normalizedPriority,
    tags: sanitizeStringList(payload.tags).map((tag) => tag.toLowerCase()),
    techStack: sanitizeStringList(payload.techStack),
    repositoryUrl: String(payload.repositoryUrl || '').trim(),
    demoUrl: String(payload.demoUrl || '').trim(),
    startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
    completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    impact,
    impactScore: calculateImpactScore(impact),
  };
};

const validateProjectPayload = (project) => {
  const errors = [];

  if (!project.title || project.title.length < 3) {
    errors.push('Project title must be at least 3 characters long');
  }

  if (project.repositoryUrl && !validateUrl(project.repositoryUrl)) {
    errors.push('Repository URL must be a valid HTTP/HTTPS URL');
  }

  if (project.demoUrl && !validateUrl(project.demoUrl)) {
    errors.push('Demo URL must be a valid HTTP/HTTPS URL');
  }

  if (project.startedAt && Number.isNaN(project.startedAt.getTime())) {
    errors.push('Invalid start date');
  }

  if (project.targetDate && Number.isNaN(project.targetDate.getTime())) {
    errors.push('Invalid target date');
  }

  if (project.completedAt && Number.isNaN(project.completedAt.getTime())) {
    errors.push('Invalid completed date');
  }

  return errors;
};

const ensureProjectOwnership = async (userId, projectId) => {
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) {
    throw createHttpError(404, 'Project not found or access denied');
  }

  return project;
};

const createProject = async (userId, payload = {}) => {
  await ensureProfileById(userId);

  const normalized = normalizeProjectPayload(payload);
  const validationErrors = validateProjectPayload(normalized);

  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  const kanbanPosition = Date.now();
  const movementHistory = [];

  if (normalized.status === PROJECT_STATUS.IN_PROGRESS && !normalized.startedAt) {
    normalized.startedAt = new Date();
  }

  if (normalized.status === PROJECT_STATUS.SHIPPED && !normalized.completedAt) {
    normalized.completedAt = new Date();
  }

  if (normalized.status !== PROJECT_STATUS.IDEA) {
    movementHistory.push({
      fromStatus: PROJECT_STATUS.IDEA,
      toStatus: normalized.status,
      note: 'Initial placement',
      movedAt: new Date(),
    });
  }

  const project = await Project.create({
    userId,
    ...normalized,
    kanbanPosition,
    movementHistory,
  });

  return project.toObject();
};

const getKanbanBoard = async (userId, filters = {}) => {
  await ensureProfileById(userId);

  const query = { userId };

  if (filters.search && String(filters.search).trim()) {
    query.$text = {
      $search: String(filters.search).trim(),
    };
  }

  if (filters.priority && PROJECT_PRIORITY_ORDER.includes(filters.priority)) {
    query.priority = filters.priority;
  }

  if (filters.tag) {
    query.tags = { $in: [String(filters.tag).trim().toLowerCase()] };
  }

  const projects = await Project.find(query)
    .sort({ kanbanPosition: 1, updatedAt: -1 })
    .lean();

  const columns = PROJECT_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});

  projects.forEach((project) => {
    if (!columns[project.status]) {
      columns[project.status] = [];
    }

    columns[project.status].push(project);
  });

  const summary = {
    totalProjects: projects.length,
    shippedProjects: columns[PROJECT_STATUS.SHIPPED]?.length || 0,
    blockedProjects: columns[PROJECT_STATUS.BLOCKED]?.length || 0,
    avgImpactScore: projects.length
      ? Number((projects.reduce((sum, project) => sum + (project.impactScore || 0), 0) / projects.length).toFixed(2))
      : 0,
  };

  return {
    columns,
    summary,
  };
};

const updateProject = async (userId, projectId, payload = {}) => {
  await ensureProfileById(userId);

  const project = await ensureProjectOwnership(userId, projectId);
  const normalized = normalizeProjectPayload({
    ...project.toObject(),
    ...payload,
    impact: {
      ...(project.impact || {}),
      ...(payload.impact || {}),
    },
  });

  const validationErrors = validateProjectPayload(normalized);
  if (validationErrors.length) {
    throw createHttpError(400, `Validation failed: ${validationErrors.join(', ')}`);
  }

  project.title = normalized.title;
  project.summary = normalized.summary;
  project.description = normalized.description;
  project.priority = normalized.priority;
  project.tags = normalized.tags;
  project.techStack = normalized.techStack;
  project.repositoryUrl = normalized.repositoryUrl;
  project.demoUrl = normalized.demoUrl;
  project.startedAt = normalized.startedAt;
  project.targetDate = normalized.targetDate;
  project.completedAt = normalized.completedAt;
  project.impact = normalized.impact;
  project.impactScore = normalized.impactScore;

  if (payload.status && payload.status !== project.status) {
    if (!PROJECT_STATUS_ORDER.includes(payload.status)) {
      throw createHttpError(400, 'Invalid status transition');
    }

    project.movementHistory.push({
      fromStatus: project.status,
      toStatus: payload.status,
      note: String(payload.transitionNote || '').trim(),
      movedAt: new Date(),
    });

    project.status = payload.status;

    if (payload.status === PROJECT_STATUS.IN_PROGRESS && !project.startedAt) {
      project.startedAt = new Date();
    }

    if (payload.status === PROJECT_STATUS.SHIPPED && !project.completedAt) {
      project.completedAt = new Date();
    }
  }

  const saved = await project.save();
  return saved.toObject();
};

const moveProjectStatus = async (userId, projectId, movement = {}) => {
  await ensureProfileById(userId);

  const project = await ensureProjectOwnership(userId, projectId);
  const toStatus = String(movement.toStatus || '').trim();

  if (!PROJECT_STATUS_ORDER.includes(toStatus)) {
    throw createHttpError(400, 'Invalid target status');
  }

  if (toStatus === project.status) {
    return project.toObject();
  }

  project.movementHistory.push({
    fromStatus: project.status,
    toStatus,
    note: String(movement.note || '').trim(),
    movedAt: new Date(),
  });

  project.status = toStatus;
  project.kanbanPosition = toSafeNumber(movement.kanbanPosition, Date.now());

  if (toStatus === PROJECT_STATUS.IN_PROGRESS && !project.startedAt) {
    project.startedAt = new Date();
  }

  if (toStatus === PROJECT_STATUS.SHIPPED && !project.completedAt) {
    project.completedAt = new Date();
  }

  const saved = await project.save();
  return saved.toObject();
};

const deleteProject = async (userId, projectId) => {
  await ensureProfileById(userId);

  const deleted = await Project.findOneAndDelete({ _id: projectId, userId });

  if (!deleted) {
    throw createHttpError(404, 'Project not found or access denied');
  }

  return {
    deletedId: deleted._id,
  };
};

const getProjectById = async (userId, projectId) => {
  await ensureProfileById(userId);

  const project = await ensureProjectOwnership(userId, projectId);
  return project.toObject();
};

const getProjectMetrics = async (userId) => {
  await ensureProfileById(userId);

  const projects = await Project.find({ userId }).lean();
  const statusBreakdown = PROJECT_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  let totalImpactScore = 0;
  let totalRevenueImpact = 0;
  let totalUsersImpacted = 0;
  let totalTimeSavedHours = 0;
  let cycleCount = 0;
  let cycleDaysTotal = 0;

  projects.forEach((project) => {
    statusBreakdown[project.status] += 1;
    totalImpactScore += project.impactScore || 0;
    totalRevenueImpact += toSafeNumber(project.impact?.revenueImpact, 0);
    totalUsersImpacted += toSafeNumber(project.impact?.usersImpacted, 0);
    totalTimeSavedHours += toSafeNumber(project.impact?.timeSavedHours, 0);

    if (project.startedAt && project.completedAt) {
      cycleCount += 1;
      const durationMs = new Date(project.completedAt).getTime() - new Date(project.startedAt).getTime();
      if (durationMs > 0) {
        cycleDaysTotal += durationMs / (1000 * 60 * 60 * 24);
      }
    }
  });

  const highImpactProjects = projects.filter((project) => (project.impactScore || 0) >= 70).length;

  return {
    totalProjects: projects.length,
    statusBreakdown,
    totalImpactScore: Number(totalImpactScore.toFixed(2)),
    averageImpactScore: projects.length ? Number((totalImpactScore / projects.length).toFixed(2)) : 0,
    highImpactProjects,
    totalRevenueImpact: Number(totalRevenueImpact.toFixed(2)),
    totalUsersImpacted,
    totalTimeSavedHours: Number(totalTimeSavedHours.toFixed(2)),
    averageCycleTimeDays: cycleCount ? Number((cycleDaysTotal / cycleCount).toFixed(2)) : 0,
    throughputShipped: statusBreakdown[PROJECT_STATUS.SHIPPED],
  };
};

module.exports = {
  createProject,
  deleteProject,
  getKanbanBoard,
  getProjectById,
  getProjectMetrics,
  moveProjectStatus,
  updateProject,
};
