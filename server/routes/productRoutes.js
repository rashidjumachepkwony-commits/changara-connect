const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Favorite = require('../models/Favorite');
const Report = require('../models/Report');
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');
const { requireOwnerOrAdmin } = require('../middleware/adminMiddleware');
const { upload, handleUploadError, normalizeImagePaths } = require('../middleware/uploadMiddleware');
const { isValidCategory } = require('../config/categories');
const { buildPagination, paginate, searchFilter, uniqueSlug, toInternational } = require('../utils/helpers');

const router = express.Router();

const uploadImages = upload.array('images', 6);

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const loadProduct = async (idOrSlug) => {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Product.findOne(query);
};
const err500 = (res, err) => {
  console.error('[product]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

const SORTS = {
  newest: { createdAt: -1 },
  featured: { featured: -1, createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 }
};

/**
 * GET /api/products - public marketplace listing (APPROVED only).
 * Query: q, category, location, condition, minPrice, maxPrice, sort, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, location, condition, minPrice, maxPrice, sort, featured } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED' };
    if (q) filter = { ...filter, ...searchFilter(q, ['title', 'description', 'category', 'location']) };
    if (category) filter.category = category;
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
    if (condition) filter.condition = condition;
    if (featured === 'true' || featured === '1') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const [total, data] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(SORTS[sort] || SORTS.featured)
        .skip(skip)
        .limit(limit)
        .populate('seller', 'name')
        .lean()
    ]);

    res.json({ success: true, data, pagination: buildPagination(total, page, limit) });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/products/my - products belonging to the logged-in seller.
 */
router.get('/my', protect, async (req, res) => {
  try {
    const data = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('seller', 'name')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/products/:id - product detail (accepts _id or slug).
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await loadProduct(req.params.id).populate('seller', 'name phone');
    if (!product || product.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    await Product.updateOne({ _id: product._id }, { $inc: { views: 1 } });
    res.json({ success: true, data: product.toObject() });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/products - create a product listing (PENDING until admin approval).
 */
router.post('/', protect, uploadImages, handleUploadError, async (req, res) => {
  try {
    const b = req.body;
    const title = String(b.title || '').trim();
    const category = String(b.category || '').trim();
    const price = Number(b.price);
    const location = String(b.location || '').trim();
    const phone = String(b.phone || '').trim();
    const description = String(b.description || '').trim();

    if (!title || !category || location === '' || !description) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }
    if (!isValidCategory('product', category)) {
      return res.status(400).json({ success: false, message: 'Please choose a valid category.' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid price in KSh.' });
    }
    if (!toInternational(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const product = await Product.create({
      seller: req.user._id,
      title,
      slug: await uniqueSlug(title, Product),
      category,
      price,
      negotiable: b.negotiable === 'true' || b.negotiable === true,
      condition: b.condition === 'New' ? 'New' : 'Used',
      description,
      location,
      phone: toInternational(phone),
      whatsapp: b.whatsapp ? toInternational(b.whatsapp) : toInternational(phone),
      images: normalizeImagePaths(req.files),
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Your product has been submitted and is pending admin approval.',
      data: product
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * PUT /api/products/:id - seller or admin edits the product.
 */
router.put('/:id', requireOwnerOrAdmin(async (req) => (await loadProduct(req.params.id))?.seller?._id), uploadImages, handleUploadError, async (req, res) => {
  try {
    const product = await loadProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const b = req.body;
    for (const f of ['title', 'category', 'description', 'location']) {
      if (b[f] !== undefined) product[f] = String(b[f]).trim();
    }
    if (b.price !== undefined) {
      const p = Number(b.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ success: false, message: 'Please enter a valid price.' });
      product.price = p;
    }
    if (b.negotiable !== undefined) product.negotiable = b.negotiable === 'true' || b.negotiable === true;
    if (b.condition !== undefined) product.condition = b.condition === 'New' ? 'New' : 'Used';
    if (b.phone) product.phone = toInternational(b.phone) || product.phone;
    if (b.whatsapp) product.whatsapp = toInternational(b.whatsapp) || product.whatsapp;
    if (req.files && req.files.length > 0) product.images = normalizeImagePaths(req.files);

    if (req.user.role !== 'ADMIN' && product.status === 'REJECTED') product.status = 'PENDING';

    await product.save();
    res.json({ success: true, message: 'Product updated successfully.', data: product });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * DELETE /api/products/:id - seller or admin.
 */
router.delete('/:id', requireOwnerOrAdmin(async (req) => (await loadProduct(req.params.id))?.seller?._id), async (req, res) => {
  try {
    const product = await loadProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/products/:id/favorite
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const product = await loadProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const exists = await Favorite.findOne({ user: req.user._id, itemType: 'product', itemId: product._id });
    if (!exists) {
      await Favorite.create({ user: req.user._id, itemType: 'product', itemId: product._id });
    }
    res.json({ success: true, message: exists ? 'Product already saved.' : 'Product saved to your favourites.' });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * POST /api/products/:id/report
 */
router.post('/:id/report', protect, async (req, res) => {
  try {
    const product = await loadProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { reason, description } = req.body || {};
    const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please choose a report reason.' });
    }
    await Report.create({
      reporter: req.user._id,
      itemType: 'product',
      itemId: product._id,
      reason,
      description: String(description || '').trim().slice(0, 1000)
    });
    res.status(201).json({ success: true, message: 'Thank you. Our team will review this report.' });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;