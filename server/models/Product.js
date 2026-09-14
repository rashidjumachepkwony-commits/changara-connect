const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: [true, 'Product title is required'], trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: [true, 'Category is required'], index: true },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    negotiable: { type: Boolean, default: false },
    condition: { type: String, enum: ['New', 'Used'], default: 'Used' },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true, index: true },
    phone: { type: String, required: [true, 'Contact phone is required'], trim: true },
    whatsapp: { type: String, trim: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true
    },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);