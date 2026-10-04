const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const requiredFiles = [
  'package.json',
  '.env.example',
  'wrangler.toml',
  'client/index.html',
  'client/js/api.js',
  'server/server.js',
  'worker/index.js',
  'worker/routes/api.js',
  'worker/lib/api.js',
  'worker/db/supabase.js',
  'supabase/migrations/001_initial_schema.sql',
  'scripts/migrate-mongodb-to-supabase.js',
  'WORKER_ROUTES.md'
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) errors.push(`Required file is missing: ${relativePath}`);
}
if (errors.length) {
  console.error('Migration validation failed:');
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const wranglerToml = read('wrangler.toml');
const apiClient = read('client/js/api.js');
const homePage = read('client/index.html');
const envExample = read('.env.example');
const workerIndex = read('worker/index.js');
const workerRoutes = read('worker/routes/api.js');
const workerLib = read('worker/lib/api.js');
const workerDb = read('worker/db/supabase.js');
const schema = read('supabase/migrations/001_initial_schema.sql');
const routeDoc = read('WORKER_ROUTES.md');
const server = read('server/server.js');

for (const name of ['dev', 'deploy', 'validate', 'validate:worker']) {
  if (!packageJson.scripts || !packageJson.scripts[name]) errors.push(`package.json is missing the "${name}" script.`);
}

const productionChecks = [
  [wranglerToml, 'FRONTEND_URL = "https://startechafrica.co.ke"', 'Wrangler production frontend URL is incorrect.'],
  [wranglerToml, 'API_BASE_URL = "https://connect-api.startechafrica.co.ke"', 'Wrangler production API URL is incorrect.'],
  [apiClient, 'https://connect-api.startechafrica.co.ke', 'Frontend API client does not default to the production Worker URL.'],
  [homePage, 'https://startechafrica.co.ke/', 'Frontend canonical URL is not the production root domain.']
];
for (const [content, expected, message] of productionChecks) {
  if (!content.includes(expected)) errors.push(message);
}
if (/connect\.startechafrica\.co\.ke/.test(wranglerToml) ||
    /connect\.startechafrica\.co\.ke/.test(apiClient) ||
    /connect\.startechafrica\.co\.ke/.test(homePage)) {
  errors.push('Production frontend/API configuration still references connect.startechafrica.co.ke.');
}
if (/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/.test(workerIndex)) errors.push('Worker CORS must not allow every origin.');
if (!workerIndex.includes('https://startechafrica.co.ke') ||
    !workerIndex.includes('localhost|127\\.0\\.0\\.1') ||
    !workerIndex.includes('Origin is not allowed.')) {
  errors.push('Worker CORS must allow the production frontend and local development only, and reject other origins.');
}

for (const variable of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'FRONTEND_URL', 'API_BASE_URL']) {
  if (!envExample.includes(`${variable}=`)) errors.push(`.env.example does not document ${variable}.`);
}
for (const frontendFile of ['client/js/api.js', 'client/index.html']) {
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(read(frontendFile))) errors.push(`The service-role key appears in ${frontendFile}.`);
}
if (!workerDb.includes('SUPABASE_SERVICE_ROLE_KEY') || !workerDb.includes('Authorization: `Bearer ${config.serviceRoleKey}`')) {
  errors.push('Worker database access is not using its server-side Supabase service-role secret.');
}
if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^#\r\n]+/.test(wranglerToml)) {
  errors.push('Do not put the Supabase service-role key in wrangler.toml.');
}
if (!workerLib.includes('bcrypt.hash') || !workerLib.includes('bcrypt.compare') ||
    !workerLib.includes("name: 'HMAC'") || !workerRoutes.includes('signToken(created.id')) {
  errors.push('Worker registration/login must hash passwords and preserve the HS256 JWT contract.');
}

const routeRowsBlock = workerRoutes.match(/const routeRows = \[([\s\S]*?)\n\];/);
if (!routeRowsBlock) {
  errors.push('Worker route registry could not be read.');
} else {
  const workerEntries = [...routeRowsBlock[1].matchAll(/\['(GET|POST|PUT|PATCH|DELETE)', '([^']+)', '([^']+)', '([^']+)'\]/g)]
    .map((match) => ({ method: match[1], route: match[2], handler: match[3], auth: match[4] }));
  const workerKeys = workerEntries.map(({ method, route }) => `${method} ${route}`);
  const workerKeySet = new Set(workerKeys);
  if (workerKeySet.size !== workerKeys.length) errors.push('Worker route registry contains duplicate method/path entries.');

  const sourceRoutes = [];
  for (const match of server.matchAll(/app\.use\(['"]\/api\/([^'"]+)['"],\s*require\(['"]\.\/routes\/([^'"]+)['"]\)\)/g)) {
    const [, prefix, file] = match;
    const routeFile = path.join(root, 'server', 'routes', `${file}.js`);
    if (!fs.existsSync(routeFile)) {
      errors.push(`Mounted Express route module is missing: server/routes/${file}.js`);
      continue;
    }
    const source = fs.readFileSync(routeFile, 'utf8');
    for (const route of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi)) {
      const suffix = route[2] === '/' ? '' : route[2];
      sourceRoutes.push(`${route[1].toUpperCase()} /api/${prefix}${suffix}`);
    }
  }
  for (const route of server.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"](\/api\/[^'"]+)['"]/gi)) {
    sourceRoutes.push(`${route[1].toUpperCase()} ${route[2]}`);
  }
  const sourceSet = new Set(sourceRoutes);
  for (const route of sourceSet) {
    if (!workerKeySet.has(route)) errors.push(`Express route has no Worker route registration: ${route}`);
    if (!routeDoc.includes(`| ${route.split(' ')[0]} | \`${route.split(' ').slice(1).join(' ')}\` |`)) {
      errors.push(`Route inventory documentation is missing: ${route}`);
    }
  }
  for (const route of workerKeySet) {
    if (!sourceSet.has(route)) errors.push(`Worker route is not backed by an Express route declaration: ${route}`);
  }
  for (const entry of workerEntries) {
    const implemented = workerRoutes.includes(`handler === '${entry.handler}'`) ||
      (entry.handler.startsWith('adminDelete') && workerRoutes.includes("handler.startsWith('adminDelete')"));
    if (!implemented) errors.push(`Worker route has no handler implementation branch: ${entry.handler}`);
    if (!routeDoc.includes(`\`${entry.handler}\``)) errors.push(`Route inventory omits Worker handler: ${entry.handler}`);
  }
  if (!sourceSet.has('GET /api/health')) errors.push('The original /api/health endpoint was not found during source inspection.');
  if (workerEntries.length !== sourceSet.size) {
    errors.push(`Worker covers ${workerEntries.length} route declarations but Express defines ${sourceSet.size}.`);
  }
}

const requiredTables = [
  'users', 'categories', 'businesses', 'products', 'jobs', 'rentals', 'notices',
  'advertisements', 'favorites', 'inquiries', 'reports', 'contacts', 'payments'
];
for (const table of requiredTables) {
  if (!new RegExp(`create table if not exists ${table}\\s*\\(`, 'i').test(schema)) {
    errors.push(`Supabase migration is missing the ${table} table.`);
  }
}
for (const column of ['legacy_id', 'password_hash', 'profile_image', 'admin_note', 'featured_until',
  'phone_clicks', 'whatsapp_clicks', 'negotiable', 'condition', 'salary_type',
  'application_instructions', 'closing_date', 'property_type', 'expiry_date', 'slug',
  'business_id', 'target_type', 'target_id', 'entity_type', 'entity_id', 'mpesa_receipt']) {
  if (!schema.includes(column)) errors.push(`Supabase schema is missing required migration column ${column}.`);
}
for (const table of ['jobs', 'notices']) {
  if (!new RegExp(`alter table ${table} add column if not exists slug text`, 'i').test(schema) &&
      !new RegExp(`create table if not exists ${table} \\([\\s\\S]*?slug text`, 'i').test(schema)) {
    errors.push(`Supabase schema is missing the slug column used by ${table} handlers.`);
  }
}
if (!workerRoutes.includes('uploadObject') && !workerLib.includes('uploadObject')) {
  errors.push('Worker has no Supabase Storage upload implementation.');
}

if (errors.length) {
  console.error('Migration validation failed:');
  errors.forEach((error) => console.error(` - ${error}`));
  console.error('');
  console.error('No deployment was performed.');
  process.exit(1);
}

console.log('Migration validation passed.');
console.log(' - All source Express API method/path declarations have Worker handler registrations.');
console.log(' - Route inventory documentation matches the source route declarations.');
console.log(' - Supabase schema, server-side secrets, JWT/password handling, API domains, and CORS checks passed.');
