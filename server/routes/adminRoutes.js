const express = require('express');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Job = require('../models/Job');
const Rental = require('../models/Rental');
const Notice = require('../models/Notice');
const Advertisement = require('../models/Advertisement');
const Category = require('../models/Category');
const Report = require('../models/Report');
const Payment = require('../models/Payment');
const { requireAdmin } = require('../middleware/adminMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { searchFilter } = require('../utils/helpers');

const router = express.Router();
router.use(requireAdmin);

const err500 = (res, err, tag = 'admin') => {
  console.error('[admin]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const VALID_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const VALID_REASONS = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];

/* ------------------------------------------------------------------
 * GET /api/admin/dashboard - headline stats and analytics
 * ------------------------------------------------------------------ */
router.get('/dashboard', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalBusinesses,
      pendingBusinesses,
      totalProducts,
      pendingProducts,
      totalJobs,
      pendingJobs,
      totalRentals,
      pendingRentals,
      totalNotices,
      pendingNotices,
      activeAds,
      openReports,
      usersToday,
      businessesToday,
      listingsToday,
      jobsToday,
      featuredRevenue,
      popularCategories,
      topBusinesses
    ] = await Promise.all([
      User.countDocuments({}),
      Business.countDocuments({}),
      Business.countDocuments({ status: 'PENDING' }),
      Product.countDocuments({}),
      Product.countDocuments({ status: 'PENDING' }),
      Job.countDocuments({}),
      Job.countDocuments({ status: 'PENDING' }),
      Rental.countDocuments({}),
      Rental.countDocuments({ status: 'PENDING' }),
      Notice.countDocuments({}),
      Notice.countDocuments({ status: 'PENDING' }),
      Advertisement.countDocuments({ active: true }),
      Report.countDocuments({ status: 'OPEN' }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      Business.countDocuments({ createdAt: { $gte: startOfDay } }),
      Product.countDocuments({ createdAt: { $gte: startOfDay } }) +
        Job.countDocuments({ createdAt: { $gte: startOfDay } }) +
        Rental.countDocuments({ createdAt: { $gte: startOfDay } }) +
        Notice.countDocuments({ createdAt: { $gte: startOfDay } }),
      Job.countDocuments({ createdAt: { $gte: startOfDay } }),
      Payment.aggregate([
        { $match: { status: 'SUCCESS', paymentType: { $in: ['featured', 'premium'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Business.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Business.find({})
        .sort({ views: -1 })
        .limit(5)
        .select('name category views listingType slug')
        .lean()
    ]);

res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          businesses: totalBusinesses,
          products: totalProducts,
          jobs: totalJobs,
          rentals: totalRentals,
          notices: totalNotices,
          activeAds,
          openReports
        },
        pending: {
          businesses: pendingBusinesses,
          products: pendingProducts,
          jobs: pendingJobs,
          rentals: pendingRentals,
          notices: pendingNotices,
          total: pendingBusinesses + pendingProducts + pendingJobs + pendingRentals + pendingNotices
        },
        today: {
          users: usersToday,
          businesses: businessesToday,
          listings: listingsToday,
          jobs: jobsToday
        },
        featuredRevenue: featuredRevenue.length > 0 ? featuredRevenue[0].total : 0,
        popularCategories,
        topBusinesses
      }
    });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * GET /api/admin/pending - everything waiting for approval
 * ------------------------------------------------------------------ */
router.get('/pending', async (req, res) => {
  try {
    const [businesses, products, jobs, rentals, notices] = await Promise.all([
      Business.find({ status: 'PENDING' }).sort({ createdAt: -1 }).populate('owner', 'name phone').lean(),
      Product.find({ status: 'PENDING' }).sort({ createdAt: -1 }).populate('seller', 'name phone').lean(),
      Job.find({ status: 'PENDING' }).sort({ createdAt: -1 }).populate('poster', 'name phone').lean(),
      Rental.find({ status: 'PENDING' }).sort({ createdAt: -1 }).populate('owner', 'name phone').lean(),
      Notice.find({ status: 'PENDING' }).sort({ createdAt: -1 }).populate('author', 'name phone').lean()
    ]);

    const total = businesses.length + products.length + jobs.length + rentals.length + notices.length;
    res.json({
      success: true,
      data: {
        total,
        counts: {
          businesses: businesses.length,
          products: products.length,
          jobs: jobs.length,
          rentals: rentals.length,
          notices: notices.length
        },
        businesses,
        products,
        jobs,
        rentals,
        notices
      }
    });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Users
 * ------------------------------------------------------------------ */
router.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      };
    }
    const data = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (role && ['USER', 'BUSINESS_OWNER', 'ADMIN'].includes(role)) user.role = role;
    await user.save();
    res.json({ success: true, message: 'User updated.', data: user });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Businesses - list & moderations
 * ------------------------------------------------------------------ */
router.get('/businesses', async (req, res) => {
  try {
    const { status, q } = req.query;
    let filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (q) filter = { ...filter, ...searchFilter(q, ['name', 'category', 'location', 'description']) };
    const data = await Business.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('owner', 'name phone')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/businesses/:id/status', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found.' });

    biz.status = status;
    if (adminNote !== undefined) biz.adminNote = String(adminNote).trim().slice(0, 500);
    await biz.save();

    const msg = status === 'APPROVED' ? 'Business approved and now visible publicly.' :
      status === 'REJECTED' ? 'Business rejected.' :
        status === 'SUSPENDED' ? 'Business suspended.' : 'Business returned to pending.';
    res.json({ success: true, message: msg, data: biz });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/businesses/:id/feature', async (req, res) => {
  try {
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found.' });

    const { listingType, featuredUntil } = req.body;
    if (['FREE', 'FEATURED', 'PREMIUM'].includes(listingType)) {
      biz.listingType = listingType;
      biz.featuredUntil = listingType === 'FREE' ? null : (featuredUntil ? new Date(featuredUntil) : null);
    }
    await biz.save();
    res.json({ success: true, message: `Listing type set to ${biz.listingType}.`, data: biz });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/businesses/:id/verify', async (req, res) => {
  try {
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found.' });
    biz.verified = !biz.verified;
    await biz.save();
    res.json({ success: true, message: biz.verified ? 'Business verified.' : 'Verification removed.', data: biz });
  } catch (err) {
    err500(res, err);
  }
});

router.delete('/businesses/:id', async (req, res) => {
  try {
    const biz = await Business.findById(req.params.id);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found.' });
    await biz.deleteOne();
    res.json({ success: true, message: 'Business deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Marketplace - products
 * ------------------------------------------------------------------ */
router.get('/products', async (req, res) => {
  try {
    const { status, q } = req.query;
    let filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (q) filter = { ...filter, ...searchFilter(q, ['title', 'category', 'location']) };
    const data = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('seller', 'name phone')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found.' });
    item.status = status;
    await item.save();
    res.json({ success: true, message: `Product ${status.toLowerCase()}.`, data: item });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/products/:id/feature', async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found.' });
    item.featured = !item.featured;
    await item.save();
    res.json({ success: true, message: item.featured ? 'Product featured.' : 'Feature removed.', data: item });
  } catch (err) {
    err500(res, err);
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found.' });
    await item.deleteOne();
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Jobs / Rentals / Notices - shared list, status & delete handlers
 * ------------------------------------------------------------------ */
const buildSimpleResource = (Model, label, populateField, searchFields) => ({
  list: async (req, res) => {
    try {
      const { status, q } = req.query;
      let filter = {};
      if (status && status !== 'ALL') filter.status = status;
      if (q) filter = { ...filter, ...searchFilter(q, searchFields) };
      const data = await Model.find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .populate(populateField, 'name phone')
        .lean();
      res.json({ success: true, data });
    } catch (err) {
      err500(res, err);
    }
  },
  status: async (req, res) => {
    try {
      const { status } = req.body;
      if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${label} not found.` });
      item.status = status;
      await item.save();
      res.json({ success: true, message: `${label} ${status.toLowerCase()}.`, data: item });
    } catch (err) {
      err500(res, err);
    }
  },
  remove: async (req, res) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${label} not found.` });
      await item.deleteOne();
      res.json({ success: true, message: `${label} deleted.` });
    } catch (err) {
      err500(res, err);
    }
  }
});

const jobs = buildSimpleResource(Job, 'Job', 'poster', ['title', 'category', 'location', 'employer']);
router.get('/jobs', jobs.list);
router.patch('/jobs/:id/status', jobs.status);
router.delete('/jobs/:id', jobs.remove);

const rentals = buildSimpleResource(Rental, 'Rental', 'owner', ['title', 'propertyType', 'location']);
router.get('/rentals', rentals.list);
router.patch('/rentals/:id/status', rentals.status);
router.delete('/rentals/:id', rentals.remove);

const notices = buildSimpleResource(Notice, 'Notice', 'author', ['title', 'category', 'location']);
router.get('/notices', notices.list);
router.patch('/notices/:id/status', notices.status);
router.delete('/notices/:id', notices.remove);

/* ------------------------------------------------------------------
 * Advertisements
 * ------------------------------------------------------------------ */
router.get('/ads', async (req, res) => {
  try {
    const data = await Advertisement.find({}).sort({ createdAt: -1 }).populate('business', 'name').lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.post('/ads', upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const b = req.body;
    const title = String(b.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'Ad title is required.' });

    const ad = await Advertisement.create({
      title,
      description: String(b.description || '').trim(),
      link: String(b.link || '').trim(),
      placement: ['homepage', 'category', 'sidebar', 'sponsored'].includes(b.placement) ? b.placement : 'homepage',
      image: req.file ? normalizeImagePaths([req.file])[0] : null,
      business: b.business ? b.business : null,
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
      active: b.active === 'true' || b.active === true
    });
    res.status(201).json({ success: true, message: 'Advertisement created.', data: ad });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/ads/:id', upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found.' });
    const b = req.body;
    if (b.title !== undefined) ad.title = String(b.title).trim();
    if (b.description !== undefined) ad.description = String(b.description).trim();
    if (b.link !== undefined) ad.link = String(b.link).trim();
    if (b.placement !== undefined && ['homepage', 'category', 'sidebar', 'sponsored'].includes(b.placement)) ad.placement = b.placement;
    if (b.active !== undefined) ad.active = b.active === 'true' || b.active === true;
    if (b.startDate) ad.startDate = new Date(b.startDate);
    if (b.endDate) ad.endDate = new Date(b.endDate);
    if (req.file) ad.image = normalizeImagePaths([req.file])[0];
    await ad.save();
    res.json({ success: true, message: 'Advertisement updated.', data: ad });
  } catch (err) {
    err500(res, err);
  }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Advertisement not found.' });
    await ad.deleteOne();
    res.json({ success: true, message: 'Advertisement deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------ */
router.get('/categories', async (req, res) => {
  try {
    const data = await Category.find({}).sort({ type: 1, order: 1, name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !['business', 'product', 'job', 'rental', 'notice'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Please provide a name and a valid type.' });
    }
    const exists = await Category.findOne({ name: name.trim(), type });
    if (exists) return res.status(409).json({ success: false, message: 'This category already exists.' });
    const cat = await Category.create({ name: String(name).trim(), type });
    res.status(201).json({ success: true, message: 'Category created.', data: cat });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/categories/:id', async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    if (req.body.name) cat.name = String(req.body.name).trim();
    if (req.body.order !== undefined) cat.order = Number(req.body.order);
    await cat.save();
    res.json({ success: true, message: 'Category updated.', data: cat });
  } catch (err) {
    err500(res, err);
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    await cat.deleteOne();
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Reports
 * ------------------------------------------------------------------ */
router.get('/reports', async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status && status !== 'ALL') filter.status = status;
    const data = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('reporter', 'name phone')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

router.patch('/reports/:id/resolve', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    report.status = report.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    await report.save();
    res.json({ success: true, message: `Report marked ${report.status.toLowerCase()}.`, data: report });
  } catch (err) {
    err500(res, err);
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    await report.deleteOne();
    res.json({ success: true, message: 'Report deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/* ------------------------------------------------------------------
 * Payments (M-Pesa ready - version 1 only lists manual records)
 * ------------------------------------------------------------------ */
router.get('/payments', async (req, res) => {
  try {
    const data = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'name phone')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;