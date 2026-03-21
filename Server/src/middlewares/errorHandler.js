const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    error.statusCode ||
    (error.name === 'ValidationError' ? 400 : null) ||
    (error.name === 'CastError' ? 400 : null) ||
    500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Unexpected server error',
  });
};

module.exports = { errorHandler };
