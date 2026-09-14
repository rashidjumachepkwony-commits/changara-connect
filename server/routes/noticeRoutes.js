const express = require('express');
const mongoose = require('mongoose');
const Notice = require('../models/Notice');
const Report = require('../models/Report');
const protect = require('../middleware/authMiddleware');
const { requireOwnerOrAdmin } = require('../middleware/adminMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { isValidCategory } = require('../config/categories');
const { buildPagination, paginate, searchFilter, uniqueSlug } = require('../utils/helpers');

const router = express.Router();

const uploadImage = upload.single('image');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const loadNotice = async (idOrSlug) => {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Notice.findOne(query);
};
const err500 = (res, err) => {
  console.error('[notice]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

/**
 * GET /api/notices - public noticeboard (APPROVED + not expired).
 * Query: q, category, location, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, location } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED', $or: [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }] };
    if (q) filter = { ...filter, ...searchFilter(q, ['title', 'description', 'category', 'location']) };
    if (category) filter.category = category;
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };

    const [total, data] = await Promise.all([
      Notice.countDocuments(filter),
      Notice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name')
        .lean()
    ]);

    res.json({ success: true, data, pagination: buildPagination(total, page, limit) });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/notices/my
 */
router.get('/my', protect, async (req, res) => {
  try {
    const data = await Notice.find({ author: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/notices - create a notice (PENDING until admin approval).
 */
router.post('/', protect, uploadImage, handleUploadError, async (req, res) => {
  try {
    const b = req.body;
    const title = String(b.title || '').trim();
    const category = String(b.category || '').trim();
    const description = String(b.description || '').trim();
    const location = String(b.location || '').trim();

    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidCategory('notice', category)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid category.' });
    }

    const notice = await Notice.create({
      author: req.user._id,
      title,
      slug: await uniqueSlug(title, Notice),
      category,
      description,
      location,
      contact: String(b.contact || '').trim(),
      image: req.file ? normalizeImagePaths([req.file])[0] : null,
      expiryDate: b.expiryDate && !isNaN(Date.parse(b.expiryDate)) ? new Date(b.expiryDate) : null,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Your notice has been submitted and is pending admin approval.',
      data: notice
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/notices/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const notice = await loadNotice(req.params.id).populate('author', 'name');
    if (!notice || notice.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Notice not found.' });
    }
    await Notice.updateOne({ _id: notice._id }, { $inc: { views: 1 } });
    res.json({ success: true, data: notice.toObject() });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * PUT /api/notices/:id - author or admin.
 */
router.put('/:id', requireOwnerOrAdmin(async (req) => (await loadNotice(req.params.id))?.author?._id), uploadImage, handleUploadError, async (req, res) => {
  try {
    const notice = await loadNotice(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found.' });

    const b = req.body;
    for (const f of ['title', 'category', 'description', 'location', 'contact']) {
      if (b[f] !== undefined) notice[f] = String(b[f]).trim();
    }
    if (b.expiryDate) notice.expiryDate = new Date(b.expiryDate);
    if (req.file) notice.image = normalizeImagePaths([req.file])[0];

    if (req.user.role !== 'ADMIN' && notice.status === 'REJECTED') notice.status = 'PENDING';

    await notice.save();
    res.json({ success: true, message: 'Notice updated successfully.', data: notice });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/notices/:id
 */
router.delete('/:id', requireOwnerOrAdmin(async (req) => (await loadNotice(req.params.id))?.author?._id), async (req, res) => {
  try {
    const notice = await loadNotice(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found.' });
    await notice.deleteOne();
    res.json({ success: true, message: 'Notice deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/notices/:id/report
 */
router.post('/:id/report', protect, async (req, res) => {
  try {
    const notice = await loadNotice(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found.' });

    const { reason, description } = req.body || {};
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    await Report.create({
      reporter: req.user._id,
      itemType: 'notice',
      itemId: notice._id,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.' });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;