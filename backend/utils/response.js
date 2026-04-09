/**
 * Standardised API response helpers
 */

const success = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const created = (res, data = {}, message = 'Resource created') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
};

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

const badRequest = (res, message = 'Bad request', details = null) => {
  return error(res, message, 400, details);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

const paginated = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { success, created, error, notFound, badRequest, unauthorized, paginated };
