const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    itemType: {
      type: String,
      enum: ['business', 'product', 'job', 'rental', 'notice'],
      required: true
    },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'],
      required: true
    },
    description: { type: String, trim: true },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN', index: true }
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);