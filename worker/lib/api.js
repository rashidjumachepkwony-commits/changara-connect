import bcrypt from 'bcryptjs';
import { restQuery, SupabaseError, supabaseRequest, uploadObject } from '../db/supabase.js';

export const DEFAULT_CATEGORIES = {
  business: [
    'Electronics', 'Phone Shops', 'Computer Services', 'Cyber Services', 'Hardware',
    'Agrovets', 'Restaurants', 'Hotels', 'Clothing', 'Barbers', 'Beauty Salons',
    'Carpenters', 'Welders', 'Electricians', 'Plumbers', 'Mechanics',
    'Motorcycle Services', 'Construction', 'Farm Services', 'Transport',
    'Education', 'Health', 'Professional Services', 'Other'
  ],
  product: [
    'Phones', 'Electronics', 'Furniture', 'Clothing', 'Shoes', 'Farm Produce',
    'Livestock', 'Motorcycles', 'Vehicles', 'Building Materials', 'Household Items', 'Other'
  ],
  job: [
    'Casual Work', 'Farm Work', 'Construction', 'Shop Attendant', 'Domestic Work',
    'Teaching', 'Security', 'Driving', 'Technician', 'Other'
  ],
  rental: ['Houses', 'Rooms', 'Shops', 'Business Premises', 'Land'],
  notice: [
    'Lost & Found', 'Community Events', 'School Notices', 'Church Notices',
    'Public Announcements', 'Meetings', 'Funerals', 'Weddings', 'Other'
  ]
};

export const SERVICE_CATEGORIES = [
  'Phone Shops', 'Computer Services', 'Cyber Services', 'Carpenters', 'Welders',
  'Electricians', 'Plumbers', 'Mechanics', 'Motorcycle Services', 'Construction',
  'Farm Services', 'Transport', 'Health', 'Professional Services', 'Education', 'Electronics'
];

export const NEEDS = {
  'phone-repair': { label: 'Phone Repair', icon: 'mobile-screen', categories: ['Phone Shops', 'Electronics'] },
  computer: { label: 'Computer Services', icon: 'laptop', categories: ['Computer Services'] },
  electrician: { label: 'Electrician', icon: 'bolt', categories: ['Electricians'] },
  plumber: { label: 'Plumber', icon: 'faucet-drip', categories: ['Plumbers'] },
  carpenter: { label: 'Carpenter', icon: 'hammer', categories: ['Carpenters'] },
  construction: { label: 'Construction', icon: 'truck-pickup', categories: ['Construction'] },
  'farm-services': { label: 'Farm Services', icon: 'tractor', categories: ['Farm Services', 'Agrovets'] },
  'house-rental': { label: 'House Rental', icon: 'house', categories: ['Houses'], type: 'rental' },
  transport: { label: 'Transport', icon: 'motorcycle', categories: ['Transport', 'Motorcycle Services'] },
  products: { label: 'Products', icon: 'cart-shopping', categories: [], type: 'product' },
  jobs: { label: 'Jobs', icon: 'briefcase', categories: [], type: 'job' },
  food: { label: 'Food', icon: 'utensils', categories: ['Restaurants', 'Hotels'] },
  'health-services': { label: 'Health Services', icon: 'heart-pulse', categories: ['Health'] },
  education: { label: 'Education', icon: 'graduation-cap', categories: ['Education'] }
};

export const TABLES = {
  businesses: { table: 'businesses', owner: 'owner_id', search: ['name', 'description', 'category', 'subcategory', 'village', 'location'] },
  products: { table: 'products', owner: 'seller_id', search: ['title', 'description', 'category', 'location'] },
  jobs: { table: 'jobs', owner: 'poster_id', search: ['title', 'description', 'category', 'employer', 'location'] },
  rentals: { table: 'rentals', owner: 'owner_id', search: ['title', 'description', 'property_type', 'location'] },
  notices: { table: 'notices', owner: 'author_id', search: ['title', 'description', 'category', 'location'] }
};

const FIELD_ALIASES = {
  businesses: { owner: 'owner_id', openingHours: 'opening_hours', listingType: 'listing_type', featuredUntil: 'featured_until', phoneClicks: 'phone_clicks', whatsappClicks: 'whatsapp_clicks', isDemo: 'is_demo', logo: 'logo_url', images: 'image_urls' },
  products: { seller: 'seller_id', isDemo: 'is_demo' },
  jobs: { poster: 'poster_id', salaryType: 'salary_type', applicationInstructions: 'application_instructions', closingDate: 'closing_date', isDemo: 'is_demo' },
  rentals: { owner: 'owner_id', propertyType: 'property_type', isDemo: 'is_demo' },
  notices: { author: 'author_id', expiryDate: 'expiry_date', isDemo: 'is_demo' },
  users: { isActive: 'is_active', profileImage: 'profile_image', isDemo: 'is_demo' },
  advertisements: { business: 'business_id', startDate: 'start_date', endDate: 'end_date', isDemo: 'is_demo', image: 'image_url', link: 'link_url' },
  categories: {},
  favorites: { user: 'user_id', itemType: 'target_type', itemId: 'target_id' },
  inquiries: { sender: 'sender_id', itemType: 'entity_type', itemId: 'entity_id' },
  reports: { reporter: 'reporter_id', itemType: 'entity_type', itemId: 'entity_id' },
  payments: { user: 'user_id', transactionId: 'transaction_id', mpesaReceipt: 'mpesa_receipt', paymentType: 'payment_type' },
  contacts: {}
};

const toSnake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

export const normalizeRow = (table, row) => {
  if (!row || typeof row !== 'object') return row;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[toCamel(key)] = value;
  }
  if (result.imageUrls !== undefined) result.images = result.imageUrls;
  if (result.logoUrl !== undefined) result.logo = result.logoUrl;
  if (result.imageUrl !== undefined) result.image = result.imageUrl;
  if (result.linkUrl !== undefined) result.link = result.linkUrl;
  if (result.targetType !== undefined) result.itemType = result.targetType;
  if (result.targetId !== undefined) result.itemId = result.targetId;
  if (result.entityType !== undefined) result.itemType = result.entityType;
  if (result.entityId !== undefined) result.itemId = result.entityId;
  if (result.id) result._id = result.id;
  const ownerFields = {
    businesses: 'ownerId',
    products: 'sellerId',
    jobs: 'posterId',
    rentals: 'ownerId',
    notices: 'authorId'
  };
  const ownerField = ownerFields[table];
  if (ownerField && result[ownerField] && !result.owner && !result.seller && !result.poster && !result.author) {
    if (table === 'businesses' || table === 'rentals') result.owner = { _id: result[ownerField], id: result[ownerField] };
    if (table === 'products') result.seller = { _id: result[ownerField], id: result[ownerField] };
    if (table === 'jobs') result.poster = { _id: result[ownerField], id: result[ownerField] };
    if (table === 'notices') result.author = { _id: result[ownerField], id: result[ownerField] };
  }
  return result;
};

export const normalizeRows = (table, rows) => rows.map((row) => normalizeRow(table, row));

export const toDatabaseRow = (table, data) => {
  const aliases = FIELD_ALIASES[table] || {};
  const row = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined || key === '_id' || key === 'id' || key === 'password') continue;
    row[aliases[key] || toSnake(key)] = value;
  }
  return row;
};

export const ok = (data, status = 200, message) => ({
  body: { success: true, ...(message ? { message } : {}), ...(data === undefined ? {} : { data }) },
  status
});

export const fail = (status, message) => ({ body: { success: false, message }, status });

export const pagination = (total, page, limit) => ({
  page,
  limit,
  pages: Math.max(Math.ceil(total / limit), 1),
  total
});

export const parsePage = (url) => {
  const page = Math.max(Number.parseInt(url.searchParams.get('page') || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '12', 10) || 12, 1), 50);
  return { page, limit, offset: (page - 1) * limit };
};

export const escapeSearch = (value) => String(value || '').trim().replace(/[%_*(),]/g, ' ').replace(/\s+/g, ' ').trim();

export const searchFilter = (term, fields) => {
  const clean = escapeSearch(term);
  if (!clean) return null;
  return `or=(${fields.map((field) => `${field}.ilike.*${clean}*`).join(',')})`;
};

export const idFilter = (idOrSlug) => {
  const value = String(idOrSlug || '');
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) {
    return `or=(id.eq.${value},legacy_id.eq.${value},slug.eq.${value})`;
  }
  return `or=(legacy_id.eq.${value},slug.eq.${value})`;
};

export const findRows = async (env, table, params = {}, options = {}) => {
  const result = await restQuery(env, table, { select: '*', ...params }, options);
  return { rows: normalizeRows(table, result.rows), total: result.total };
};

export const findByIdOrSlug = async (env, table, idOrSlug, params = {}) => {
  const tablesWithoutSlugs = new Set(['users', 'advertisements', 'favorites', 'inquiries', 'reports', 'payments', 'contacts']);
  const filter = tablesWithoutSlugs.has(table)
    ? /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(idOrSlug))
      ? `or=(id.eq.${idOrSlug},legacy_id.eq.${idOrSlug})`
      : `legacy_id.eq.${idOrSlug}`
    : idFilter(idOrSlug);
  const result = await findRows(env, table, {
    ...params,
    [filter.slice(0, filter.indexOf('='))]: filter.slice(filter.indexOf('=') + 1),
    limit: 1
  });
  return result.rows[0] || null;
};

export const createRow = async (env, table, data, extra = {}) => {
  const result = await restQuery(env, table, { select: '*', ...extra }, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(toDatabaseRow(table, data))
  });
  return normalizeRow(table, result.rows[0]);
};

export const updateRows = async (env, table, filter, data) => {
  const result = await restQuery(env, table, { select: '*', ...filter }, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(toDatabaseRow(table, data))
  });
  return normalizeRows(table, result.rows);
};

export const deleteRows = async (env, table, filter) => restQuery(env, table, filter, {
  method: 'DELETE',
  headers: { Prefer: 'return=representation' }
});

export const ensureUniqueSlug = async (env, table, name) => {
  const base = String(name || 'listing').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'listing';
  let slug = base;
  let suffix = 1;
  while ((await findRows(env, table, { slug: `eq.${slug}`, select: 'id', limit: 1 })).rows.length) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
};

export const toInternational = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 9) return `254${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  return digits || null;
};

const base64UrlEncode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const base64UrlDecode = (value) => atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));

export const signToken = async (userId, secret, expiresInSeconds = 30 * 24 * 60 * 60) => {
  if (!secret) throw new SupabaseError('JWT_SECRET must be configured as a Worker secret.', 503);
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ id: userId, iat: now, exp: now + expiresInSeconds })));
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return `${input}.${base64UrlEncode(signature)}`;
};

export const verifyToken = async (token, secret) => {
  if (!secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = JSON.parse(base64UrlDecode(headerPart));
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (header.alg !== 'HS256' || !payload.id || Number(payload.exp) <= Math.floor(Date.now() / 1000)) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBytes = Uint8Array.from(base64UrlDecode(signaturePart), (character) => character.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(`${headerPart}.${payloadPart}`));
    return valid ? payload : null;
  } catch {
    return null;
  }
};

export const getUserFromRequest = async (request, env) => {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) return null;
  const filter = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(payload.id))
    ? `or=(id.eq.${payload.id},legacy_id.eq.${payload.id})`
    : `legacy_id=eq.${encodeURIComponent(payload.id)}`;
  const users = await findRows(env, 'users', { [filter.split('=')[0]]: filter.slice(filter.indexOf('=') + 1), limit: 1 });
  const user = users.rows[0];
  return user && user.isActive !== false ? user : null;
};

export const requireUser = async (request, env) => {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: fail(401, 'Not authorised. Please log in.') };
  return { user };
};

export const requireAdminUser = async (request, env) => {
  const result = await requireUser(request, env);
  if (result.error) return result;
  if (result.user.role !== 'ADMIN') return { error: fail(403, 'Admin access is required.') };
  return result;
};

export const parseRequestBody = async (request, env, uploadPrefix = 'listings') => {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const data = {};
    const files = {};
    let fileCount = 0;
    const maximumFiles = uploadPrefix.includes('business') ? 7 : 6;
    for (const [key, value] of form.entries()) {
      if (value instanceof File) {
        if (!value.size) continue;
        fileCount += 1;
        if (fileCount > maximumFiles) throw new SupabaseError(`You can upload a maximum of ${maximumFiles} images.`, 400);
        if (value.size > 5 * 1024 * 1024) throw new SupabaseError('Image is too large. Maximum size is 5 MB.', 400);
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type)) {
          throw new SupabaseError('Only JPG, JPEG, PNG or WEBP images are allowed.', 400);
        }
        if (!files[key]) files[key] = [];
        if (files[key].length >= 6) throw new SupabaseError('You can upload a maximum of 6 images.', 400);
        const upload = await uploadObject(env, value, uploadPrefix);
        files[key].push(upload.url);
      } else {
        if (data[key] !== undefined) {
          data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
        } else {
          data[key] = value;
        }
      }
    }
    return { data, files };
  }
  if (!contentType.includes('application/json')) return { data: {}, files: {} };
  try {
    const body = await request.json();
    return { data: body && typeof body === 'object' && !Array.isArray(body) ? body : {}, files: {} };
  } catch {
    throw new SupabaseError('Invalid JSON request body.', 400);
  }
};

export const hashPassword = async (password) => bcrypt.hash(String(password), 10);
export const comparePassword = async (password, passwordHash) => Boolean(passwordHash) && bcrypt.compare(String(password), passwordHash);

export const enrichOwner = async (env, table, rows, columns = 'name,phone') => {
  const ownerColumn = TABLES[table]?.owner;
  if (!ownerColumn || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((row) => row[ownerColumn === 'owner_id' ? 'ownerId' : ownerColumn === 'seller_id' ? 'sellerId' : 'posterId'] || row.ownerId || row.sellerId || row.posterId || row.authorId).filter(Boolean))];
  if (!ids.length) return rows;
  const users = await findRows(env, 'users', { select: `id,${columns}`, id: `in.(${ids.join(',')})` });
  const byId = new Map(users.rows.map((user) => [user.id, user]));
  return rows.map((row) => {
    const ownerId = row.ownerId || row.sellerId || row.posterId || row.authorId;
    if (!ownerId) return row;
    const field = table === 'products' ? 'seller' : table === 'jobs' ? 'poster' : table === 'notices' ? 'author' : 'owner';
    const user = byId.get(ownerId);
    return { ...row, [field]: user ? { ...user, _id: user.id } : { _id: ownerId, id: ownerId } };
  });
};

export const tableExistsCheck = async (env, table) => {
  await restQuery(env, table, { select: 'id', limit: 0 });
};

export const fromMongoLike = (table, row) => {
  if (!row) return row;
  const normalized = normalizeRow(table, row);
  if (normalized.id && !normalized._id) normalized._id = normalized.id;
  return normalized;
};

export const errorResult = (error) => {
  if (error instanceof SupabaseError) return fail(error.status >= 500 ? 503 : error.status, error.status >= 500 ? 'The database request could not be completed.' : error.message);
  console.error('[worker-api]', error && error.message ? error.message : error);
  return fail(500, 'Something went wrong. Please try again.');
};

export const rowIdFilter = (table, id) => {
  const found = idFilter(id);
  return { [found.slice(0, found.indexOf('='))]: found.slice(found.indexOf('=') + 1) };
};

export const insertReport = async (env, userId, itemType, itemId, body) => {
  const reasons = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
  if (!reasons.includes(body.reason)) return fail(400, 'Please choose a report reason.');
  const resource = { business: 'businesses', product: 'products', job: 'jobs', rental: 'rentals', notice: 'notices' }[itemType];
  if (!resource) return fail(400, 'Invalid item type.');
  const item = await findByIdOrSlug(env, TABLES[resource].table, itemId);
  if (!item) return fail(404, `${itemType[0].toUpperCase()}${itemType.slice(1)} not found.`);
  await createRow(env, 'reports', {
    reporter: userId,
    itemType,
    itemId: item.id,
    reason: body.reason,
    description: String(body.description || '').trim().slice(0, 1000),
    status: 'OPEN'
  });
  return ok(undefined, 201, 'Thank you. Our team will review this report.');
};

export const saveFavorite = async (env, userId, itemType, itemId) => {
  if (!['business', 'product', 'job', 'rental'].includes(itemType)) return fail(400, 'Invalid item type.');
  const table = TABLES[{ business: 'businesses', product: 'products', job: 'jobs', rental: 'rentals' }[itemType]]?.table;
  const item = await findByIdOrSlug(env, table, itemId);
  if (!item) return fail(404, 'Item not found.');
  const existing = await findRows(env, 'favorites', { user_id: `eq.${userId}`, target_type: `eq.${itemType}`, target_id: `eq.${item.id}`, limit: 1 });
  if (existing.rows.length) return ok(undefined, 200, 'Item already in your favourites.');
  await createRow(env, 'favorites', { user: userId, itemType, itemId: item.id });
  return ok({ saved: true }, 201, 'Saved to your favourites.');
};

export const createPublicUpload = async (env, file, prefix) => {
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 5 * 1024 * 1024) throw new SupabaseError('Image is too large. Maximum size is 5 MB.', 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new SupabaseError('Only JPG, JPEG, PNG or WEBP images are allowed.', 400);
  return (await uploadObject(env, file, prefix)).url;
};
