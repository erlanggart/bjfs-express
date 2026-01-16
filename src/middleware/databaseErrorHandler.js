/**
 * Database Error Handler Middleware
 * Mencegah crash dari database errors dengan graceful error messages
 */

export const handleDatabaseError = (error, res) => {
  // Log error untuk debugging
  console.error('Database Error:', error.message);
  
  // Circuit breaker error
  if (error.message.includes('circuit breaker is OPEN')) {
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'Database service is experiencing issues. Please try again in a minute.',
      code: 'CIRCUIT_BREAKER_OPEN',
      retryAfter: 60
    });
  }
  
  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'Database Connection Failed',
      message: 'Unable to connect to database. Please try again later.',
      code: error.code
    });
  }
  
  // Authentication errors
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({
      error: 'Database Configuration Error',
      message: 'Database authentication failed. Please contact administrator.',
      code: 'AUTH_ERROR'
    });
  }
  
  // Database not found
  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(500).json({
      error: 'Database Not Found',
      message: 'Database does not exist. Please contact administrator.',
      code: 'DB_NOT_FOUND'
    });
  }
  
  // Query syntax errors (development only)
  if (error.code === 'ER_PARSE_ERROR' || error.sqlMessage) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Query Error',
        message: 'An error occurred while processing your request.'
      });
    } else {
      return res.status(500).json({
        error: 'Query Error',
        message: error.sqlMessage || error.message,
        sql: error.sql
      });
    }
  }
  
  // Generic database error
  return res.status(500).json({
    error: 'Database Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred while accessing the database.'
      : error.message
  });
};

/**
 * Async error wrapper untuk routes
 * Automatically catch errors dan prevent crashes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Database errors
      if (error.code || error.sqlMessage || error.message.includes('circuit breaker')) {
        return handleDatabaseError(error, res);
      }
      
      // Pass ke error handler berikutnya
      next(error);
    });
  };
};
