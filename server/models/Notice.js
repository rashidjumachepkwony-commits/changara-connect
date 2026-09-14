const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: [true, 'Notice title is required'], trim: true },
    category: {
      type: String,
      required: [true, 'Notice category is required'],
      index: true
    },
    description: { type: String, required: [true, 'Notice description is required'], trim: true },
    location: { type: String, trim: true },
    contact: { type: String, trim: true },
    image: { type: String },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true
    },
    views: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

noticeSchema.index({ title: 'text', description: 'text' });
noticeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);