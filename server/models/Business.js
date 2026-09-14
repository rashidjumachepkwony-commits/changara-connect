const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: [true, 'Business name is required'], trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: [true, 'Category is required'], index: true },
    subcategory: { type: String, trim: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, required: [true, 'Location is required'], trim: true, index: true },
    village: { type: String, trim: true },
    openingHours: { type: String, trim: true },
    services: [{ type: String, trim: true }],
    logo: { type: String },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true
    },
    adminNote: { type: String },
    listingType: {
      type: String,
      enum: ['FREE', 'FEATURED', 'PREMIUM'],
      default: 'FREE',
      index: true
    },
    featuredUntil: { type: Date },
    verified: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    phoneClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

businessSchema.index({ name: 'text', description: 'text' });
businessSchema.index({ createdAt: -1 });
businessSchema.index({ listingType: 1, status: 1 });

module.exports = mongoose.model('Business', businessSchema);