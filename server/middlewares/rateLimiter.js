/**
 * In-memory sliding window rate limiter middleware.
 * Zero external dependency, production-grade memory cleanup.
 */
export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests, please try again later.'
} = {}) => {
  const hits = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leak
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    // Determine client identifier (IP or X-Forwarded-For)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    
    let record = hits.get(ip);
    if (!record || (now - record.startTime > windowMs)) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSec
      });
    }

    next();
  };
};

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15m
  message: 'Too many login attempts. Please try again after 15 minutes.'
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute
  message: 'Too many requests. Please slow down.'
});

export const lostReportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Max 15 SOS reports per 10m per IP
  message: 'Too many lost pilgrim reports submitted from this device. Please wait a few minutes or call Control Room 112.'
});
