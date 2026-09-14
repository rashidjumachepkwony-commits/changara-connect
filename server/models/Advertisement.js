const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Ad title is required'], trim: true },
    image: { type: String },
    description: { type: String, trim: true },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null
    },
    link: { type: String, trim: true },
    placement: {
      type: String,
      enum: ['homepage', 'category', 'sidebar', 'sponsored'],
      default: 'homepage',
      index: true
    },
    startDate: { type: Date },
    endDate: { type: Date },
    active: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

advertisementSchema.index({ active: 1, placement: 1 });

module.exports = mongoose.model('Advertisement', advertisementSchema);