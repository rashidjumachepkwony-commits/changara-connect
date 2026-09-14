const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: [true, 'Job title is required'], trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    employer: { type: String, required: [true, 'Employer name is required'], trim: true },
    category: { type: String, required: [true, 'Job category is required'], index: true },
    description: { type: String, required: [true, 'Job description is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true, index: true },
    salary: { type: Number, min: [0, 'Salary cannot be negative'], default: 0 },
    salaryType: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Negotiable'],
      default: 'Negotiable'
    },
    phone: { type: String, required: [true, 'Contact phone is required'], trim: true },
    whatsapp: { type: String, trim: true },
    applicationInstructions: { type: String, trim: true },
    closingDate: { type: Date },
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

jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ salary: 1 });

module.exports = mongoose.model('Job', jobSchema);