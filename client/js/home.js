/* CHANGARA CONNECT - Homepage logic */
const NEEDS = [
  { key: 'phone-repair', label: 'Phone Repair', icon: 'fa-mobile-screen' },
  { key: 'computer', label: 'Computer Services', icon: 'fa-laptop' },
  { key: 'electrician', label: 'Electrician', icon: 'fa-bolt' },
  { key: 'plumber', label: 'Plumber', icon: 'fa-faucet-drip' },
  { key: 'carpenter', label: 'Carpenter', icon: 'fa-hammer' },
  { key: 'construction', label: 'Construction', icon: 'fa-trowel-bricks' },
  { key: 'farm-services', label: 'Farm Services', icon: 'fa-tractor' },
  { key: 'house-rental', label: 'House Rental', icon: 'fa-house' },
  { key: 'transport', label: 'Transport', icon: 'fa-car' },
  { key: 'products', label: 'Products', icon: 'fa-cart-shopping' },
  { key: 'jobs', label: 'Jobs', icon: 'fa-briefcase' },
  { key: 'food', label: 'Food', icon: 'fa-utensils' },
  { key: 'health-services', label: 'Health Services', icon: 'fa-stethoscope' },
  { key: 'education', label: 'Education', icon: 'fa-graduation-cap' }
];

document.addEventListener('DOMContentLoaded', () => {
  initShell();
  bindInstallButton();
  buildNeedsGrid();
  bindNeedsOpen();
  bindHeroSearch();
  loadHeroStats();
  loadAds();
  loadSection('homeBiz', '/api/businesses?limit=6', renderBusinessCard, 'No businesses found yet.');
  loadSection('homeProd', '/api/products?limit=6', renderProductCard, 'No products available yet.');
  loadSection('homeJobs', '/api/jobs?limit=4', renderJobCard, 'No jobs have been posted yet.');
  loadSection('homeRent', '/api/rentals?limit=4', renderRentalCard, 'No rentals listed yet.');
  loadSection('homeNotices', '/api/notices?limit=4', renderNoticeCard, 'No community notices yet.');
});

function buildNeedsGrid() {
  const grid = document.getElementById('needsGrid');
  if (!grid) return;
  grid.innerHTML = NEEDS.map((n) =>
    '<button class="need-item" data-need="' + n.key + '"><i class="fa-solid ' + n.icon + '"></i><span>' + esc(n.label) + '</span></button>'
  ).join('');
  grid.querySelectorAll('.need-item').forEach((btn) =>
    btn.addEventListener('click', () => selectNeed(btn.getAttribute('data-need')))
  );
}

function bindNeedsOpen() {
  const opener = document.getElementById('openNeeds');
  if (opener) opener.addEventListener('click', () => openModal('needsModal'));
}

async function selectNeed(key) {
  const meta = NEEDS.find((n) => n.key === key) || { label: 'Results' };
  const box = document.getElementById('needResults');
  if (!box) return;
  box.innerHTML = '<p class="text-muted">Loading ' + esc(meta.label) + '...</p>';
  try {
    const res = await API.get('/api/services/needs/' + encodeURIComponent(key));
    const d = res.data;
    let html = '<h4>' + esc(meta.label) + '</h4>';
    const parts = [];
    if (d.businesses && d.businesses.length) parts.push('<h4 class="mt-2">Providers</h4><div class="grid grid-auto">' + d.businesses.map(renderBusinessCard).join('') + '</div>');
    if (d.products && d.products.length) parts.push('<h4 class="mt-2">Products</h4><div class="grid grid-auto">' + d.products.map(renderProductCard).join('') + '</div>');
    if (d.rentals && d.rentals.length) parts.push('<h4 class="mt-2">Rentals</h4><div class="grid grid-auto">' + d.rentals.map(renderRentalCard).join('') + '</div>');
    if (d.jobs && d.jobs.length) parts.push('<h4 class="mt-2">Jobs</h4><div class="grid grid-auto">' + d.jobs.map(renderJobCard).join('') + '</div>');
    if (!parts.length) html += '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>No results yet</h3><p>Nothing listed under ' + esc(meta.label) + ' yet. Check back soon.</p></div>';
    else html += parts.join('');
    box.innerHTML = html;
  } catch (err) {
    box.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
  }
}

/* ===== HOME_SEARCH ===== */
function bindHeroSearch() {
  document.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      const input = document.getElementById('heroSearchInput');
      input.value = chip.getAttribute('data-search') || '';
      document.getElementById('heroSearchForm').dispatchEvent(new Event('submit'));
    })
  );
  const form = document.getElementById('heroSearchForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('heroSearchInput').value.trim();
    if (!q) { toast('Type what you are looking for first.', 'warning'); return; }
    const box = document.getElementById('searchResults');
    box.innerHTML = '<p class="text-muted">Searching...</p>';
    document.getElementById('searchTitle').textContent = 'Results for "' + q + '"';
    openModal('searchModal');
    try {
      const res = await API.get('/api/search?q=' + encodeURIComponent(q));
      const d = res.data;
      let html = '';
      if (d.businesses && d.businesses.length) html += sectionHtml('Businesses', d.businesses.slice(0, 3).map(renderBusinessCard).join(''), 'businesses.html?q=' + encodeURIComponent(q));
      if (d.products && d.products.length) html += sectionHtml('Products', d.products.slice(0, 3).map(renderProductCard).join(''), 'marketplace.html?q=' + encodeURIComponent(q));
      if (d.jobs && d.jobs.length) html += sectionHtml('Jobs', d.jobs.slice(0, 3).map(renderJobCard).join(''), 'jobs.html?q=' + encodeURIComponent(q));
      if (d.rentals && d.rentals.length) html += sectionHtml('Rentals', d.rentals.slice(0, 3).map(renderRentalCard).join(''), 'rentals.html?q=' + encodeURIComponent(q));
      if (d.notices && d.notices.length) html += sectionHtml('Notices', d.notices.slice(0, 3).map(renderNoticeCard).join(''), 'notices.html?q=' + encodeURIComponent(q));
      if (!html) html = '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>No results for "' + esc(q) + '"</h3><p>Try a different word, e.g. "electrician", "house" or "maize".</p></div>';
      box.innerHTML = html;
    } catch (err) {
      box.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  });
}

function sectionHtml(title, cards, moreHref) {
  return '<div class="section-title"><h2>' + esc(title) + '</h2><a class="section-link" href="' + moreHref + '">View all</a></div><div class="grid grid-auto">' + cards + '</div>';
}

async function loadHeroStats() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = Number(v || 0); };
  // Only admins may call the private dashboard stats endpoint.
  try {
    const me = Auth.getUser();
    if (Auth.isLoggedIn() && me && me.role === 'ADMIN') {
      const res = await API.get('/api/admin/dashboard');
      if (res.success) {
        set('statBiz', res.data.totals.businesses);
        set('statProd', res.data.totals.products);
        set('statJobs', res.data.totals.jobs);
        return;
      }
    }
  } catch (e) { /* fall through to public counts */ }
  try {
    const [b, p, j] = await Promise.all([
      API.get('/api/businesses?limit=1'),
      API.get('/api/products?limit=1'),
      API.get('/api/jobs?limit=1')
    ]);
    set('statBiz', b.pagination && b.pagination.total);
    set('statProd', p.pagination && p.pagination.total);
    set('statJobs', j.pagination && j.pagination.total);
  } catch (e) { /* offline - leave zeros */ }
}

async function loadAds() {
  const sec = document.getElementById('adsSection');
  const row = document.getElementById('homeAds');
  if (!sec || !row) return;
  try {
    const res = await API.get('/api/advertisements?placement=homepage&limit=6');
    if (res.success && res.data.length) {
      sec.style.display = '';
      row.innerHTML = res.data.map((a) => {
        const inner = '<div class="ad-tag">Sponsored</div><div class="ad-title">' + esc(a.title) + '</div>' + (a.description ? '<div class="ad-desc">' + esc(a.description) + '</div>' : '');
        return a.link ? '<a class="ad-banner" href="' + esc(a.link) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="ad-banner">' + inner + '</div>';
      }).join('');
    }
  } catch (e) { /* ads optional */ }
}

async function loadSection(elId, url, renderer, emptyMsg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonGrid(4);
  try {
    const res = await API.get(url);
    if (res.success && res.data && res.data.length) {
      el.innerHTML = res.data.map(renderer).join('');
    } else {
      el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>Nothing here yet</h3><p>' + esc(emptyMsg) + '</p></div>';
    }
  } catch (err) {
    el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-wifi"></i><h3>Could not load</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline btn-sm" onclick="location.reload()">Retry</button></div>';
  }
}