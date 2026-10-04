const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationPlan = [
  { source: 'users', target: 'users', notes: 'Match auth user records with Supabase auth.user metadata.' },
  { source: 'businesses', target: 'businesses', notes: 'Map business details, owner ids, listings, images, and moderation status.' },
  { source: 'products', target: 'products', notes: 'Carry seller metadata, pricing, inventory, and product categories.' },
  { source: 'jobs', target: 'jobs', notes: 'Transfer job postings with category, type, and location.' },
  { source: 'rentals', target: 'rentals', notes: 'Translate rental listings and their property metadata.' },
  { source: 'notices', target: 'notices', notes: 'Move notices and announcements into public listing tables.' },
  { source: 'advertisements', target: 'advertisements', notes: 'Migrate ad slots and campaign metadata.' },
  { source: 'categories', target: 'categories', notes: 'Seed dynamic categories for browsing and filters.' },
  { source: 'favorites', target: 'favorites', notes: 'Preserve user saved listings and bookmarks.' },
  { source: 'inquiries', target: 'inquiries', notes: 'Keep buyer/seller communication records.' },
  { source: 'reports', target: 'reports', notes: 'Retain moderation reports and flag data.' },
  { source: 'contacts', target: 'contacts', notes: 'Move contact form submissions to a support table.' }
];

function printBanner() {
  console.log('Changara Connect MongoDB -> Supabase migration plan');
  console.log('This script is intentionally non-destructive and uses a dry-run style summary.');
  console.log('');
}

function printPlan() {
  console.table(migrationPlan.map(({ source, target, notes }) => ({ source, target, notes })));
}

function printEnvironmentHints() {
  const envPath = path.join(root, '.env');
  const hasEnv = fs.existsSync(envPath);

  console.log('Environment checklist:');
  console.log(` - .env file present: ${hasEnv ? 'yes' : 'no'}`);
  console.log(' - Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
  console.log(' - Recommended: SUPABASE_STORAGE_BUCKET, FRONTEND_URL, API_BASE_URL');
  console.log('');
}

function printNextSteps() {
  console.log('Recommended migration sequence:');
  console.log('  1. Run the Supabase SQL migration in supabase/migrations/001_initial_schema.sql.');
  console.log('  2. Create the storage bucket for uploads and configure public/private policies.');
  console.log('  3. Export MongoDB collections in batches and ingest them into the corresponding Postgres tables.');
  console.log('  4. Validate counts, ownership links, and image URLs after each batch import.');
  console.log('  5. Switch the frontend API base from same-origin to the Cloudflare Worker URL.');
}

printBanner();
printPlan();
printEnvironmentHints();
printNextSteps();
