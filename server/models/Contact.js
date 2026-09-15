const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: [true, 'Message is required'], trim: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
