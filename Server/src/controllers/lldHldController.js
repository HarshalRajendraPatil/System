const {
  createLLDHLDDesign,
  getLLDHLDDesigns,
  getLLDHLDDesignById,
  updateLLDHLDDesign,
  toggleLLDHLDCompletion,
  deleteLLDHLDDesign,
  getLLDHLDStats,
  getAllUniqueTags,
} = require('../services/lldHldService');
const { publishDomainUpdate } = require('../realtime/publisher');
const { REALTIME_ACTIONS, REALTIME_DOMAINS } = require('../constants/realtime');

const postLLDHLDDesign = async (req, res, next) => {
  try {
    const result = await createLLDHLDDesign(req.user.userId, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.LLD_HLD,
      action: REALTIME_ACTIONS.CREATED,
      message: 'An LLD/HLD entry was created from another device.',
      metadata: {
        designId: result?._id || '',
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

const getLLDHLDDesignsList = async (req, res, next) => {
  try {
    const result = await getLLDHLDDesigns(req.user.userId, {
      isCompleted: req.query.isCompleted === 'true' ? true : req.query.isCompleted === 'false' ? false : undefined,
      category: req.query.category,
      designType: req.query.designType,
      difficulty: req.query.difficulty,
      tag: req.query.tag,
      search: req.query.search,
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const getLLDHLDDesignDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const design = await getLLDHLDDesignById(req.user.userId, id);

    return res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error) {
    return next(error);
  }
};

const putLLDHLDDesign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await updateLLDHLDDesign(req.user.userId, id, req.body || {});

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.LLD_HLD,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'An LLD/HLD entry was updated from another device.',
      metadata: {
        designId: result?._id || id,
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

const patchLLDHLDCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await toggleLLDHLDCompletion(req.user.userId, id);

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.LLD_HLD,
      action: REALTIME_ACTIONS.UPDATED,
      message: 'LLD/HLD completion status changed from another device.',
      metadata: {
        designId: result?._id || id,
        isCompleted: Boolean(result?.isCompleted),
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

const deleteLLDHLDDesignItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await deleteLLDHLDDesign(req.user.userId, id);

    publishDomainUpdate(req.user.userId, {
      domain: REALTIME_DOMAINS.LLD_HLD,
      action: REALTIME_ACTIONS.DELETED,
      message: 'An LLD/HLD entry was deleted from another device.',
      metadata: {
        designId: result?._id || id,
      },
    });

    return res.status(200).json({
      success: true,
      data: { message: 'Design deleted successfully', deletedId: result._id },
    });
  } catch (error) {
    return next(error);
  }
};

const getLLDHLDDesignStats = async (req, res, next) => {
  try {
    const stats = await getLLDHLDStats(req.user.userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
};

const getLLDHLDTags = async (req, res, next) => {
  try {
    const tags = await getAllUniqueTags(req.user.userId);

    return res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  postLLDHLDDesign,
  getLLDHLDDesignsList,
  getLLDHLDDesignDetail,
  putLLDHLDDesign,
  patchLLDHLDCompletion,
  deleteLLDHLDDesignItem,
  getLLDHLDDesignStats,
  getLLDHLDTags,
};
