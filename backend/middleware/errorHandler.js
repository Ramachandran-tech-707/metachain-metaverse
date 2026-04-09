const logger = require('../utils/logger');
const { error } = require('../utils/response');

// 404 handler
const notFoundHandler = (req, res, next) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} | ${req.method} ${req.originalUrl}`, err);

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return error(res, 'Duplicate entry — resource already exists', 409);
  }
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return error(res, 'Database table not found — run npm run db:init', 500);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = err.expose ? err.message : 'Internal server error';
  return error(res, message, statusCode);
};

module.exports = { notFoundHandler, errorHandler };
