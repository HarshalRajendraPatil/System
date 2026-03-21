const LLDHLDDesign = require('../models/LLDHLDDesign');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById } = require('./rpgService');

const createLLDHLDDesign = async (userId, data) => {
  const { title, designType, content, description, tags, category, difficulty, resources } = data;

  await ensureProfileById(userId);

  if (!userId) {
    throw createHttpError(401, 'Authentication required');
  }

  if (!title || !title.trim()) {
    throw createHttpError(400, 'Design title is required');
  }

  if (!content || !content.trim()) {
    throw createHttpError(400, 'Design content is required');
  }

  const newDesign = new LLDHLDDesign({
    userId,
    title: title.trim(),
    designType: designType || 'Both',
    content: content.trim(),
    description: description?.trim() || '',
    tags: tags?.map((tag) => tag.toLowerCase().trim()).filter(Boolean) || [],
    category: category || 'Other',
    difficulty: difficulty || 'Medium',
    resources: resources || [],
  });

  return await newDesign.save();
};

const getLLDHLDDesigns = async (userId, filters = {}) => {
  await ensureProfileById(userId);

  const { isCompleted, category, designType, difficulty, tag, search, limit = 50, skip = 0 } = filters;

  const query = {};

  if (userId) {
    query.userId = userId;
  }

  if (typeof isCompleted === 'boolean') {
    query.isCompleted = isCompleted;
  }

  if (category && category !== 'All') {
    query.category = category;
  }

  if (designType && designType !== 'All') {
    query.designType = designType;
  }

  if (difficulty && difficulty !== 'All') {
    query.difficulty = difficulty;
  }

  if (tag) {
    query.tags = { $in: [tag.toLowerCase().trim()] };
  }

  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }

  const designs = await LLDHLDDesign.find(query)
    .select('-content')
    .sort({ isCompleted: 1, createdAt: -1 })
    .limit(Number(limit))
    .skip(Number(skip))
    .lean();

  const total = await LLDHLDDesign.countDocuments(query);

  return {
    designs,
    total,
    limit: Number(limit),
    skip: Number(skip),
  };
};

const getLLDHLDDesignById = async (userId, id) => {
  await ensureProfileById(userId);

  if (!id) {
    throw createHttpError(400, 'Design ID is required');
  }

  const design = await LLDHLDDesign.findOne({ _id: id, userId });

  if (!design) {
    throw createHttpError(404, 'Design not found');
  }

  // Update view count and last viewed at
  await LLDHLDDesign.findOneAndUpdate({ _id: id, userId }, {
    $inc: { viewCount: 1 },
    lastViewedAt: new Date(),
  });

  return design;
};

const updateLLDHLDDesign = async (userId, id, data) => {
  await ensureProfileById(userId);

  if (!id) {
    throw createHttpError(400, 'Design ID is required');
  }

  const design = await LLDHLDDesign.findOne({ _id: id, userId });

  if (!design) {
    throw createHttpError(404, 'Design not found');
  }

  const { title, designType, content, description, tags, category, difficulty, resources, notes } = data;

  if (title !== undefined) {
    design.title = title.trim();
  }

  if (designType !== undefined) {
    design.designType = designType;
  }

  if (content !== undefined) {
    design.content = content.trim();
  }

  if (description !== undefined) {
    design.description = description?.trim() || '';
  }

  if (tags !== undefined) {
    design.tags = tags?.map((tag) => tag.toLowerCase().trim()).filter(Boolean) || [];
  }

  if (category !== undefined) {
    design.category = category;
  }

  if (difficulty !== undefined) {
    design.difficulty = difficulty;
  }

  if (resources !== undefined) {
    design.resources = resources || [];
  }

  if (notes !== undefined) {
    design.notes = notes?.trim() || '';
  }

  return await design.save();
};

const toggleLLDHLDCompletion = async (userId, designId) => {

  await ensureProfileById(userId);

  if (!designId) {
    throw createHttpError(400, 'Design ID is required');
  }

  const design = await LLDHLDDesign.findOne({ _id: designId, userId });

  if (!design) {
    throw createHttpError(404, 'Design not found');
  }

  design.isCompleted = !design.isCompleted;
  design.completedAt = design.isCompleted ? new Date() : null;

  return await design.save();
};

const deleteLLDHLDDesign = async (userId, id) => {
  await ensureProfileById(userId);

  if (!id) {
    throw createHttpError(400, 'Design ID is required');
  }

  const result = await LLDHLDDesign.findOneAndDelete({ _id: id, userId });

  if (!result) {
    throw createHttpError(404, 'Design not found');
  }

  return result;
};

const getLLDHLDStats = async (userId) => {
  await ensureProfileById(userId);

  const matchStage = {};

  if (userId) {
    matchStage.userId = userId;
  }

  const stats = await LLDHLDDesign.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDesigns: { $sum: 1 },
        completedDesigns: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] },
        },
        totalByCategory: {
          $push: { category: '$category', count: 1 },
        },
        totalByDifficulty: {
          $push: { difficulty: '$difficulty', count: 1 },
        },
        totalByDesignType: {
          $push: { designType: '$designType', count: 1 },
        },
      },
    },
  ]);

  if (!stats.length) {
    return {
      totalDesigns: 0,
      completedDesigns: 0,
      completionRate: 0,
      byCategory: {},
      byDifficulty: {},
      byDesignType: {},
    };
  }

  const stat = stats[0];
  const completionRate = stat.totalDesigns > 0 ? ((stat.completedDesigns / stat.totalDesigns) * 100).toFixed(2) : 0;

  const categoryMap = {};
  const difficultyMap = {};
  const designTypeMap = {};

  stat.totalByCategory.forEach((item) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + item.count;
  });
  stat.totalByDifficulty.forEach((item) => {
    difficultyMap[item.difficulty] = (difficultyMap[item.difficulty] || 0) + item.count;
  });
  stat.totalByDesignType.forEach((item) => {
    designTypeMap[item.designType] = (designTypeMap[item.designType] || 0) + item.count;
  });

  return {
    totalDesigns: stat.totalDesigns,
    completedDesigns: stat.completedDesigns,
    completionRate: Number(completionRate),
    byCategory: categoryMap,
    byDifficulty: difficultyMap,
    byDesignType: designTypeMap,
  };
};

const getAllUniqueTags = async (userId) => {
  await ensureProfileById(userId);

  const result = await LLDHLDDesign.distinct('tags', { userId });

  return result.sort();
};

module.exports = {
  createLLDHLDDesign,
  getLLDHLDDesigns,
  getLLDHLDDesignById,
  updateLLDHLDDesign,
  toggleLLDHLDCompletion,
  deleteLLDHLDDesign,
  getLLDHLDStats,
  getAllUniqueTags,
};
