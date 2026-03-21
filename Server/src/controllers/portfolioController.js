const {
  getPortfolioExportData,
  getPortfolioMe,
  getPortfolioPublicBySlug,
  updatePortfolioSettings,
} = require('../services/portfolioService');

const getMyPortfolio = async (req, res, next) => {
  try {
    const data = await getPortfolioMe(req.user.userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const patchMyPortfolioSettings = async (req, res, next) => {
  try {
    const settings = await updatePortfolioSettings(req.user.userId, req.body || {});

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

const getPortfolioExport = async (req, res, next) => {
  try {
    const data = await getPortfolioExportData(req.user.userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getPublicPortfolio = async (req, res, next) => {
  try {
    const data = await getPortfolioPublicBySlug(req.params.slug);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyPortfolio,
  getPortfolioExport,
  getPublicPortfolio,
  patchMyPortfolioSettings,
};