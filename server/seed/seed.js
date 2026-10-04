require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Job = require('../models/Job');
const Rental = require('../models/Rental');
const Notice = require('../models/Notice');
const Advertisement = require('../models/Advertisement');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../config/categories');
const { makeSlug } = require('../utils/helpers');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI missing. Copy .env.example to .env first.');
  process.exit(1);
}

const DEMO_IMG = '/assets/images/placeholder.svg';

async function seedCategories() {
  for (const [type, names] of Object.entries(DEFAULT_CATEGORIES)) {
    for (let i = 0; i < names.length; i++) {
      await Category.updateOne({ type, name: names[i] }, { $set: { order: i } }, { upsert: true });
    }
  }
  console.log('[seed] Categories seeded.');
}

/* ===== SEED_DEMO ===== */
async function seedDemo(admin) {
  const hasDemo = await Business.exists({ isDemo: true });
  if (hasDemo) {
    console.log('[seed] Demo data already present. Skipping.');
    return;
  }

  const demoOwner = await User.create({
    name: 'Demo Business Owner (Demo)',
    phone: '254712000001',
    email: 'demo.owner@example.com',
    password: 'Demo1234',
    role: 'BUSINESS_OWNER',
    location: 'Changara'
  });

  const businesses = [
    { name: 'Changara Electronics', category: 'Electronics', location: 'Changara town', village: 'Kocholia', description: 'Demo: affordable TVs, radios and home accessories with repair support.', phone: '254712000101', services: ['TV sales', 'Repairs'], listingType: 'FEATURED', verified: true },
    { name: 'Changara Phone Care', category: 'Phone Shops', location: 'Changara town', village: 'Kocholia', description: 'Demo: phone sales, screen replacement, charging ports and accessories.', phone: '254712000102', services: ['Screen replacement', 'Accessories'], listingType: 'PREMIUM', verified: true },
    { name: 'Star Hardware', category: 'Hardware', location: 'Angurai', village: 'Angurai', description: 'Demo: cement, iron sheets, paint and tools for builders.', phone: '254712000103', services: ['Cement', 'Iron sheets'] },
    { name: 'Changara Fresh Foods', category: 'Restaurants', location: 'Changara town', village: 'Kocholia', description: 'Demo: chapati, mandazi, tea and affordable lunch.', phone: '254712000104', services: ['Lunch', 'Tea'] },
    { name: 'Example Electrician Services', category: 'Electricians', location: 'Malaba', village: 'Malaba', description: 'Demo: house wiring, repairs and solar installation.', phone: '254712000105', services: ['Wiring', 'Solar'] },
    { name: 'Teso Agri Ploughing', category: 'Farm Services', location: 'Kocholia', village: 'Kocholia', description: 'Demo: tractor ploughing, planting and maize shelling.', phone: '254712000106', services: ['Ploughing', 'Planting'] },
    { name: 'Boda Express Changara', category: 'Transport', location: 'Changara town', village: 'Kocholia', description: 'Demo: boda boda and delivery within Teso North.', phone: '254712000107', services: ['Boda rides', 'Parcel delivery'] }
  ];

  for (const b of businesses) {
    await Business.create({
      owner: demoOwner._id,
      name: b.name,
      slug: makeSlug(b.name) + '-demo',
      category: b.category,
      description: b.description,
      phone: b.phone,
      whatsapp: b.phone,
      location: b.location,
      village: b.village,
      openingHours: 'Mon-Sat 8am-6pm',
      services: b.services,
      logo: DEMO_IMG,
      images: [DEMO_IMG],
      status: 'APPROVED',
      listingType: b.listingType || 'FREE',
      verified: Boolean(b.verified),
      isDemo: true
    });
  }
  console.log('[seed] Demo businesses created.');

  const products = [
    { title: 'Samsung Galaxy A13 (Demo)', category: 'Phones', price: 16500, condition: 'Used', location: 'Changara town', description: 'Demo listing: clean 64GB phone with charger.' },
    { title: 'Maize 90kg bag (Demo)', category: 'Farm Produce', price: 5200, condition: 'New', location: 'Kocholia', description: 'Demo listing: dry maize, ready for pickup.' },
    { title: 'Wooden 5-seater sofa (Demo)', category: 'Furniture', price: 24000, condition: 'New', location: 'Angurai', description: 'Demo listing: hardwood sofa made to order.' }
  ];
  for (const p of products) {
    await Product.create({
      seller: demoOwner._id,
      title: p.title,
      slug: makeSlug(p.title),
      category: p.category,
      price: p.price,
      negotiable: true,
      condition: p.condition,
      description: p.description,
      location: p.location,
      phone: '254712000101',
      whatsapp: '254712000101',
      images: [DEMO_IMG],
      status: 'APPROVED',
      isDemo: true
    });
  }
  console.log('[seed] Demo products created.');
/* ===== SEED_REST ===== */
  const ownerId = await User.findOne({ phone: '254712000001' }).then((u) => u._id);

  const jobs = [
    { title: 'Maize harvesting helpers (Demo)', category: 'Farm Work', employer: 'Demo Farm', location: 'Kocholia', salary: 500, salaryType: 'Daily', description: 'Demo job: harvest work for 3 days, lunch provided.' },
    { title: 'Shop attendant (Demo)', category: 'Shop Attendant', employer: 'Demo Duka', location: 'Changara town', salary: 12000, salaryType: 'Monthly', description: 'Demo job: serve customers, keep stock records.' }
  ];
  for (const j of jobs) {
    await Job.create({
      poster: ownerId,
      title: j.title,
      slug: makeSlug(j.title),
      employer: j.employer,
      category: j.category,
      description: j.description,
      location: j.location,
      salary: j.salary,
      salaryType: j.salaryType,
      phone: '254712000101',
      whatsapp: '254712000101',
      status: 'APPROVED',
      isDemo: true
    });
  }
  console.log('[seed] Demo jobs created.');

  await Rental.create({
    owner: ownerId,
    title: '2-bedroom house near market (Demo)',
    slug: '2-bedroom-house-near-market-demo',
    propertyType: 'Houses',
    price: 6500,
    location: 'Changara town',
    description: 'Demo rental: water and electricity available.',
    rooms: 2,
    images: [DEMO_IMG],
    phone: '254712000101',
    whatsapp: '254712000101',
    available: true,
    status: 'APPROVED',
    isDemo: true
  });
  console.log('[seed] Demo rental created.');

  await Notice.create({
    author: admin._id,
    title: 'Welcome to Changara Connect (Demo)',
    category: 'Public Announcements',
    description: 'Demo notice: this is the community noticeboard.',
    location: 'Changara',
    contact: '254700000000',
    image: DEMO_IMG,
    status: 'APPROVED',
    isDemo: true
  });
  console.log('[seed] Demo notice created.');

  await Advertisement.create({
    title: 'Advertise your business here (Demo)',
    description: 'Demo ad: contact the admin to feature your business on the homepage.',
    placement: 'homepage',
    active: true,
    isDemo: true
  });
  console.log('[seed] Demo advertisement created.');
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
  console.log('[seed] Connected to MongoDB.');
  let admin = await User.findOne({ $or: [{ email }, { phone }] });
  if (!admin) {
    admin = await User.create({ name, phone, email, password, role: 'ADMIN', location: 'Changara', verified: true });
    console.log('[seed] Admin account created.');
  } else {
    admin.role = 'ADMIN';
    admin.isActive = true;
    await admin.save();
    console.log('[seed] Admin role ensured.');
  }
  await seedCategories();
  await seedDemo(admin);
  await mongoose.disconnect();
  console.log('[seed] Done.');
}

run().catch((err) => { console.error('[seed]', err.message); process.exit(1); });