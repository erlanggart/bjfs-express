import rateLimit from 'express-rate-limit';

// Global rate limiter - 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter - 10 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Check-auth rate limiter - 20 requests per 5 minutes per IP
export const checkAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: 'Terlalu banyak permintaan verifikasi sesi, silakan refresh halaman.',
  standardHeaders: true,
  legacyHeaders: false,
});
