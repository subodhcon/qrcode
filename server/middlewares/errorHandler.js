/**
 * Global Error Handling middleware.
 * Standardizes API error responses.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Provide details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  // Log error internally
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  res.status(statusCode).json(response);
};

/**
 * Route Not Found middleware.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};
