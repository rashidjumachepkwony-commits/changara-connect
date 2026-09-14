const mongoose = require('mongoose');

// A customer message ("inquiry") sent to a business owner about one of their listings.
const inquirySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },
    itemType: {
      type: String,
      enum: ['business', 'product'],
      default: 'business'
    },
    itemId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: [true, 'Your name is required'], trim: true },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    message: { type: String, required: [true, 'Message is required'], trim: true }
  },
  { timestamps: true }
);

inquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);