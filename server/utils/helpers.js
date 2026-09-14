const jwt = require('jsonwebtoken');

/**
 * Shared helper functions used across routes and seeders.
 */

// Sign a JWT for a user id.
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Create a URL-safe slug from a listing name e.g. "Changara Electronics" -> "changara-electronics"
const makeSlug = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Escape user input before using it inside a regular expression (prevents regex injection).
const escapeRegex = (text = '') =>
  String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Convert a Kenyan phone number to international format (254XXXXXXXXX).
// Handles: "0712345678", "712345678" and "254712345678".
const toInternational = (number) => {
  if (!number) return null;
  const digits = String(number).replace(/[^\d]/g, '');
  if (digits.length === 9) return `254${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits || null;
};

// Build a WhatsApp deep link: https://wa.me/254XXXXXXXXX?text=...
const waLink = (number, message = null) => {
  const intl = toInternational(number);
  if (!intl) return '#';
  const text =
    message ||
    'Hello, I found your listing on Changara Connect and I would like to know more.';
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
};

// Build a tel: link for "Call Now" buttons.
const telLink = (number) => {
  const intl = toInternational(number);
  return intl ? `tel:+${intl}` : '#';
};

// Parse page and limit from a query string with safe defaults / caps.
const paginate = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

// Build the pagination object returned to the client.
const buildPagination = (total, page, limit) => ({
  page,
  limit,
  pages: Math.max(Math.ceil(total / limit), 1),
  total
});

// Build a search filter across multiple fields: { $or: [{ field: regex }, ...] }
const searchFilter = (search, fields) => {
  const q = String(search || '').trim();
  if (!q) return {};
  const rx = new RegExp(escapeRegex(q), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
};

// Generate a guaranteed-unique URL slug for a listing name.
const uniqueSlug = async (name, Model) => {
  let slug = makeSlug(name);
  if (!slug) slug = 'listing';
  const base = slug;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.findOne({ slug })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
};

module.exports = {
  buildPagination,
  escapeRegex,
  generateToken,
  makeSlug,
  paginate,
  searchFilter,
  telLink,
  toInternational,
  uniqueSlug,
  waLink
};