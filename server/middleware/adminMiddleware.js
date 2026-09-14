const protect = require('./authMiddleware');

/**
 * requireAdmin - allows only ADMIN accounts.
 */
const requireAdmin = [protect, (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}];

/**
 * requireOwnerOrAdmin - generic guard factory.
 * Pass a resolver function that returns the resource owner's user id:
 *   requireOwnerOrAdmin(async (req) => {
 *     const item = await Model.findById(req.params.id);
 *     return item && item.owner;
 *   })
 */
const requireOwnerOrAdmin = (resolveOwnerId) => [
  protect,
  async (req, res, next) => {
    try {
      if (req.user.role === 'ADMIN') return next();
      const ownerId = await resolveOwnerId(req);
      if (!ownerId) {
        return res.status(404).json({ success: false, message: 'Listing not found.' });
      }
      if (String(ownerId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'You can only manage your own listings.' });
      }
      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
  }
];

module.exports = { requireAdmin, requireOwnerOrAdmin };