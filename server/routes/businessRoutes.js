const express = require('express');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Favorite = require('../models/Favorite');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const protect = require('../middleware/authMiddleware');
const { requireOwnerOrAdmin } = require('../middleware/adminMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { isValidCategory } = require('../config/categories');
const { buildPagination, paginate, searchFilter, uniqueSlug, toInternational } = require('../utils/helpers');

const router = express.Router();

// Multer config: 1 logo + up to 6 photos.
const uploadBiz = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'images', maxCount: 6 }
]);

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const loadBusiness = async (idOrSlug) => {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Business.findOne(query).populate('owner', 'name');
};

const canView = (biz, req) =>
  biz.status === 'APPROVED' ||
  (req.user && (String(biz.owner._id) === String(req.user._id) || req.user.role === 'ADMIN'));

const err500 = (res, err) => {
  console.error('[business]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const SORTS = {
  newest: { createdAt: -1 },
  featured: { listingType: -1, createdAt: -1 },
  name: { name: 1 }
};

/**
 * GET /api/businesses
 * Public directory. Only APPROVED listings appear.
 * Query: q, category, location, listingType, sort, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, listingType, sort } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED' };
    if (q) filter = { ...filter, ...searchFilter(q, ['name', 'description', 'category', 'subcategory', 'village', 'location']) };
    if (category) filter.category = category;
    if (req.query.location) {
      filter.location = { $regex: `^${req.query.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
    }
    if (listingType) filter.listingType = listingType;

    const sortOption = SORTS[sort] || SORTS.featured;
    const [total, data] = await Promise.all([
      Business.countDocuments(filter),
      Business.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name')
        .lean()
    ]);

    res.json({ success: true, data, pagination: buildPagination(total, page, limit) });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/businesses/needs/:key
 * Powers the "I NEED SOMETHING" feature by mapping a need to business categories.
 */
router.get('/needs/:key', async (req, res) => {
  try {
    const { NEEDS } = require('../config/categories');
    const need = NEEDS[req.params.key];
    if (!need) return res.status(404).json({ success: false, message: 'Category not found.' });

    const filterByNeed = { status: 'APPROVED' };
    if (need.categories.length > 0) filterByNeed.category = { $in: need.categories };

    const data = await Business.find(filterByNeed)
      .sort({ listingType: -1, createdAt: -1 })
      .limit(30)
      .populate('owner', 'name')
      .lean();
    res.json({ success: true, data, need });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/businesses/my - all listings owned by the logged-in user.
 * NOTE: must be declared before "/:id".
 */
router.get('/my', protect, async (req, res) => {
  try {
    const data = await Business.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate('owner', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/businesses/:id - full public detail (accepts _id or slug).
 */
router.get('/:id', async (req, res) => {
  try {
    const business = await loadBusiness(req.params.id);
    if (!business || !canView(business, req)) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const isOwnerOrAdmin = req.user &&
      (String(business.owner._id) === String(req.user._id) || req.user.role === 'ADMIN');
    if (!isOwnerOrAdmin) {
      await Business.updateOne({ _id: business._id }, { $inc: { views: 1 } });
    }

    const products = await Product.find({ seller: business.owner._id, status: 'APPROVED' })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.json({ success: true, data: { ...business.toObject(), products } });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/businesses - create a new listing.
 * Requires login. Always created with status = PENDING (admin approval).
 */
router.post('/', protect, uploadBiz, handleUploadError, async (req, res) => {
  try {
    const b = req.body;
    const name = String(b.name || '').trim();
    const category = String(b.category || '').trim();
    const phone = String(b.phone || '').trim();
    const description = String(b.description || '').trim();
    const location = String(b.location || '').trim();

    if (!name || !category || !phone || !description || !location) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidCategory('business', category)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid category.' });
    }
    if (!toInternational(phone) || String(phone).replace(/[^\d]/g, '').length < 9) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const services = Array.isArray(b.services)
      ? b.services.filter(Boolean).map((s) => String(s).trim()).slice(0, 20)
      : String(b.services || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20);

    const listing = await Business.create({
      owner: req.user._id,
      name,
      slug: await uniqueSlug(name, Business),
      category,
      subcategory: String(b.subcategory || '').trim(),
      description,
      phone: toInternational(phone),
      whatsapp: b.whatsapp ? toInternational(b.whatsapp) : toInternational(phone),
      email: String(b.email || '').trim().toLowerCase(),
      location,
      village: String(b.village || '').trim(),
      openingHours: String(b.openingHours || '').trim(),
      services,
      logo: req.files && req.files.logo ? normalizeImagePaths(req.files.logo)[0] : null,
      images: normalizeImagePaths(req.files && req.files.images ? req.files.images : null),
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Your business has been submitted successfully and is now pending admin approval.',
      data: listing
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * PUT /api/businesses/:id - owner or admin updates the listing.
 */
router.put('/:id', requireOwnerOrAdmin(async (req) => (await loadBusiness(req.params.id))?.owner?._id), uploadBiz, handleUploadError, async (req, res) => {
  try {
    let listing = await loadBusiness(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Business not found.' });

    const b = req.body;
    const allowed = [
      'name', 'category', 'subcategory', 'description', 'phone', 'whatsapp',
      'email', 'location', 'village', 'openingHours'
    ];
    for (const field of allowed) {
      if (b[field] !== undefined) {
        listing[field] = String(b[field]).trim();
      }
    }
    if (b.phone) listing.phone = toInternational(b.phone) || listing.phone;
    if (b.whatsapp) listing.whatsapp = toInternational(b.whatsapp) || listing.whatsapp;
    if (b.services !== undefined) {
      listing.services = Array.isArray(b.services)
        ? b.services.map((s) => String(s).trim()).filter(Boolean)
        : String(b.services).split(',').map((s) => s.trim()).filter(Boolean);
    }

    const f = req.files || {};
    if (f.logo && f.logo[0]) listing.logo = normalizeImagePaths(f.logo)[0];
    if (f.images && f.images.length > 0) listing.images = normalizeImagePaths(f.images);

    // A rejected listing returns to the review queue when the owner edits it.
    if (req.user.role !== 'ADMIN' && listing.status === 'REJECTED') listing.status = 'PENDING';

    await listing.save();
    res.json({ success: true, message: 'Business updated successfully.', data: listing });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/businesses/:id - owner or admin.
 */
router.delete('/:id', requireOwnerOrAdmin(async (req) => (await loadBusiness(req.params.id))?.owner?._id), async (req, res) => {
  try {
    const listing = await loadBusiness(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Business not found.' });
    await listing.deleteOne();
    res.json({ success: true, message: 'Business deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/businesses/:id/click - count phone / whatsapp clicks.
 * Body: { type: 'phone' | 'whatsapp' }
 */
router.post('/:id/click', async (req, res) => {
  try {
    const type = req.body && req.body.type === 'phone' ? 'phone' : 'whatsapp';
    const field = type === 'phone' ? 'phoneClicks' : 'whatsappClicks';
    const listing = await loadBusiness(req.params.id);
    if (listing) await Business.updateOne({ _id: listing._id }, { $inc: { [field]: 1 } });
    res.json({ success: true });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/businesses/:id/contact - customer sends an inquiry to the owner.
 */
router.post('/:id/contact', protect, async (req, res) => {
  try {
    const listing = await loadBusiness(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Business not found.' });

    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Please write a short message.' });
    }
    await Inquiry.create({
      business: listing._id,
      itemType: 'business',
      itemId: listing._id,
      name: req.user.name,
      phone: req.user.phone,
      message: String(message).trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Your message has been sent. The business will contact you.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/businesses/:id/report
 */
router.post('/:id/report', protect, async (req, res) => {
  try {
    const listing = await loadBusiness(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Business not found.' });

    const { reason, description } = req.body || {};
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    await Report.create({
      reporter: req.user._id,
      itemType: 'business',
      itemId: listing._id,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/businesses/:id/favorite - save a business.
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const listing = await loadBusiness(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Business not found.' });

    const exists = await Favorite.findOne({ user: req.user._id, itemType: 'business', itemId: listing._id });
    if (exists) return res.json({ success: true, message: 'Business already saved.' });

    await Favorite.create({ user: req.user._id, itemType: 'business', itemId: listing._id });
    res.status(201).json({ success: true, message: 'Business saved to your favourites.' });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;