const express = require('express');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Job = require('../models/Job');
const Rental = require('../models/Rental');
const Notice = require('../models/Notice');
const { searchFilter } = require('../utils/helpers');

const router = express.Router();

/**
 * GET /api/search?q=phone+repair
 * Lightweight combined search across businesses, products, jobs, rentals, notices.
 * Returns the top 6 matches per section plus a total count.
 */
router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: { businesses: [], products: [], jobs: [], rentals: [], notices: [], total: 0 }
      });
    }

    const filterBiz = {
      ...searchFilter(q, ['name', 'description', 'category', 'subcategory', 'location', 'village']),
      status: 'APPROVED'
    };
    const filterProd = {
      ...searchFilter(q, ['title', 'description', 'category', 'location']),
      status: 'APPROVED'
    };
    const filterJob = {
      ...searchFilter(q, ['title', 'description', 'category', 'employer', 'location']),
      status: 'APPROVED'
    };
    const filterRent = {
      ...searchFilter(q, ['title', 'description', 'propertyType', 'location']),
      status: 'APPROVED'
    };
    const filterNotice = {
      ...searchFilter(q, ['title', 'description', 'category', 'location']),
      status: 'APPROVED'
    };

    const [businesses, products, jobs, rentals, notices] = await Promise.all([
      Business.find(filterBiz).sort({ listingType: -1, createdAt: -1 }).limit(6).lean(),
      Product.find(filterProd).sort({ featured: -1, createdAt: -1 }).limit(6).lean(),
      Job.find(filterJob).sort({ createdAt: -1 }).limit(6).lean(),
      Rental.find(filterRent).sort({ createdAt: -1 }).limit(6).lean(),
      Notice.find(filterNotice).sort({ createdAt: -1 }).limit(6).lean()
    ]);

    const total = businesses.length + products.length + jobs.length + rentals.length + notices.length;

    return res.json({
      success: true,
      data: { businesses, products, jobs, rentals, notices, total, query: q }
    });
  } catch (err) {
    console.error('[search]', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;