import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large', message: 'File terlalu besar' });
    }
    return res.status(400).json({ error: err.message, message: err.message });
  }

  // Custom errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message, message: err.message });
  }

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry', message: 'Data sudah ada' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token', message: 'Token tidak valid' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', message: 'Token sudah kadaluarsa' });
  }

  // Default error
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error',
    message: 'Terjadi kesalahan pada server'
  });
};
