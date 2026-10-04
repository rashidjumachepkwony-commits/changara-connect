import {
  DEFAULT_CATEGORIES,
  NEEDS,
  SERVICE_CATEGORIES,
  TABLES,
  comparePassword,
  createPublicUpload,
  createRow,
  deleteRows,
  ensureUniqueSlug,
  enrichOwner,
  errorResult,
  fail,
  findByIdOrSlug,
  findRows,
  getUserFromRequest,
  hashPassword,
  idFilter,
  insertReport,
  normalizeRows,
  ok,
  pagination,
  parsePage,
  parseRequestBody,
  requireAdminUser,
  requireUser,
  rowIdFilter,
  saveFavorite,
  searchFilter,
  signToken,
  toDatabaseRow,
  toInternational,
  updateRows
} from '../lib/api.js';
import { checkSupabaseConnection, restQuery } from '../db/supabase.js';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const REPORT_REASONS = ['Spam', 'Scam', 'Wrong information', 'Duplicate', 'Inappropriate content', 'Other'];
const RESOURCE_NAMES = Object.keys(TABLES);

const routeRows = [
  ['GET', '/api/health', 'health', 'none'],
  ['POST', '/api/auth/register', 'register', 'public'],
  ['POST', '/api/auth/login', 'login', 'public'],
  ['GET', '/api/auth/me', 'currentUser', 'user'],
  ['GET', '/api/businesses', 'listBusinesses', 'public'],
  ['GET', '/api/businesses/needs/:key', 'businessesByNeed', 'public'],
  ['GET', '/api/businesses/my', 'myBusinesses', 'user'],
  ['GET', '/api/businesses/:id', 'getBusiness', 'optional-user'],
  ['POST', '/api/businesses', 'createBusiness', 'user'],
  ['PUT', '/api/businesses/:id', 'updateBusiness', 'owner-or-admin'],
  ['DELETE', '/api/businesses/:id', 'deleteBusiness', 'owner-or-admin'],
  ['POST', '/api/businesses/:id/click', 'businessClick', 'public'],
  ['POST', '/api/businesses/:id/contact', 'contactBusiness', 'user'],
  ['POST', '/api/businesses/:id/report', 'reportBusiness', 'user'],
  ['POST', '/api/businesses/:id/favorite', 'favoriteBusiness', 'user'],
  ['GET', '/api/products', 'listProducts', 'public'],
  ['GET', '/api/products/my', 'myProducts', 'user'],
  ['GET', '/api/products/:id', 'getProduct', 'public'],
  ['POST', '/api/products', 'createProduct', 'user'],
  ['PUT', '/api/products/:id', 'updateProduct', 'owner-or-admin'],
  ['DELETE', '/api/products/:id', 'deleteProduct', 'owner-or-admin'],
  ['POST', '/api/products/:id/favorite', 'favoriteProduct', 'user'],
  ['POST', '/api/products/:id/report', 'reportProduct', 'user'],
  ['GET', '/api/jobs', 'listJobs', 'public'],
  ['GET', '/api/jobs/my', 'myJobs', 'user'],
  ['GET', '/api/jobs/:id', 'getJob', 'public'],
  ['POST', '/api/jobs', 'createJob', 'user'],
  ['PUT', '/api/jobs/:id', 'updateJob', 'owner-or-admin'],
  ['DELETE', '/api/jobs/:id', 'deleteJob', 'owner-or-admin'],
  ['POST', '/api/jobs/:id/favorite', 'favoriteJob', 'user'],
  ['POST', '/api/jobs/:id/report', 'reportJob', 'user'],
  ['GET', '/api/rentals', 'listRentals', 'public'],
  ['GET', '/api/rentals/my', 'myRentals', 'user'],
  ['GET', '/api/rentals/:id', 'getRental', 'public'],
  ['POST', '/api/rentals', 'createRental', 'user'],
  ['PUT', '/api/rentals/:id', 'updateRental', 'owner-or-admin'],
  ['DELETE', '/api/rentals/:id', 'deleteRental', 'owner-or-admin'],
  ['POST', '/api/rentals/:id/favorite', 'favoriteRental', 'user'],
  ['POST', '/api/rentals/:id/report', 'reportRental', 'user'],
  ['GET', '/api/notices', 'listNotices', 'public'],
  ['GET', '/api/notices/my', 'myNotices', 'user'],
  ['POST', '/api/notices', 'createNotice', 'user'],
  ['GET', '/api/notices/:id', 'getNotice', 'public'],
  ['PUT', '/api/notices/:id', 'updateNotice', 'owner-or-admin'],
  ['DELETE', '/api/notices/:id', 'deleteNotice', 'owner-or-admin'],
  ['POST', '/api/notices/:id/report', 'reportNotice', 'user'],
  ['GET', '/api/services', 'listServices', 'public'],
  ['GET', '/api/services/farm', 'farmServices', 'public'],
  ['GET', '/api/services/transport', 'transportServices', 'public'],
  ['GET', '/api/services/needs/:needKey', 'servicesByNeed', 'public'],
  ['GET', '/api/advertisements', 'publicAdvertisements', 'public'],
  ['GET', '/api/categories', 'publicCategories', 'public'],
  ['GET', '/api/search', 'searchAll', 'public'],
  ['PUT', '/api/user/profile', 'updateProfile', 'user'],
  ['GET', '/api/user/favorites', 'userFavorites', 'user'],
  ['POST', '/api/user/favorites', 'addUserFavorite', 'user'],
  ['DELETE', '/api/user/favorites/:favoriteId', 'removeUserFavorite', 'user'],
  ['GET', '/api/user/listings', 'userListings', 'user'],
  ['GET', '/api/user/inquiries', 'userInquiries', 'user'],
  ['POST', '/api/user/reports', 'createUserReport', 'user'],
  ['POST', '/api/contact', 'submitContact', 'public'],
  ['GET', '/api/admin/dashboard', 'adminDashboard', 'admin'],
  ['GET', '/api/admin/pending', 'adminPending', 'admin'],
  ['GET', '/api/admin/users', 'adminUsers', 'admin'],
  ['PATCH', '/api/admin/users/:id', 'adminUpdateUser', 'admin'],
  ['GET', '/api/admin/businesses', 'adminBusinesses', 'admin'],
  ['PATCH', '/api/admin/businesses/:id/status', 'adminBusinessStatus', 'admin'],
  ['PATCH', '/api/admin/businesses/:id/feature', 'adminBusinessFeature', 'admin'],
  ['PATCH', '/api/admin/businesses/:id/verify', 'adminBusinessVerify', 'admin'],
  ['DELETE', '/api/admin/businesses/:id', 'adminDeleteBusiness', 'admin'],
  ['GET', '/api/admin/products', 'adminProducts', 'admin'],
  ['PATCH', '/api/admin/products/:id/status', 'adminProductStatus', 'admin'],
  ['PATCH', '/api/admin/products/:id/feature', 'adminProductFeature', 'admin'],
  ['DELETE', '/api/admin/products/:id', 'adminDeleteProduct', 'admin'],
  ['GET', '/api/admin/jobs', 'adminJobs', 'admin'],
  ['PATCH', '/api/admin/jobs/:id/status', 'adminJobStatus', 'admin'],
  ['DELETE', '/api/admin/jobs/:id', 'adminDeleteJob', 'admin'],
  ['GET', '/api/admin/rentals', 'adminRentals', 'admin'],
  ['PATCH', '/api/admin/rentals/:id/status', 'adminRentalStatus', 'admin'],
  ['DELETE', '/api/admin/rentals/:id', 'adminDeleteRental', 'admin'],
  ['GET', '/api/admin/notices', 'adminNotices', 'admin'],
  ['PATCH', '/api/admin/notices/:id/status', 'adminNoticeStatus', 'admin'],
  ['DELETE', '/api/admin/notices/:id', 'adminDeleteNotice', 'admin'],
  ['GET', '/api/admin/ads', 'adminAds', 'admin'],
  ['POST', '/api/admin/ads', 'adminCreateAd', 'admin'],
  ['PATCH', '/api/admin/ads/:id', 'adminUpdateAd', 'admin'],
  ['DELETE', '/api/admin/ads/:id', 'adminDeleteAd', 'admin'],
  ['GET', '/api/admin/categories', 'adminCategories', 'admin'],
  ['POST', '/api/admin/categories', 'adminCreateCategory', 'admin'],
  ['PATCH', '/api/admin/categories/:id', 'adminUpdateCategory', 'admin'],
  ['DELETE', '/api/admin/categories/:id', 'adminDeleteCategory', 'admin'],
  ['GET', '/api/admin/reports', 'adminReports', 'admin'],
  ['PATCH', '/api/admin/reports/:id/resolve', 'adminResolveReport', 'admin'],
  ['DELETE', '/api/admin/reports/:id', 'adminDeleteReport', 'admin'],
  ['GET', '/api/admin/payments', 'adminPayments', 'admin']
];

export const ROUTE_INVENTORY = routeRows.map(([method, route, handler, auth]) => ({
  method, route, handler, auth
}));

const routeRegex = (template) => new RegExp(`^${template.split('/').map((part) =>
  part.startsWith(':') ? '([^/]+)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
).join('/')}/?$`);

const compiledRoutes = routeRows.map(([method, template, handler, auth]) => ({
  method,
  template,
  handler,
  auth,
  regex: routeRegex(template),
  paramNames: template.split('/').filter((part) => part.startsWith(':')).map((part) => part.slice(1))
})).sort((a, b) => b.template.split('/').length - a.template.split('/').length);

const json = (result, headers = new Headers()) => {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(result.body), { status: result.status || 200, headers });
};

const errorResponse = (error) => json(errorResult(error));
const dbTable = (resource) => TABLES[resource].table;
const getParamId = (context) => context.params.id;
const paramFilter = (id) => {
  const filter = idFilter(id);
  return { [filter.slice(0, filter.indexOf('='))]: filter.slice(filter.indexOf('=') + 1) };
};
const resourcePath = (resource) => `/api/${resource}`;

const getWithOwner = async (env, resource, id, filters = {}) => {
  const row = await findByIdOrSlug(env, dbTable(resource), id, filters);
  if (!row) return null;
  return (await enrichOwner(env, resource, [row], 'name,phone'))[0];
};

const findById = async (env, table, id, filters = {}) => findByIdOrSlug(env, table, id, filters);

const readBody = async (request, env, prefix) => parseRequestBody(request, env, prefix);

const createResource = async (context, resource, user) => {
  const { data: body, files } = context.body;
  const table = dbTable(resource);
  const specs = {
    businesses: {
      required: ['name', 'category', 'phone', 'description', 'location'],
      titleField: 'name',
      ownerField: 'owner',
      message: 'Your business has been published successfully.',
      payload: () => ({
        name: String(body.name || '').trim(),
        category: String(body.category || '').trim(),
        subcategory: String(body.subcategory || '').trim(),
        description: String(body.description || '').trim(),
        phone: toInternational(body.phone),
        whatsapp: body.whatsapp ? toInternational(body.whatsapp) : toInternational(body.phone),
        email: String(body.email || '').trim().toLowerCase(),
        location: String(body.location || '').trim(),
        village: String(body.village || '').trim(),
        openingHours: String(body.openingHours || '').trim(),
        services: (Array.isArray(body.services) ? body.services : String(body.services || '').split(',')).map((value) => String(value).trim()).filter(Boolean).slice(0, 20),
        logo: (files.logo || [])[0] || null,
        images: files.images || [],
        status: 'APPROVED'
      })
    },
    products: {
      required: ['title', 'category', 'price', 'location', 'description', 'phone'],
      titleField: 'title',
      ownerField: 'seller',
      message: 'Your product has been submitted and is pending admin approval.',
      payload: () => ({
        title: String(body.title || '').trim(),
        name: String(body.title || '').trim(),
        category: String(body.category || '').trim(),
        price: Number(body.price),
        negotiable: body.negotiable === 'true' || body.negotiable === true,
        condition: body.condition === 'New' ? 'New' : 'Used',
        description: String(body.description || '').trim(),
        location: String(body.location || '').trim(),
        phone: toInternational(body.phone),
        whatsapp: body.whatsapp ? toInternational(body.whatsapp) : toInternational(body.phone),
        images: files.images || [],
        status: 'PENDING'
      })
    },
    jobs: {
      required: ['title', 'employer', 'category', 'description', 'location', 'phone'],
      titleField: 'title',
      ownerField: 'poster',
      message: 'Your job has been submitted and is pending admin approval.',
      payload: () => ({
        title: String(body.title || '').trim(),
        employer: String(body.employer || '').trim(),
        category: String(body.category || '').trim(),
        description: String(body.description || '').trim(),
        location: String(body.location || '').trim(),
        salary: Math.max(Number(body.salary) || 0, 0),
        salaryType: ['Daily', 'Weekly', 'Monthly', 'Negotiable'].includes(body.salaryType) ? body.salaryType : 'Negotiable',
        phone: toInternational(body.phone),
        whatsapp: body.whatsapp ? toInternational(body.whatsapp) : toInternational(body.phone),
        applicationInstructions: String(body.applicationInstructions || '').trim(),
        closingDate: body.closingDate && !Number.isNaN(Date.parse(body.closingDate)) ? new Date(body.closingDate).toISOString() : null,
        status: 'PENDING'
      })
    },
    rentals: {
      required: ['title', 'propertyType', 'price', 'location', 'description', 'phone'],
      titleField: 'title',
      ownerField: 'owner',
      message: 'Your rental has been submitted and is pending admin approval.',
      payload: () => ({
        title: String(body.title || '').trim(),
        propertyType: String(body.propertyType || '').trim(),
        price: Number(body.price),
        location: String(body.location || '').trim(),
        description: String(body.description || '').trim(),
        rooms: Math.max(Number(body.rooms) || 0, 0),
        images: files.images || [],
        phone: toInternational(body.phone),
        whatsapp: body.whatsapp ? toInternational(body.whatsapp) : toInternational(body.phone),
        available: body.available === 'false' ? false : body.available !== false,
        status: 'PENDING'
      })
    },
    notices: {
      required: ['title', 'category', 'description'],
      titleField: 'title',
      ownerField: 'author',
      message: 'Your notice has been submitted and is pending admin approval.',
      payload: () => ({
        title: String(body.title || '').trim(),
        category: String(body.category || '').trim(),
        description: String(body.description || '').trim(),
        location: String(body.location || '').trim(),
        contact: String(body.contact || '').trim(),
        image: (files.image || [])[0] || null,
        expiryDate: body.expiryDate && !Number.isNaN(Date.parse(body.expiryDate)) ? new Date(body.expiryDate).toISOString() : null,
        status: 'PENDING'
      })
    }
  };
  const spec = specs[resource];
  const missing = spec.required.some((field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === '');
  if (missing) return fail(400, 'Please complete all required fields.');
  if (resource === 'businesses' && !DEFAULT_CATEGORIES.business.includes(body.category)) return fail(400, 'Please choose a valid category.');
  if (resource === 'products' && !DEFAULT_CATEGORIES.product.includes(body.category)) return fail(400, 'Please choose a valid category.');
  if (resource === 'jobs' && !DEFAULT_CATEGORIES.job.includes(body.category)) return fail(400, 'Please choose a valid category.');
  if (resource === 'rentals' && !DEFAULT_CATEGORIES.rental.includes(body.propertyType)) return fail(400, 'Please choose a valid property type.');
  if (resource === 'notices' && !DEFAULT_CATEGORIES.notice.includes(body.category)) return fail(400, 'Please choose a valid category.');

  const payload = spec.payload();
  if (resource === 'businesses' && (!payload.phone || String(body.phone).replace(/\D/g, '').length < 9)) return fail(400, 'Invalid phone number.');
  if (resource === 'products' && (!Number.isFinite(payload.price) || payload.price < 0)) return fail(400, 'Please enter a valid price in KSh.');
  if (resource === 'rentals' && (!Number.isFinite(payload.price) || payload.price < 0)) return fail(400, 'Please enter a valid monthly price in KSh.');
  if (['businesses', 'products', 'jobs', 'rentals'].includes(resource) && !payload.phone) return fail(400, 'Invalid phone number.');
  payload[spec.ownerField] = user.id;
  payload.slug = await ensureUniqueSlug(context.env, table, payload[spec.titleField]);
  const inserted = await createRow(context.env, table, payload);
  return ok(inserted, 201, spec.message);
};

const updateResource = async (context, resource, user) => {
  const spec = TABLES[resource];
  const current = await findById(context.env, spec.table, getParamId(context));
  if (!current) return fail(404, `${resource.slice(0, -1)} not found.`);
  const ownerId = current.ownerId || current.sellerId || current.posterId || current.authorId;
  if (user.role !== 'ADMIN' && ownerId !== user.id) return fail(403, 'You are not authorised to update this listing.');

  const { data: body, files } = context.body;
  const fields = {
    businesses: ['name', 'category', 'subcategory', 'description', 'phone', 'whatsapp', 'email', 'location', 'village', 'openingHours', 'services'],
    products: ['title', 'category', 'description', 'location', 'price', 'negotiable', 'condition', 'phone', 'whatsapp'],
    jobs: ['title', 'employer', 'category', 'description', 'location', 'applicationInstructions', 'salary', 'salaryType', 'phone', 'whatsapp', 'closingDate'],
    rentals: ['title', 'propertyType', 'location', 'description', 'price', 'rooms', 'phone', 'whatsapp', 'available'],
    notices: ['title', 'category', 'description', 'location', 'contact', 'expiryDate']
  }[resource];
  const payload = {};
  for (const field of fields) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  if (resource === 'products' && payload.title !== undefined) payload.name = String(payload.title).trim();
  if (payload.phone) payload.phone = toInternational(payload.phone) || current.phone;
  if (payload.whatsapp) payload.whatsapp = toInternational(payload.whatsapp) || current.whatsapp;
  if (resource === 'businesses' && payload.services !== undefined) {
    payload.services = (Array.isArray(payload.services) ? payload.services : String(payload.services).split(',')).map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  }
  if (resource === 'products' && payload.price !== undefined) {
    payload.price = Number(payload.price);
    if (!Number.isFinite(payload.price) || payload.price < 0) return fail(400, 'Please enter a valid price.');
  }
  if (resource === 'rentals' && payload.price !== undefined) {
    payload.price = Number(payload.price);
    if (!Number.isFinite(payload.price) || payload.price < 0) return fail(400, 'Please enter a valid price.');
  }
  if (resource === 'jobs' && payload.salary !== undefined) payload.salary = Math.max(Number(payload.salary) || 0, 0);
  if (resource === 'jobs' && payload.salaryType && !['Daily', 'Weekly', 'Monthly', 'Negotiable'].includes(payload.salaryType)) delete payload.salaryType;
  if (resource === 'products' && payload.condition !== undefined) payload.condition = payload.condition === 'New' ? 'New' : 'Used';
  for (const field of ['expiryDate', 'closingDate']) {
    if (payload[field]) payload[field] = new Date(payload[field]).toISOString();
  }
  if (resource === 'businesses') {
    if (files.logo?.[0]) payload.logo = files.logo[0];
    if (files.images?.length) payload.images = files.images;
  } else if (resource === 'notices') {
    if (files.image?.[0]) payload.image = files.image[0];
  } else if (files.images?.length) {
    payload.images = files.images;
  }
  if (user.role !== 'ADMIN' && current.status === 'REJECTED') payload.status = 'PENDING';
  const updated = await updateRows(context.env, spec.table, paramFilter(getParamId(context)), payload);
  if (!updated.length) return fail(404, `${resource.slice(0, -1)} not found.`);
  return ok(updated[0], 200, `${resource.slice(0, -1)} updated successfully.`);
};

const listResource = async (context, resource, { publicOnly = true, ownerId = null, params = {} } = {}) => {
  const { page, limit, offset } = parsePage(context.url);
  const spec = TABLES[resource];
  const filters = {
    select: '*',
    order: resource === 'businesses' ? 'listing_type.desc,created_at.desc' : resource === 'products' ? 'featured.desc,created_at.desc' : 'created_at.desc',
    limit: ownerId ? 500 : limit,
    offset,
    ...params
  };
  if (publicOnly) filters.status = 'eq.APPROVED';
  if (ownerId) filters[spec.owner] = `eq.${ownerId}`;
  const q = context.url.searchParams.get('q');
  if (q) {
    const expression = searchFilter(q, spec.search);
    if (expression) filters[expression.slice(0, expression.indexOf('='))] = expression.slice(expression.indexOf('=') + 1);
  }
  const queryMap = {
    category: resource === 'rentals' ? 'property_type' : 'category',
    location: 'location',
    listingType: 'listing_type',
    condition: 'condition',
    salaryType: 'salary_type'
  };
  for (const [queryKey, column] of Object.entries(queryMap)) {
    const value = context.url.searchParams.get(queryKey);
    if (value) filters[column] = queryKey === 'location'
      ? `ilike.${value.replace(/[^a-z0-9 -]/gi, '')}%`
      : `eq.${value}`;
  }
  const propertyType = context.url.searchParams.get('propertyType');
  if (resource === 'rentals' && propertyType) filters.property_type = `eq.${propertyType}`;
  const sort = context.url.searchParams.get('sort');
  if (resource === 'products' && ['price_asc', 'price_desc'].includes(sort)) filters.order = `price.${sort === 'price_asc' ? 'asc' : 'desc'},created_at.desc`;
  if (resource === 'rentals' && ['price_asc', 'price_desc'].includes(sort)) filters.order = `price.${sort === 'price_asc' ? 'asc' : 'desc'},created_at.desc`;
  if (resource === 'businesses' && sort === 'newest') filters.order = 'created_at.desc';
  if (resource === 'businesses' && sort === 'name') filters.order = 'name.asc';
  if (resource === 'products' && context.url.searchParams.get('featured') === 'true') filters.featured = 'eq.true';
  const minPrice = Number(context.url.searchParams.get('minPrice'));
  const maxPrice = Number(context.url.searchParams.get('maxPrice'));
  if (context.url.searchParams.has('minPrice') && context.url.searchParams.has('maxPrice') &&
      Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
    filters.and = `(price.gte.${minPrice},price.lte.${maxPrice})`;
  } else if (context.url.searchParams.has('minPrice') && Number.isFinite(minPrice)) {
    filters.price = `gte.${minPrice}`;
  } else if (context.url.searchParams.has('maxPrice') && Number.isFinite(maxPrice)) {
    filters.price = `lte.${maxPrice}`;
  }
  const response = await restQuery(context.env, spec.table, filters, { headers: { Prefer: 'count=exact' } });
  let rows = normalizeRows(resource, response.rows);
  rows = await enrichOwner(context.env, resource, rows);
  const total = response.total === null ? rows.length : response.total;
  return { body: { success: true, data: rows, pagination: pagination(total, page, limit) }, status: 200 };
};

const getPublicDetail = async (context, resource, { allowOwnerPreview = false } = {}) => {
  const spec = TABLES[resource];
  const user = allowOwnerPreview ? await getUserFromRequest(context.request, context.env) : null;
  const row = await findById(context.env, spec.table, getParamId(context));
  if (!row || (row.status !== 'APPROVED' && !(user && ((row[spec.owner] || row.ownerId || row.sellerId || row.posterId || row.authorId) === user.id || user.role === 'ADMIN')))) {
    return fail(404, `${resource.slice(0, -1)} not found.`);
  }
  const item = (await enrichOwner(context.env, resource, [row], 'name,phone'))[0];
  const updated = await updateRows(context.env, spec.table, { id: `eq.${row.id}` }, { views: Number(row.views || 0) + 1 });
  const current = updated[0] ? { ...item, views: updated[0].views } : item;
  if (resource === 'businesses') {
    const products = await findRows(context.env, 'products', { seller_id: `eq.${row.ownerId}`, status: 'eq.APPROVED', order: 'created_at.desc', limit: 8 });
    return ok({ ...current, products: products.rows });
  }
  return ok(current);
};

const removeResource = async (context, resource, user) => {
  const spec = TABLES[resource];
  const row = await findById(context.env, spec.table, getParamId(context));
  if (!row) return fail(404, `${resource.slice(0, -1)} not found.`);
  const ownerId = row.ownerId || row.sellerId || row.posterId || row.authorId;
  if (user.role !== 'ADMIN' && ownerId !== user.id) return fail(403, 'You are not authorised to delete this listing.');
  await deleteRows(context.env, spec.table, { id: `eq.${row.id}` });
  return ok(undefined, 200, `${resource.slice(0, -1)} deleted.`);
};

const statusUpdate = async (context, resource, id, status, extra = {}) => {
  if (!VALID_STATUSES.includes(status)) return fail(400, 'Invalid status value.');
  const row = await findById(context.env, dbTable(resource), id);
  if (!row) return fail(404, `${resource.slice(0, -1)} not found.`);
  const updated = await updateRows(context.env, dbTable(resource), { id: `eq.${row.id}` }, { status, ...extra });
  return ok(updated[0], 200, `${resource.slice(0, -1)} ${status.toLowerCase()}.`);
};

const adminList = async (context, resource, extra = {}) => {
  const params = { select: '*', order: 'created_at.desc', limit: 200, ...extra };
  const status = context.url.searchParams.get('status');
  const q = context.url.searchParams.get('q');
  if (status && status !== 'ALL') params.status = `eq.${status}`;
  if (q) {
    const expression = searchFilter(q, TABLES[resource].search);
    if (expression) params[expression.slice(0, expression.indexOf('='))] = expression.slice(expression.indexOf('=') + 1);
  }
  const result = await findRows(context.env, dbTable(resource), params);
  return ok(await enrichOwner(context.env, resource, result.rows));
};

const aggregateCount = async (env, table, params = {}) => {
  const result = await restQuery(env, table, { select: 'id', limit: 1, ...params }, {
    headers: { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' }
  });
  return result.total === null ? result.rows.length : result.total;
};

const adminDashboard = async (env) => {
  const names = ['users', 'businesses', 'products', 'jobs', 'rentals', 'notices'];
  const totals = {};
  const pending = {};
  for (const table of names) {
    totals[table] = await aggregateCount(env, table);
    if (table !== 'users') pending[table] = await aggregateCount(env, table, { status: 'eq.PENDING' });
  }
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const [activeAds, openReports, usersToday, businessesToday, productsToday, jobsToday, rentalsToday, noticesToday, payments] = await Promise.all([
    aggregateCount(env, 'advertisements', { active: 'eq.true' }),
    aggregateCount(env, 'reports', { status: 'eq.OPEN' }),
    aggregateCount(env, 'users', { created_at: `gte.${startOfDay}` }),
    aggregateCount(env, 'businesses', { created_at: `gte.${startOfDay}` }),
    aggregateCount(env, 'products', { created_at: `gte.${startOfDay}` }),
    aggregateCount(env, 'jobs', { created_at: `gte.${startOfDay}` }),
    aggregateCount(env, 'rentals', { created_at: `gte.${startOfDay}` }),
    aggregateCount(env, 'notices', { created_at: `gte.${startOfDay}` }),
    findRows(env, 'payments', { status: 'eq.SUCCESS', payment_type: 'in.(featured,premium)', select: 'amount', limit: 1000 })
  ]);
  const categoryRows = await findRows(env, 'businesses', { select: 'category', limit: 1000 });
  const categoryCounts = new Map();
  categoryRows.rows.forEach((row) => categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1));
  const popularCategories = [...categoryCounts.entries()].map(([_id, count]) => ({ _id, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  const businesses = await findRows(env, 'businesses', { select: 'id,name,category,views,listing_type,slug', order: 'views.desc', limit: 5 });
  const revenue = payments.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingTotal = Object.values(pending).reduce((sum, count) => sum + count, 0);
  return ok({
    totals: { ...totals, activeAds, openReports },
    pending: { ...pending, total: pendingTotal },
    today: {
      users: usersToday,
      businesses: businessesToday,
      listings: productsToday + jobsToday + rentalsToday + noticesToday,
      jobs: jobsToday
    },
    featuredRevenue: revenue,
    popularCategories,
    topBusinesses: businesses.rows
  });
};

const adminPending = async (env) => {
  const data = {};
  for (const resource of RESOURCE_NAMES) {
    if (resource === 'notices' || ['businesses', 'products', 'jobs', 'rentals'].includes(resource)) {
      const result = await findRows(env, dbTable(resource), { status: 'eq.PENDING', order: 'created_at.desc', limit: 200 });
      data[resource] = await enrichOwner(env, resource, result.rows, 'name,phone');
    }
  }
  data.total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  data.counts = Object.fromEntries(Object.entries(data).filter(([, rows]) => Array.isArray(rows)).map(([key, rows]) => [key, rows.length]));
  return ok(data);
};

const adminResourceStatus = async (context, resource, id, body) => {
  if (!VALID_STATUSES.includes(body.status)) return fail(400, 'Invalid status value.');
  const extra = {};
  if (resource === 'businesses' && body.adminNote !== undefined) extra.adminNote = String(body.adminNote).trim().slice(0, 500);
  return statusUpdate(context, resource, id, body.status, extra);
};

const requestRoute = async (context, user) => {
  const { method, handler, template } = context.route;
  const path = context.url.pathname.replace(/\/+$/, '') || '/';
  const body = context.body.data;
  const id = getParamId(context);
  const p = context.params;

  if (handler === 'health') {
    const supabase = await checkSupabaseConnection(context.env);
    return ok({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: context.env.ENVIRONMENT || 'development',
      ...supabase
    });
  }
  if (handler === 'register') {
    const { name, phone, password, role, location, email } = body;
    const normalized = toInternational(phone);
    if (!name || !phone || !password) return fail(400, 'Please complete all required fields.');
    if (!normalized || !/^(?:254)?[17]\d{8}$/.test(normalized)) return fail(400, 'Invalid phone number. Use a Kenyan number like 0712345678.');
    if (String(password).length < 6) return fail(400, 'Password must be at least 6 characters.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return fail(400, 'Please enter a valid email address.');
    const existing = await findRows(context.env, 'users', { phone: `eq.${normalized}`, select: 'id', limit: 1 });
    if (existing.rows.length) return fail(409, 'An account with this phone number already exists. Please log in.');
    const created = await createRow(context.env, 'users', {
      name: String(name).trim(),
      phone: normalized,
      email: email ? String(email).trim().toLowerCase() : '',
      passwordHash: await hashPassword(password),
      role: role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'USER',
      location: String(location || '').trim(),
      isActive: true
    });
    const token = await signToken(created.id, context.env.JWT_SECRET);
    const { passwordHash, ...safeUser } = created;
    return { body: { success: true, message: 'Your account has been created successfully.', data: { token, user: safeUser } }, status: 201 };
  }
  if (handler === 'login') {
    const identifier = String(body.phone || body.email || '').trim();
    if (!identifier || !body.password) return fail(400, 'Please enter your phone number and password.');
    const normalizedPhone = toInternational(identifier);
    const filters = normalizedPhone
      ? { or: `(phone.eq.${normalizedPhone},email.eq.${identifier.toLowerCase()})` }
      : { email: `eq.${identifier.toLowerCase()}` };
    const found = await findRows(context.env, 'users', { select: '*', ...filters, limit: 1 });
    const account = found.rows[0];
    if (!account || !await comparePassword(body.password, account.passwordHash)) return fail(401, 'Invalid phone number or password.');
    if (!account.isActive) return fail(403, 'Your account has been suspended. Contact support.');
    const token = await signToken(account.id, context.env.JWT_SECRET);
    const { passwordHash, ...safeUser } = account;
    return ok({ token, user: safeUser }, 200, 'Welcome back!');
  }
  if (handler === 'currentUser') {
    const { passwordHash, ...safeUser } = user;
    return ok(safeUser);
  }

  if (handler === 'listBusinesses') return listResource(context, 'businesses');
  if (handler === 'myBusinesses') return listResource(context, 'businesses', { publicOnly: false, ownerId: user.id });
  if (handler === 'createBusiness') return createResource(context, 'businesses', user);
  if (handler === 'updateBusiness') return updateResource(context, 'businesses', user);
  if (handler === 'deleteBusiness') return removeResource(context, 'businesses', user);
  if (handler === 'getBusiness') return getPublicDetail(context, 'businesses', { allowOwnerPreview: true });
  if (handler === 'businessesByNeed') {
    const need = NEEDS[p.key];
    if (!need) return fail(404, 'Category not found.');
    const params = { status: 'eq.APPROVED', order: 'listing_type.desc,created_at.desc', limit: 30 };
    if (need.categories.length) params.category = `in.(${need.categories.join(',')})`;
    const rows = await findRows(context.env, 'businesses', params);
    return ok({ data: await enrichOwner(context.env, 'businesses', rows.rows), need });
  }
  if (handler === 'businessClick') {
    const row = await findById(context.env, 'businesses', id);
    if (row) {
      const column = body.type === 'phone' ? 'phoneClicks' : 'whatsappClicks';
      await updateRows(context.env, 'businesses', { id: `eq.${row.id}` }, { [column]: Number(row[column] || 0) + 1 });
    }
    return ok(undefined);
  }
  if (handler === 'contactBusiness') {
    const business = await findById(context.env, 'businesses', id);
    if (!business) return fail(404, 'Business not found.');
    if (!body.message || !String(body.message).trim()) return fail(400, 'Please write a short message.');
    await createRow(context.env, 'inquiries', {
      business: business.id, itemType: 'business', itemId: business.id,
      name: user.name, phone: user.phone, message: String(body.message).trim().slice(0, 1000)
    });
    return ok(undefined, 201, 'Your message has been sent. The business will contact you.');
  }
  if (handler === 'reportBusiness') return insertReport(context.env, user.id, 'business', id, body);
  if (handler === 'favoriteBusiness') return saveFavorite(context.env, user.id, 'business', id);

  if (handler === 'listProducts') return listResource(context, 'products');
  if (handler === 'myProducts') return listResource(context, 'products', { publicOnly: false, ownerId: user.id });
  if (handler === 'createProduct') return createResource(context, 'products', user);
  if (handler === 'updateProduct') return updateResource(context, 'products', user);
  if (handler === 'deleteProduct') return removeResource(context, 'products', user);
  if (handler === 'getProduct') return getPublicDetail(context, 'products');
  if (handler === 'favoriteProduct') return saveFavorite(context.env, user.id, 'product', id);
  if (handler === 'reportProduct') return insertReport(context.env, user.id, 'product', id, body);

  if (handler === 'listJobs') return listResource(context, 'jobs');
  if (handler === 'myJobs') return listResource(context, 'jobs', { publicOnly: false, ownerId: user.id });
  if (handler === 'createJob') return createResource(context, 'jobs', user);
  if (handler === 'updateJob') return updateResource(context, 'jobs', user);
  if (handler === 'deleteJob') return removeResource(context, 'jobs', user);
  if (handler === 'getJob') return getPublicDetail(context, 'jobs');
  if (handler === 'favoriteJob') return saveFavorite(context.env, user.id, 'job', id);
  if (handler === 'reportJob') return insertReport(context.env, user.id, 'job', id, body);

  if (handler === 'listRentals') return listResource(context, 'rentals');
  if (handler === 'myRentals') return listResource(context, 'rentals', { publicOnly: false, ownerId: user.id });
  if (handler === 'createRental') return createResource(context, 'rentals', user);
  if (handler === 'updateRental') return updateResource(context, 'rentals', user);
  if (handler === 'deleteRental') return removeResource(context, 'rentals', user);
  if (handler === 'getRental') return getPublicDetail(context, 'rentals');
  if (handler === 'favoriteRental') return saveFavorite(context.env, user.id, 'rental', id);
  if (handler === 'reportRental') return insertReport(context.env, user.id, 'rental', id, body);

  if (handler === 'listNotices') {
    const filters = { status: 'eq.APPROVED', or: `(expiry_date.gte.${new Date().toISOString()},expiry_date.is.null)` };
    return listResource(context, 'notices', { params: filters });
  }
  if (handler === 'myNotices') return listResource(context, 'notices', { publicOnly: false, ownerId: user.id });
  if (handler === 'createNotice') return createResource(context, 'notices', user);
  if (handler === 'updateNotice') return updateResource(context, 'notices', user);
  if (handler === 'deleteNotice') return removeResource(context, 'notices', user);
  if (handler === 'getNotice') return getPublicDetail(context, 'notices');
  if (handler === 'reportNotice') return insertReport(context.env, user.id, 'notice', id, body);

  if (handler === 'listServices' || handler === 'transportServices') {
    const params = {};
    if (handler === 'transportServices' || context.url.searchParams.get('service') === 'transport') params.category = 'in.(Transport,Motorcycle Services)';
    else if (context.url.searchParams.get('service') === 'farm') params.category = 'in.(Farm Services,Agrovets)';
    else if (context.url.searchParams.get('category')) params.category = `eq.${context.url.searchParams.get('category')}`;
    else params.category = `in.(${SERVICE_CATEGORIES.join(',')})`;
    return listResource(context, 'businesses', { params });
  }
  if (handler === 'farmServices') {
    const page = parsePage(context.url);
    const [businesses, products] = await Promise.all([
      findRows(context.env, 'businesses', { category: 'in.(Farm Services,Agrovets)', status: 'eq.APPROVED', order: 'listing_type.desc,created_at.desc', limit: page.limit, offset: page.offset }, { headers: { Prefer: 'count=exact' } }),
      findRows(context.env, 'products', { category: 'in.(Farm Produce,Livestock)', status: 'eq.APPROVED', order: 'created_at.desc', limit: 9 })
    ]);
    return { body: { success: true, data: { businesses: await enrichOwner(context.env, 'businesses', businesses.rows), products: products.rows }, pagination: pagination(businesses.total || businesses.rows.length, page.page, page.limit) }, status: 200 };
  }
  if (handler === 'servicesByNeed') {
    const need = NEEDS[p.needKey];
    if (!need) return fail(404, 'Category not found.');
    const data = { businesses: [], rentals: [], products: [], jobs: [] };
    if (need.type === 'rental') data.rentals = (await findRows(context.env, 'rentals', { status: 'eq.APPROVED', property_type: `eq.${need.categories[0]}`, order: 'created_at.desc', limit: 20 })).rows;
    else if (need.type === 'product') data.products = (await findRows(context.env, 'products', { status: 'eq.APPROVED', order: 'featured.desc,created_at.desc', limit: 20 })).rows;
    else if (need.type === 'job') data.jobs = (await findRows(context.env, 'jobs', { status: 'eq.APPROVED', order: 'created_at.desc', limit: 20 })).rows;
    else if (need.categories.length) data.businesses = await enrichOwner(context.env, 'businesses', (await findRows(context.env, 'businesses', { status: 'eq.APPROVED', category: `in.(${need.categories.join(',')})`, order: 'listing_type.desc,created_at.desc', limit: 20 })).rows);
    return ok({ data, need });
  }

  if (handler === 'publicAdvertisements') {
    const now = new Date().toISOString();
    const params = {
      active: 'eq.true',
      or: `(start_date.lte.${now},start_date.is.null)`,
      and: `(or(end_date.gte.${now},end_date.is.null))`,
      order: 'created_at.desc',
      limit: Math.min(Number.parseInt(context.url.searchParams.get('limit') || '4', 10) || 4, 20)
    };
    if (context.url.searchParams.get('placement')) params.placement = `eq.${context.url.searchParams.get('placement')}`;
    return ok((await findRows(context.env, 'advertisements', params)).rows);
  }
  if (handler === 'publicCategories') {
    const rows = await findRows(context.env, 'categories', { order: 'order.asc,name.asc' });
    const grouped = Object.fromEntries(Object.keys(DEFAULT_CATEGORIES).map((type) => [type, []]));
    rows.rows.forEach((category) => { if (grouped[category.type]) grouped[category.type].push(category.name); });
    return ok(Object.fromEntries(Object.entries(grouped).map(([type, values]) => [type, values.length ? values : DEFAULT_CATEGORIES[type]])));
  }
  if (handler === 'searchAll') {
    const q = String(context.url.searchParams.get('q') || '').trim();
    const empty = { businesses: [], products: [], jobs: [], rentals: [], notices: [], total: 0 };
    if (!q) return ok(empty);
    const sections = await Promise.all(RESOURCE_NAMES.map(async (resource) => {
      const filters = { status: 'eq.APPROVED', order: resource === 'businesses' ? 'listing_type.desc,created_at.desc' : 'created_at.desc', limit: 6 };
      const search = searchFilter(q, TABLES[resource].search);
      if (search) filters[search.split('=')[0]] = search.slice(search.indexOf('=') + 1);
      return [resource, (await findRows(context.env, dbTable(resource), filters)).rows];
    }));
    const data = Object.fromEntries(sections);
    const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
    return ok({ ...data, total, query: q });
  }

  if (handler === 'updateProfile') {
    const current = await findById(context.env, 'users', user.id);
    if (!current) return fail(404, 'Account not found.');
    const payload = {};
    if (body.name) payload.name = String(body.name).trim();
    if (body.email !== undefined) payload.email = String(body.email).trim().toLowerCase();
    if (body.location) payload.location = String(body.location).trim();
    if (context.body.files.profileImage?.[0]) payload.profileImage = context.body.files.profileImage[0];
    if (body.currentPassword && body.newPassword) {
      if (!await comparePassword(body.currentPassword, current.passwordHash)) return fail(400, 'Current password is incorrect.');
      if (String(body.newPassword).length < 6) return fail(400, 'New password must be at least 6 characters.');
      payload.passwordHash = await hashPassword(body.newPassword);
    }
    const rows = await updateRows(context.env, 'users', { id: `eq.${user.id}` }, payload);
    const { passwordHash, ...safeUser } = rows[0] || current;
    return ok(safeUser, 200, 'Profile updated successfully.');
  }
  if (handler === 'addUserFavorite') return saveFavorite(context.env, user.id, body.itemType, body.itemId);
  if (handler === 'removeUserFavorite') {
    const results = await deleteRows(context.env, 'favorites', { id: `eq.${p.favoriteId}`, user_id: `eq.${user.id}` });
    if (!results.rows.length) return fail(404, 'Saved item not found.');
    return ok(undefined, 200, 'Removed from your favourites.');
  }
  if (handler === 'userFavorites') {
    const favorites = await findRows(context.env, 'favorites', { user_id: `eq.${user.id}`, order: 'created_at.desc', limit: 500 });
    const grouped = { business: [], product: [], job: [], rental: [] };
    for (const favorite of favorites.rows) {
      const resource = `${favorite.itemType}s`;
      if (!TABLES[resource]) continue;
      const item = await findById(context.env, dbTable(resource), favorite.itemId);
      if (item) grouped[favorite.itemType].push({ favoriteId: favorite.id, item: (await enrichOwner(context.env, resource, [item]))[0] });
    }
    return ok(grouped);
  }
  if (handler === 'userListings') {
    const results = await Promise.all(RESOURCE_NAMES.map((resource) => findRows(context.env, dbTable(resource), { [TABLES[resource].owner]: `eq.${user.id}`, order: 'created_at.desc', limit: 500 })));
    return ok(Object.fromEntries(RESOURCE_NAMES.map((resource, index) => [resource, results[index].rows])));
  }
  if (handler === 'userInquiries') {
    let params = { order: 'created_at.desc', limit: 100 };
    if (user.role !== 'ADMIN') {
      const businesses = await findRows(context.env, 'businesses', { owner_id: `eq.${user.id}`, select: 'id', limit: 500 });
      if (!businesses.rows.length) return ok([]);
      params.business_id = `in.(${businesses.rows.map((row) => row.id).join(',')})`;
    }
    return ok((await findRows(context.env, 'inquiries', params)).rows);
  }
  if (handler === 'createUserReport') return insertReport(context.env, user.id, body.itemType, body.itemId, body);
  if (handler === 'submitContact') {
    if (!body.name || !String(body.name).trim()) return fail(400, 'Please enter your name.');
    if (!body.message || !String(body.message).trim()) return fail(400, 'Please enter a message.');
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) return fail(400, 'Please enter a valid email address.');
    await createRow(context.env, 'contacts', {
      name: String(body.name).trim(),
      email: body.email ? String(body.email).trim().toLowerCase() : '',
      phone: body.phone ? String(body.phone).trim() : '',
      subject: body.subject ? String(body.subject).trim() : '',
      message: String(body.message).trim().slice(0, 2000)
    });
    return ok(undefined, 201, 'Thank you for your message. We will get back to you soon.');
  }

  if (handler === 'adminDashboard') return adminDashboard(context.env);
  if (handler === 'adminPending') return adminPending(context.env);
  if (handler === 'adminUsers') {
    const q = context.url.searchParams.get('q');
    const params = { order: 'created_at.desc', limit: 200 };
    if (q) {
      const safeQuery = String(q).replace(/[%_*(),]/g, ' ').trim();
      params.or = `(name.ilike.*${safeQuery}*,phone.ilike.*${safeQuery}*,email.ilike.*${safeQuery}*)`;
    }
    const results = await findRows(context.env, 'users', params);
    return ok(results.rows.map(({ passwordHash, ...safe }) => safe));
  }
  if (handler === 'adminUpdateUser') {
    const current = await findById(context.env, 'users', id);
    if (!current) return fail(404, 'User not found.');
    const patch = {};
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
    if (body.role && ['USER', 'BUSINESS_OWNER', 'ADMIN'].includes(body.role)) patch.role = body.role;
    const updated = await updateRows(context.env, 'users', { id: `eq.${current.id}` }, patch);
    const { passwordHash, ...safe } = updated[0] || current;
    return ok(safe, 200, 'User updated.');
  }
  if (handler === 'adminBusinesses') return adminList(context, 'businesses');
  if (handler === 'adminProducts') return adminList(context, 'products');
  if (handler === 'adminJobs') return adminList(context, 'jobs');
  if (handler === 'adminRentals') return adminList(context, 'rentals');
  if (handler === 'adminNotices') return adminList(context, 'notices');
  if (handler === 'adminBusinessStatus') return adminResourceStatus(context, 'businesses', id, body);
  if (handler === 'adminProductStatus') return adminResourceStatus(context, 'products', id, body);
  if (handler === 'adminJobStatus') return adminResourceStatus(context, 'jobs', id, body);
  if (handler === 'adminRentalStatus') return adminResourceStatus(context, 'rentals', id, body);
  if (handler === 'adminNoticeStatus') return adminResourceStatus(context, 'notices', id, body);
  if (handler === 'adminBusinessFeature') {
    const row = await findById(context.env, 'businesses', id);
    if (!row) return fail(404, 'Business not found.');
    const listingType = ['FREE', 'FEATURED', 'PREMIUM'].includes(body.listingType) ? body.listingType : row.listingType;
    const updates = { listingType, featuredUntil: listingType === 'FREE' ? null : (body.featuredUntil || null) };
    const rows = await updateRows(context.env, 'businesses', { id: `eq.${row.id}` }, updates);
    return ok(rows[0], 200, `Listing type set to ${listingType}.`);
  }
  if (handler === 'adminBusinessVerify') {
    const row = await findById(context.env, 'businesses', id);
    if (!row) return fail(404, 'Business not found.');
    const rows = await updateRows(context.env, 'businesses', { id: `eq.${row.id}` }, { verified: !row.verified });
    return ok(rows[0], 200, rows[0].verified ? 'Business verified.' : 'Verification removed.');
  }
  if (handler === 'adminProductFeature') {
    const row = await findById(context.env, 'products', id);
    if (!row) return fail(404, 'Product not found.');
    const rows = await updateRows(context.env, 'products', { id: `eq.${row.id}` }, { featured: !row.featured });
    return ok(rows[0], 200, rows[0].featured ? 'Product featured.' : 'Feature removed.');
  }
  if (handler.startsWith('adminDelete')) {
    const resource = handler.includes('Business') ? 'businesses' : handler.includes('Product') ? 'products' : handler.includes('Job') ? 'jobs' : handler.includes('Rental') ? 'rentals' : 'notices';
    const row = await findById(context.env, dbTable(resource), id);
    if (!row) return fail(404, `${resource.slice(0, -1)} not found.`);
    await deleteRows(context.env, dbTable(resource), { id: `eq.${row.id}` });
    return ok(undefined, 200, `${resource.slice(0, -1)} deleted.`);
  }
  if (handler === 'adminAds') return ok((await findRows(context.env, 'advertisements', { order: 'created_at.desc', limit: 500 })).rows);
  if (handler === 'adminCreateAd') {
    if (!body.title || !String(body.title).trim()) return fail(400, 'Ad title is required.');
    const image = context.body.files.image?.[0] || null;
    return ok(await createRow(context.env, 'advertisements', {
      title: String(body.title).trim(),
      description: String(body.description || '').trim(),
      link: String(body.link || '').trim(),
      placement: ['homepage', 'category', 'sidebar', 'sponsored'].includes(body.placement) ? body.placement : 'homepage',
      image,
      business: body.business || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      active: body.active === 'true' || body.active === true
    }), 201, 'Advertisement created.');
  }
  if (handler === 'adminUpdateAd') {
    const ad = await findById(context.env, 'advertisements', id);
    if (!ad) return fail(404, 'Advertisement not found.');
    const patch = {};
    for (const field of ['title', 'description', 'link', 'placement', 'startDate', 'endDate']) if (body[field] !== undefined) patch[field] = body[field];
    if (body.active !== undefined) patch.active = body.active === true || body.active === 'true';
    if (context.body.files.image?.[0]) patch.image = context.body.files.image[0];
    const rows = await updateRows(context.env, 'advertisements', { id: `eq.${ad.id}` }, patch);
    return ok(rows[0], 200, 'Advertisement updated.');
  }
  if (handler === 'adminDeleteAd') {
    const rows = await deleteRows(context.env, 'advertisements', { id: `eq.${id}` });
    return rows.rows.length ? ok(undefined, 200, 'Advertisement deleted.') : fail(404, 'Advertisement not found.');
  }
  if (handler === 'adminCategories') return ok((await findRows(context.env, 'categories', { order: 'type.asc,order.asc,name.asc' })).rows);
  if (handler === 'adminCreateCategory') {
    if (!body.name || !['business', 'product', 'job', 'rental', 'notice'].includes(body.type)) return fail(400, 'Please provide a name and a valid type.');
    const existing = await findRows(context.env, 'categories', { name: `eq.${String(body.name).trim()}`, type: `eq.${body.type}`, limit: 1 });
    if (existing.rows.length) return fail(409, 'This category already exists.');
    const name = String(body.name).trim();
    const slug = await ensureUniqueSlug(context.env, 'categories', `${body.type}-${name}`);
    return ok(await createRow(context.env, 'categories', { name, type: body.type, slug }), 201, 'Category created.');
  }
  if (handler === 'adminUpdateCategory') {
    const category = await findById(context.env, 'categories', id);
    if (!category) return fail(404, 'Category not found.');
    const patch = {};
    if (body.name) patch.name = String(body.name).trim();
    if (body.order !== undefined) patch.order = Number(body.order);
    const rows = await updateRows(context.env, 'categories', { id: `eq.${category.id}` }, patch);
    return ok(rows[0], 200, 'Category updated.');
  }
  if (handler === 'adminDeleteCategory') {
    const rows = await deleteRows(context.env, 'categories', { id: `eq.${id}` });
    return rows.rows.length ? ok(undefined, 200, 'Category deleted.') : fail(404, 'Category not found.');
  }
  if (handler === 'adminReports') {
    const status = context.url.searchParams.get('status');
    const params = { order: 'created_at.desc', limit: 200 };
    if (status && status !== 'ALL') params.status = `eq.${status}`;
    return ok((await findRows(context.env, 'reports', params)).rows);
  }
  if (handler === 'adminResolveReport') {
    const report = await findById(context.env, 'reports', id);
    if (!report) return fail(404, 'Report not found.');
    const status = report.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    const rows = await updateRows(context.env, 'reports', { id: `eq.${report.id}` }, { status });
    return ok(rows[0], 200, `Report marked ${status.toLowerCase()}.`);
  }
  if (handler === 'adminDeleteReport') {
    const rows = await deleteRows(context.env, 'reports', { id: `eq.${id}` });
    return rows.rows.length ? ok(undefined, 200, 'Report deleted.') : fail(404, 'Report not found.');
  }
  if (handler === 'adminPayments') return ok((await findRows(context.env, 'payments', { order: 'created_at.desc', limit: 200 })).rows);

  return fail(404, 'API endpoint not found.');
};

const needsBody = (method) => ['POST', 'PUT', 'PATCH'].includes(method);
const applyAuth = async (route, request, env) => {
  if (route.auth === 'public' || route.auth === 'optional-user' || route.auth === 'none') {
    if (route.auth === 'optional-user') return { user: await getUserFromRequest(request, env) };
    return {};
  }
  if (route.auth === 'admin') return requireAdminUser(request, env);
  return requireUser(request, env);
};

export const handleApiRequest = async (request, env, corsHeaders) => {
  const url = new URL(request.url);
  const route = compiledRoutes.find((candidate) =>
    candidate.method === request.method && candidate.regex.test(url.pathname)
  );
  if (!route) return json(fail(404, 'API endpoint not found.'), corsHeaders);

  const match = url.pathname.match(route.regex);
  const params = {};
  route.paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });
  const authentication = await applyAuth(route, request, env);
  if (authentication.error) return json(authentication.error, corsHeaders);

  try {
    const body = needsBody(request.method) ? await readBody(request, env, route.handler.replace(/([A-Z])/g, '-$1').toLowerCase()) : { data: {}, files: {} };
    const result = await requestRoute({ request, env, url, route, params, body }, authentication.user);
    return json(result, corsHeaders);
  } catch (error) {
    return json(errorResult(error), corsHeaders);
  }
};

export const routeInventoryStats = () => ({
  count: routeRows.length,
  routes: ROUTE_INVENTORY
});
