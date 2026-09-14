const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Job = require('../models/Job');
const Rental = require('../models/Rental');
const Notice = require('../models/Notice');
const Inquiry = require('../models/Inquiry');
const Report = require('../models/Report');
const protect = require('../middleware/authMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { toInternational } = require('../utils/helpers');

const router = express.Router();
const uploadProfile = upload.single('profileImage');

const err500 = (res, err, tag = 'user') => {
  console.error(`[${tag}]`, err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const MODELS = {
  business: Business,
  product: Product,
  job: Job,
  rental: Rental,
  notice: Notice
};

/**
 * PUT /api/user/profile - update own profile (optionally profile picture + password).
 */
router.put('/profile', protect, uploadProfile, handleUploadError, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

    const b = req.body;
    if (b.name) user.name = String(b.name).trim();
    if (b.email !== undefined) user.email = String(b.email).trim().toLowerCase();
    if (b.location) user.location = String(b.location).trim();
    if (req.file) user.profileImage = normalizeImagePaths([req.file])[0];

    if (b.currentPassword && b.newPassword) {
      const userWithPassword = await User.findById(user._id).select('+password');
      const ok = await userWithPassword.matchPassword(b.currentPassword);
      if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      if (String(b.newPassword).length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      user.password = String(b.newPassword);
    }

    await user.save();
    res.json({ success: true, message: 'Profile updated successfully.', data: user });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/user/favorites - saved businesses/products/jobs/rentals.
 */
router.get('/favorites', protect, async (req, res) => {
  try {
    const favs = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const grouped = { business: [], product: [], job: [], rental: [] };

    for (const fav of favs) {
      const model = MODELS[fav.itemType];
      if (!model) continue;
      const item = await model.findById(fav.itemId).populate(
        fav.itemType === 'business' ? 'owner name' :
        fav.itemType === 'product' ? 'seller name' : 'name'
      ).lean();
      if (item) grouped[fav.itemType] = grouped[fav.itemType].concat([{ favoriteId: fav._id, item }]);
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/user/favorites - save an item.
 * Body: { itemType, itemId }
 */
router.post('/favorites', protect, async (req, res) => {
  try {
    const { itemType, itemId } = req.body || {};
    const model = MODELS[itemType];
    if (!model) return res.status(400).json({ success: false, message: 'Invalid item type.' });
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item id.' });
    }
    const item = await model.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const exists = await Favorite.findOne({ user: req.user._id, itemType, itemId });
    if (!exists) await Favorite.create({ user: req.user._id, itemType, itemId });

    res.status(exists ? 200 : 201).json({
      success: true,
      message: exists ? 'Item already in your favourites.' : 'Saved to your favourites.',
      saved: true
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/user/favorites/:favoriteId
 */
router.delete('/favorites/:favoriteId', protect, async (req, res) => {
  try {
    const fav = await Favorite.findOne({ _id: req.params.favoriteId, user: req.user._id });
    if (!fav) return res.status(404).json({ success: false, message: 'Saved item not found.' });
    await fav.deleteOne();
    res.json({ success: true, message: 'Removed from your favourites.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/user/listings - every listing the user owns, grouped by section.
 */
router.get('/listings', protect, async (req, res) => {
  try {
    const [businesses, products, jobs, rentals, notices] = await Promise.all([
      Business.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean(),
      Product.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean(),
      Job.find({ poster: req.user._id }).sort({ createdAt: -1 }).lean(),
      Rental.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean(),
      Notice.find({ author: req.user._id }).sort({ createdAt: -1 }).lean()
    ]);

    res.json({
      success: true,
      data: { businesses, products, jobs, rentals, notices }
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/user/inquiries - messages customers sent about the user's businesses.
 * Available to BUSINESS_OWNER and ADMIN.
 */
router.get('/inquiries', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'ADMIN') {
      const bizIds = await Business.find({ owner: req.user._id }).distinct('_id');
      filter = { business: { $in: bizIds } };
    }
    const inquiries = await Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('business', 'name')
      .lean();
    res.json({ success: true, data: inquiries });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/user/reports - report any listing.
 * Body: { itemType, itemId, reason, description }
 */
router.post('/reports', protect, async (req, res) => {
  try {
    const { itemType, itemId, reason, description } = req.body || {};
    const model = MODELS[itemType];
    if (!model) return res.status(400).json({ success: false, message: 'Invalid item type.' });
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item id.' });
    }
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    const item = await model.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    const report = await Report.create({
      reporter: req.user._id,
      itemType,
      itemId,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.', data: report });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;