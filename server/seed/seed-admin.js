require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../config/categories');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI missing. Copy .env.example to .env first.');
  process.exit(1);
}

async function run() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE?.trim();
  const name = process.env.ADMIN_NAME?.trim();
  if (!email || !password || !phone || !name) {
    throw new Error('Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE and ADMIN_NAME before running this seed.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  let admin = await User.findOne({ $or: [{ email }, { phone }] });
  if (!admin) {
    admin = await User.create({ name, phone, email, password, role: 'ADMIN', location: 'Changara', verified: true });
    console.log('[seed:admin] Admin account created.');
  } else {
    admin.role = 'ADMIN';
    admin.isActive = true;
    await admin.save();
    console.log('[seed:admin] Admin role ensured.');
  }
  for (const [type, names] of Object.entries(DEFAULT_CATEGORIES)) {
    for (let i = 0; i < names.length; i++) {
      await Category.updateOne({ type, name: names[i] }, { $set: { order: i } }, { upsert: true });
    }
  }
  console.log('[seed:admin] Categories seeded.');
  await mongoose.disconnect();
}

run().catch((err) => { console.error('[seed:admin]', err.message); process.exit(1); });