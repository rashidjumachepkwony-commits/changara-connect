const express = require('express');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Favorite = require('../models/Favorite');
const Report = require('../models/Report');
const protect = require('../middleware/authMiddleware');
const { requireOwnerOrAdmin } = require('../middleware/adminMiddleware');
const { isValidCategory } = require('../config/categories');
const { buildPagination, paginate, searchFilter, uniqueSlug, toInternational } = require('../utils/helpers');

const router = express.Router();

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const loadJob = async (idOrSlug) => {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Job.findOne(query);
};
const err500 = (res, err) => {
  console.error('[job]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

/**
 * GET /api/jobs - public jobs board (APPROVED only).
 * Query: q, category, location, salaryType, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, location, salaryType } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED' };
    if (q) filter = { ...filter, ...searchFilter(q, ['title', 'description', 'employer', 'category', 'location']) };
    if (category) filter.category = category;
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
    if (salaryType) filter.salaryType = salaryType;

    const [total, data] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('poster', 'name')
        .lean()
    ]);

    res.json({ success: true, data, pagination: buildPagination(total, page, limit) });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/jobs/my - jobs posted by the logged-in user.
 */
router.get('/my', protect, async (req, res) => {
  try {
    const data = await Job.find({ poster: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/jobs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await loadJob(req.params.id).populate('poster', 'name phone');
    if (!job || job.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    await Job.updateOne({ _id: job._id }, { $inc: { views: 1 } });
    res.json({ success: true, data: job.toObject() });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/jobs - create a job (PENDING until admin approval).
 */
router.post('/', protect, async (req, res) => {
  try {
    const b = req.body;
    const title = String(b.title || '').trim();
    const employer = String(b.employer || '').trim();
    const category = String(b.category || '').trim();
    const description = String(b.description || '').trim();
    const location = String(b.location || '').trim();
    const phone = String(b.phone || '').trim();

    if (!title || !employer || !category || !description || !location || !phone) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidCategory('job', category)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid category.' });
    }
    if (!toInternational(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const salary = Number(b.salary);
    const validSalaryTypes = ['Daily', 'Weekly', 'Monthly', 'Negotiable'];
    const salaryType = validSalaryTypes.includes(b.salaryType) ? b.salaryType : 'Negotiable';

    const job = await Job.create({
      poster: req.user._id,
      title,
      slug: await uniqueSlug(title, Job),
      employer,
      category,
      description,
      location,
      salary: isNaN(salary) ? 0 : Math.max(salary, 0),
      salaryType,
      phone: toInternational(phone),
      whatsapp: b.whatsapp ? toInternational(b.whatsapp) : toInternational(phone),
      applicationInstructions: String(b.applicationInstructions || '').trim(),
      closingDate: b.closingDate && !isNaN(Date.parse(b.closingDate)) ? new Date(b.closingDate) : null,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Your job has been submitted and is pending admin approval.',
      data: job
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * PUT /api/jobs/:id - poster or admin.
 */
router.put('/:id', requireOwnerOrAdmin(async (req) => (await loadJob(req.params.id))?.poster?._id), async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const b = req.body;
    for (const f of ['title', 'employer', 'category', 'description', 'location', 'applicationInstructions']) {
      if (b[f] !== undefined) job[f] = String(b[f]).trim();
    }
    if (b.salary !== undefined) {
      const s = Number(b.salary);
      job.salary = isNaN(s) ? job.salary : Math.max(s, 0);
    }
    if (b.salaryType !== undefined) {
      const valid = ['Daily', 'Weekly', 'Monthly', 'Negotiable'];
      if (valid.includes(b.salaryType)) job.salaryType = b.salaryType;
    }
    if (b.phone) job.phone = toInternational(b.phone) || job.phone;
    if (b.whatsapp) job.whatsapp = toInternational(b.whatsapp) || job.whatsapp;
    if (b.closingDate) job.closingDate = new Date(b.closingDate);

    if (req.user.role !== 'ADMIN' && job.status === 'REJECTED') job.status = 'PENDING';

    await job.save();
    res.json({ success: true, message: 'Job updated successfully.', data: job });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/jobs/:id
 */
router.delete('/:id', requireOwnerOrAdmin(async (req) => (await loadJob(req.params.id))?.poster?._id), async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    await job.deleteOne();
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/jobs/:id/favorite
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const exists = await Favorite.findOne({ user: req.user._id, itemType: 'job', itemId: job._id });
    if (!exists) await Favorite.create({ user: req.user._id, itemType: 'job', itemId: job._id });
    res.json({ success: true, message: exists ? 'Job already saved.' : 'Job saved to your favourites.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/jobs/:id/report
 */
router.post('/:id/report', protect, async (req, res) => {
  try {
    const job = await loadJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const { reason, description } = req.body || {};
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    await Report.create({
      reporter: req.user._id,
      itemType: 'job',
      itemId: job._id,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.' });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;