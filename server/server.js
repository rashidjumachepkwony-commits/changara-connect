require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const rateLimit = require('express-rate-limit');

// ------------------------------------------------------------
// 0. Basic environment validation
// ------------------------------------------------------------
if (!process.env.MONGODB_URI) {
  console.error('✗ MONGODB_URI is missing. Copy .env.example to .env and set your MongoDB connection string.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_secret') {
  console.warn = console.warn || console.log;
  console.warn('⚠ JWT_SECRET is using the default value. Set a long random secret in your .env file before deploying.');
}

// ------------------------------------------------------------
// 1. Express app + database
// ------------------------------------------------------------
const app = express();
connectDB();

// ------------------------------------------------------------
// 2. Security / parsing / uploads middleware
// ------------------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple security headers (no external dependency).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Serve uploaded images (local storage mode).
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// Global API rate limit (1000 requests / 15 minutes per IP) as a safety net.
// Mounted BEFORE the routes so it covers every /api request.
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
}));

// ------------------------------------------------------------
// 3. Routes (API)
// ------------------------------------------------------------
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/rentals', require('./routes/rentalRoutes'));
app.use('/api/notices', require('./routes/noticeRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/advertisements', require('./routes/advertisementRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

// Quick health check.
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Changara Connect API is running.', time: new Date().toISOString() });
});

// ------------------------------------------------------------
// 4. Serve the PWA frontend (production = single deployable app)
// ------------------------------------------------------------
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir, { maxAge: '1h' }));

// ------------------------------------------------------------
// 5. 404 + error handling
// ------------------------------------------------------------
// Unknown API routes -> JSON 404
app.use('/api/', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Client 404 -> friendly HTML fallback page (if present)
app.use((req, res, next) => {
  if (req.method !== 'GET' || String(req.path || '').startsWith('/api/')) return next();
  const notFound = path.join(clientDir, '404.html');
  if (fs.existsSync(notFound)) {
    return res.status(404).sendFile(notFound);
  }
  next();
});

// Global error handler - never leak raw server errors to users.
app.use((err, req, res, next) => {
  console.error('[server]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
});

// ------------------------------------------------------------
// 6. Start
// ------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│        CHANGARA CONNECT  v1.0.0            │');
  console.log('│   Find It. Connect Locally. Grow Together. │');
  console.log('└─────────────────────────────────────────────┘');
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] API:    http://localhost:${PORT}/api/health`);
});