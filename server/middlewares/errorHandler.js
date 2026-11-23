/**
 * Global Error Handling middleware.
 * Standardizes API error responses and intelligently handles Mongoose & JWT errors.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid id format for field '${err.path}'.`;
  }

  // 2. Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value entered for unique field: [${fields}]. Please use another value.`;
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    message = `Validation Error: ${errors.join('; ')}`;
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please sign in again.';
  }

  const response = {
    success: false,
    message,
  };

  // Provide details & stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  // Log error internally
  console.error(`[Error] ${req.method} ${req.originalUrl || req.url} [Status ${statusCode}]:`, message);

  res.status(statusCode).json(response);
};

/**
 * Route Not Found middleware.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`API endpoint '${req.originalUrl}' not found.`);
  error.status = 404;
  next(error);
};
