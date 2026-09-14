const express = require('express');
const Advertisement = require('../models/Advertisement');

const router = express.Router();

/**
 * GET /api/advertisements
 * Public: returns ACTIVE advertisements that fall inside their date window.
 * Query: placement (homepage | category | sidebar | sponsored), limit
 */
router.get('/', async (req, res) => {
  try {
    const { placement, limit } = req.query;
    const now = new Date();

    let filter = {
      active: true,
      $and: [
        { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: now } }, { endDate: null }] }
      ]
    };
    if (placement) filter.placement = placement;

    const data = await Advertisement.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 4, 20))
      .populate('business', 'name slug')
      .lean();

    res.json({ success: true, data });
  } catch (err) {
    console.error('[advertisement]', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;