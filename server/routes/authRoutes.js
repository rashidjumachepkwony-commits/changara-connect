const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateToken, toInternational } = require('../utils/helpers');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// Brute-force protection: max 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' }
});

// Validate Kenyan mobile numbers: 0712345678, 712345678, 254712345678
const isValidKenyanPhone = (phone) => {
  const d = String(phone || '').replace(/[^\d]/g, '');
  if (d.length === 9) return /^[17]\d{8}$/.test(d);
  if (d.length === 10) return /^0[17]\d{8}$/.test(d);
  if (d.length === 12) return /^254[17]\d{8}$/.test(d);
  return false;
};

const handleError = (res, err, fallback) => {
  if (err && err.code === 11000) {
    return res.status(409).json({ success: false, message: 'That phone number is already registered.' });
  }
  console.error('[auth]', err.message);
  return res.status(500).json({ success: false, message: fallback || 'Something went wrong. Please try again.' });
};

/**
 * POST /api/auth/register
 * Body: { name, phone, password, role?, location?, email? }
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, phone, password, role, location, email } = req.body || {};

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number. Use a Kenyan number like 0712345678.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const existing = await User.findOne({ phone: { $in: [toInternational(phone), String(phone).trim()] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists. Please log in.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      phone: toInternational(phone),
      email: email ? String(email).trim().toLowerCase() : '',
      password: String(password),
      // Users cannot register as admin through the public API.
      role: role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'USER',
      location: String(location || '').trim()
    });

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      message: 'Your account has been created successfully.',
      data: { token, user }
    });
  } catch (err) {
    return handleError(res, err);
  }
});

/**
 * POST /api/auth/login
 * Body: { phone (or email), password }
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, email, password } = req.body || {};
    const identifier = String(phone || email || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your phone number and password.' });
    }

    const normalized = toInternational(identifier) || identifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { phone: normalized },
        { phone: String(identifier).trim() },
        { email: String(identifier).toLowerCase().trim() }
      ]
    }).select('+password');

    if (!user || !(await user.matchPassword(String(password)))) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
    }

    const token = generateToken(user._id);
    return res.json({ success: true, message: 'Welcome back!', data: { token, user } });
  } catch (err) {
    return handleError(res, err);
  }
});

/**
 * GET /api/auth/me - returns the logged-in user (requires token).
 */
router.get('/me', protect, (req, res) => res.json({ success: true, data: req.user }));

module.exports = router;