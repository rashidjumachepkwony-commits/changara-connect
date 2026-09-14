/**
 * Default category lists for every section of the platform.
 * These are also seeded into the Category collection (see seed/seed.js)
 * and can be customised later by the admin.
 */
const DEFAULT_CATEGORIES = {
  business: [
    'Electronics', 'Phone Shops', 'Computer Services', 'Cyber Services',
    'Hardware', 'Agrovets', 'Restaurants', 'Hotels', 'Clothing', 'Barbers',
    'Beauty Salons', 'Carpenters', 'Welders', 'Electricians', 'Plumbers',
    'Mechanics', 'Motorcycle Services', 'Construction', 'Farm Services',
    'Transport', 'Education', 'Health', 'Professional Services', 'Other'
  ],
  product: [
    'Phones', 'Electronics', 'Furniture', 'Clothing', 'Shoes', 'Farm Produce',
    'Livestock', 'Motorcycles', 'Vehicles', 'Building Materials', 'Household Items', 'Other'
  ],
  job: [
    'Casual Work', 'Farm Work', 'Construction', 'Shop Attendant',
    'Domestic Work', 'Teaching', 'Security', 'Driving', 'Technician', 'Other'
  ],
  rental: ['Houses', 'Rooms', 'Shops', 'Business Premises', 'Land'],
  notice: [
    'Lost & Found', 'Community Events', 'School Notices', 'Church Notices',
    'Public Announcements', 'Meetings', 'Funerals', 'Weddings', 'Other'
  ]
};

// Business categories that count as "services" (used by the Services page
// and the "I NEED SOMETHING" flow).
const SERVICE_CATEGORIES = [
  'Phone Shops', 'Computer Services', 'Cyber Services', 'Carpenters', 'Welders',
  'Electricians', 'Plumbers', 'Mechanics', 'Motorcycle Services', 'Construction',
  'Farm Services', 'Transport', 'Health', 'Professional Services', 'Education', 'Electronics'
];

// Map for the "I NEED SOMETHING" homepage feature:
// need key -> { label, icon, categories (business categories) }
const NEEDS = {
  'phone-repair': { label: 'Phone Repair', icon: 'mobile-screen', categories: ['Phone Shops', 'Electronics'] },
  'computer': { label: 'Computer Services', icon: 'laptop', categories: ['Computer Services'] },
  'electrician': { label: 'Electrician', icon: 'bolt', categories: ['Electricians'] },
  'plumber': { label: 'Plumber', icon: 'faucet-drip', categories: ['Plumbers'] },
  'carpenter': { label: 'Carpenter', icon: 'hammer', categories: ['Carpenters'] },
  'construction': { label: 'Construction', icon: 'truck-pickup', categories: ['Construction'] },
  'farm-services': { label: 'Farm Services', icon: 'tractor', categories: ['Farm Services', 'Agrovets'] },
  'house-rental': { label: 'House Rental', icon: 'house', categories: ['Houses'], type: 'rental' },
  'transport': { label: 'Transport', icon: 'motorcycle', categories: ['Transport', 'Motorcycle Services'] },
  'products': { label: 'Products', icon: 'cart-shopping', categories: [], type: 'product' },
  'jobs': { label: 'Jobs', icon: 'briefcase', categories: [], type: 'job' },
  'food': { label: 'Food', icon: 'utensils', categories: ['Restaurants', 'Hotels'] },
  'health-services': { label: 'Health Services', icon: 'heart-pulse', categories: ['Health'] },
  'education': { label: 'Education', icon: 'graduation-cap', categories: ['Education'] }
};

const isValidCategory = (type, name) => (DEFAULT_CATEGORIES[type] || []).includes(name);

module.exports = { DEFAULT_CATEGORIES, SERVICE_CATEGORIES, NEEDS, isValidCategory };