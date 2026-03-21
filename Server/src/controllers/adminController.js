const {
  deleteAdminUserAndData,
  getAdminOverview,
  getAdminRecentActivity,
  listAdminUsers,
  updateAdminUser,
} = require('../services/adminService');

const getOverview = async (req, res, next) => {
  try {
    const overview = await getAdminOverview({
      leaderboardLimit: Number(req.query.topUsersLimit) || 8,
      windowDays: Number(req.query.windowDays) || 7,
    });

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    return next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const isActive =
      req.query.isActive === 'true'
        ? true
        : req.query.isActive === 'false'
          ? false
          : undefined;

    const users = await listAdminUsers({
      page: req.query.page,
      limit: req.query.limit,
      query: req.query.query,
      role: req.query.role,
      isActive,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return next(error);
  }
};

const patchUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await updateAdminUser(id, req.user.userId, req.body || {});

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAdminUserAndData(id, req.user.userId);

    return res.status(200).json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    return next(error);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const activity = await getAdminRecentActivity({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteUser,
  getOverview,
  getRecentActivity,
  getUsers,
  patchUser,
};
