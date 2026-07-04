const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require('express');

// Only these origins may call the API from a browser.
// Add your real domain(s) once hatcm.com is pointed at Netlify.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function applySecurity(app) {
  // Sets a bunch of protective headers (no-sniff, frameguard, HSTS, etc.)
  app.use(helmet());

  // Lock CORS down to known frontend origins only.
  app.use(
    cors({
      origin(origin, callback) {
        // allow same-origin/non-browser requests (no Origin header) and known origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Limit request body size to stop large-payload abuse
  app.use(express.json({ limit: '100kb' }));

  // General rate limit for all API routes
  app.use(
    '/api/',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 min
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again later.' },
    })
  );

  // Stricter limit specifically on the public booking endpoint, which is the
  // most likely target for spam/abuse since it's unauthenticated.
  app.use(
    '/api/bookings',
    rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many booking attempts. Please call the office directly.' },
    })
  );

  // Slows down passcode-guessing on the calendar helper dashboard
  app.use(
    '/api/admin',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many attempts. Please wait a few minutes.' },
    })
  );
}

module.exports = applySecurity;
