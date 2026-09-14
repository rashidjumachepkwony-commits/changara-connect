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
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL || 'admin@changaraconnect.co.ke';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const phone = process.env.ADMIN_PHONE || '254700000000';
  const name = process.env.ADMIN_NAME || 'Changara Connect Admin';
  let admin = await User.findOne({ $or: [{ email }, { phone }] });
  if (!admin) {
    admin = await User.create({ name, phone, email, password, role: 'ADMIN', location: 'Changara', verified: true });
    console.log('[seed:admin] Admin created: ' + email);
  } else {
    admin.role = 'ADMIN';
    admin.isActive = true;
    await admin.save();
    console.log('[seed:admin] Admin ensured: ' + (admin.email || admin.phone));
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