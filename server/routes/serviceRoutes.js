const express = require('express');
const Business = require('../models/Business');
const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Job = require('../models/Job');
const { SERVICE_CATEGORIES } = require('../config/categories');
const { buildPagination, paginate, searchFilter } = require('../utils/helpers');

const router = express.Router();

const err500 = (res, err) => {
  console.error('[services]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

/**
 * GET /api/services
 * Returns APPROVED businesses in the service categories (electricians,
 * plumbers, transport, farm services, health, etc.).
 *
 * Query: q, category, location, service (transport|farm), sort, page, limit
 *   - service=transport filters to Transport + Motorcycle Services
 *   - service=farm filters to Farm Services + Agrovets
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, location, service, sort } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED' };

    if (service === 'transport') {
      filter.category = { $in: ['Transport', 'Motorcycle Services'] };
    } else if (service === 'farm') {
      filter.category = { $in: ['Farm Services', 'Agrovets'] };
    } else if (category) {
      filter.category = category;
    } else {
      filter.category = { $in: SERVICE_CATEGORIES };
    }

    if (q) filter = { ...filter, ...searchFilter(q, ['name', 'description', 'category', 'subcategory', 'location']) };
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };

    const sortOption = sort === 'newest' ? { createdAt: -1 } : { listingType: -1, createdAt: -1 };

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
 * GET /api/services/farm - convenience endpoint for the Farm Services section.
 * Returns farm produce & livestock products plus farm businesses.
 */
router.get('/farm', async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);

    const bizFilter = {
      status: 'APPROVED',
      category: { $in: ['Farm Services', 'Agrovets'] }
    };
    const prodFilter = {
      status: 'APPROVED',
      category: { $in: ['Farm Produce', 'Livestock'] }
    };

    const [businesses, total, products] = await Promise.all([
      Business.find(bizFilter).sort({ listingType: -1, createdAt: -1 }).limit(limit).populate('owner', 'name').lean(),
      Business.countDocuments(bizFilter),
      Product.find(prodFilter).sort({ createdAt: -1 }).limit(9).lean()
    ]);

    res.json({
      success: true,
      data: { businesses, products },
      pagination: buildPagination(total, page, limit)
    });
  } catch (err) {
    err500(res, err);
  }
});

/**
 * GET /api/services/transport - convenience endpoint for the Transport section.
 * Returns transport providers (businesses) only.
 */
router.get('/transport', async (req, res) => {
  try {
    const { q, location } = req.query;
    const { page, limit, skip } = paginate(req.query);

    let filter = { status: 'APPROVED', category: { $in: ['Transport', 'Motorcycle Services'] } };
    if (q) filter = { ...filter, ...searchFilter(q, ['name', 'description', 'location']) };
    if (location) filter.location = { $regex: `^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };

    const [total, data] = await Promise.all([
      Business.countDocuments(filter),
      Business.find(filter)
        .sort({ listingType: -1, createdAt: -1 })
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
 * GET /api/services/needs/:needKey
 * Used by "I NEED SOMETHING" for service-style needs across businesses,
 * rentals and products.
 */
router.get('/needs/:needKey', async (req, res) => {
  try {
    const { NEEDS } = require('../config/categories');
    const need = NEEDS[req.params.needKey];
    if (!need) return res.status(404).json({ success: false, message: 'Category not found.' });

    let data = {
      businesses: [],
      rentals: [],
      products: [],
      jobs: []
    };

    if (need.type === 'rental') {
      data.rentals = await Rental.find({ status: 'APPROVED', propertyType: need.categories[0] })
        .sort({ createdAt: -1 }).limit(20).lean();
    } else if (need.type === 'product') {
      data.products = await Product.find({ status: 'APPROVED' })
        .sort({ featured: -1, createdAt: -1 }).limit(20).lean();
    } else if (need.type === 'job') {
      data.jobs = await Job.find({ status: 'APPROVED' })
        .sort({ createdAt: -1 }).limit(20).lean();
    } else if (need.categories.length > 0) {
      data.businesses = await Business.find({ status: 'APPROVED', category: { $in: need.categories } })
        .sort({ listingType: -1, createdAt: -1 }).limit(20).populate('owner', 'name').lean();
    }

    res.json({ success: true, data, need });
  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;