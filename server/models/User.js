const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Full name is required'], trim: true },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true
    },
    email: { type: String, trim: true, lowercase: true },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['USER', 'BUSINESS_OWNER', 'ADMIN'],
      default: 'USER',
      index: true
    },
    location: { type: String, trim: true },
    profileImage: { type: String },
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Hash the password automatically before saving.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain-text password against the stored hash.
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Remove password from any JSON output.
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.index({ name: 1 });
userSchema.index({ location: 1 });

module.exports = mongoose.model('User', userSchema);