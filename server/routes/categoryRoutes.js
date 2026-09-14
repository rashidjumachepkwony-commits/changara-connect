const express = require('express');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../config/categories');

const router = express.Router();

/**
 * GET /api/categories
 * Returns every category grouped by section:
 *   { business: [...], product: [...], job: [...], rental: [...], notice: [...] }
 * Uses the seeded Category collection when available, otherwise the defaults.
 */
router.get('/', async (req, res) => {
  try {
    const fromDb = await Category.find({}).sort({ order: 1, name: 1 }).lean();
    const grouped = {
      business: [],
      product: [],
      job: [],
      rental: [],
      notice: []
    };

    for (const c of fromDb) {
      if (grouped[c.type]) grouped[c.type].push(c.name);
    }

    const result = {};
    for (const type of Object.keys(DEFAULT_CATEGORIES)) {
      // Prefer DB values, fall back to defaults for empty sections.
      result[type] = grouped[type].length > 0 ? grouped[type] : DEFAULT_CATEGORIES[type];
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[categories]', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;