const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    propertyType: {
      type: String,
      required: [true, 'Property type is required'],
      enum: ['Houses', 'Rooms', 'Shops', 'Business Premises', 'Land'],
      index: true
    },
    price: { type: Number, required: [true, 'Monthly price is required'], min: [0, 'Price cannot be negative'] },
    location: { type: String, required: [true, 'Location is required'], trim: true, index: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    rooms: { type: Number, default: 0, min: 0 },
    images: [{ type: String }],
    phone: { type: String, required: [true, 'Contact phone is required'], trim: true },
    whatsapp: { type: String, trim: true },
    available: { type: Boolean, default: true },
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

rentalSchema.index({ title: 'text', description: 'text' });
rentalSchema.index({ createdAt: -1 });
rentalSchema.index({ price: 1 });

module.exports = mongoose.model('Rental', rentalSchema);