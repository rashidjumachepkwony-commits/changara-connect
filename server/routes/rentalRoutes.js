const express = require('express');
const mongoose = require('mongoose');
const Rental = require('../models/Rental');
const Favorite = require('../models/Favorite');
const Report = require('../models/Report');
const protect = require('../middleware/authMiddleware');
const { requireOwnerOrAdmin } = require('../middleware/adminMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { isValidCategory } = require('../config/categories');
const { buildPagination, paginate, searchFilter, uniqueSlug, toInternational } = require('../utils/helpers');

const router = express.Router();

const uploadImages = upload.array('images', 6);

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const loadRental = async (idOrSlug) => {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Rental.findOne(query);
};
const err500 = (res, err) => {
  console.error('[rental]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 }
};

/**
 * GET /api/rentals - public rentals (APPROVED only).
 * Query: q, propertyType, location, minPrice, maxPrice, sort, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const { q, propertyType, location, minPrice, maxPrice, sort } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED' };
    if (q) filter = { ...filter, ...searchFilter(q, ['title', 'description', 'propertyType', 'location']) };
    if (propertyType) filter.propertyType = propertyType;
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const [total, data] = await Promise.all([
      Rental.countDocuments(filter),
      Rental.find(filter)
        .sort(SORTS[sort] || SORTS.newest)
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
 * GET /api/rentals/my
 */
router.get('/my', protect, async (req, res) => {
  try {
    const data = await Rental.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/rentals/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const rental = await loadRental(req.params.id).populate('owner', 'name phone');
    if (!rental || rental.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Rental not found.' });
    }
    await Rental.updateOne({ _id: rental._id }, { $inc: { views: 1 } });
    res.json({ success: true, data: rental.toObject() });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/rentals - create a rental (PENDING until admin approval).
 */
router.post('/', protect, uploadImages, handleUploadError, async (req, res) => {
  try {
    const b = req.body;
    const title = String(b.title || '').trim();
    const propertyType = String(b.propertyType || '').trim();
    const price = Number(b.price);
    const location = String(b.location || '').trim();
    const description = String(b.description || '').trim();
    const phone = String(b.phone || '').trim();

    if (!title || !propertyType || !location || !description || !phone) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidCategory('rental', propertyType)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid property type.' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid monthly price in KSh.' });
    }
    if (!toInternational(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const rental = await Rental.create({
      owner: req.user._id,
      title,
      slug: await uniqueSlug(title, Rental),
      propertyType,
      price,
      location,
      description,
      rooms: Math.max(Number(b.rooms) || 0, 0),
      images: normalizeImagePaths(req.files),
      phone: toInternational(phone),
      whatsapp: b.whatsapp ? toInternational(b.whatsapp) : toInternational(phone),
      available: b.available === 'false' ? false : true,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Your rental has been submitted and is pending admin approval.',
      data: rental
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * PUT /api/rentals/:id - owner or admin.
 */
router.put('/:id', requireOwnerOrAdmin(async (req) => (await loadRental(req.params.id))?.owner?._id), uploadImages, handleUploadError, async (req, res) => {
  try {
    const rental = await loadRental(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });

    const b = req.body;
    for (const f of ['title', 'propertyType', 'location', 'description']) {
      if (b[f] !== undefined) rental[f] = String(b[f]).trim();
    }
    if (b.price !== undefined) {
      const p = Number(b.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ success: false, message: 'Please enter a valid price.' });
      rental.price = p;
    }
    if (b.rooms !== undefined) rental.rooms = Math.max(Number(b.rooms) || 0, 0);
    if (b.phone) rental.phone = toInternational(b.phone) || rental.phone;
    if (b.whatsapp) rental.whatsapp = toInternational(b.whatsapp) || rental.whatsapp;
    if (b.available !== undefined) rental.available = b.available === 'false' ? false : true;
    if (req.files && req.files.length > 0) rental.images = normalizeImagePaths(req.files);

    if (req.user.role !== 'ADMIN' && rental.status === 'REJECTED') rental.status = 'PENDING';

    await rental.save();
    res.json({ success: true, message: 'Rental updated successfully.', data: rental });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/rentals/:id
 */
router.delete('/:id', requireOwnerOrAdmin(async (req) => (await loadRental(req.params.id))?.owner?._id), async (req, res) => {
  try {
    const rental = await loadRental(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });
    await rental.deleteOne();
    res.json({ success: true, message: 'Rental deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/rentals/:id/favorite
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const rental = await loadRental(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });
    const exists = await Favorite.findOne({ user: req.user._id, itemType: 'rental', itemId: rental._id });
    if (!exists) await Favorite.create({ user: req.user._id, itemType: 'rental', itemId: rental._id });
    res.json({ success: true, message: exists ? 'Rental already saved.' : 'Rental saved to your favourites.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/rentals/:id/report
 */
router.post('/:id/report', protect, async (req, res) => {
  try {
    const rental = await loadRental(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });

    const { reason, description } = req.body || {};
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    await Report.create({
      reporter: req.user._id,
      itemType: 'rental',
      itemId: rental._id,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.' });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;