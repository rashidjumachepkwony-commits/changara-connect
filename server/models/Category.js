const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    // Category name exactly as shown to users, e.g. "Electronics" or "Phones"
    name: { type: String, required: true, trim: true },
    // Which section the category belongs to
    type: {
      type: String,
      required: true,
      enum: ['business', 'product', 'job', 'rental', 'notice'],
      index: true
    },
    order: { type: Number, default: 0 },
    icons: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// One name per type only once.
categorySchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);