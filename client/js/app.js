/* CHANGARA CONNECT - Shared UI helpers */
const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Formatting */
const fmtKsh = (n) => 'KSh ' + (Number(n || 0)).toLocaleString('en-KE', { maximumFractionDigits: 0 });
const fmtDate = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return String(iso); } };
const timeAgo = (iso) => { if (!iso) return ''; const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 1) return 'just now'; if (mins < 60) return mins + 'm ago'; const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + 'h ago'; const days = Math.floor(hrs / 24); if (days < 30) return days + 'd ago'; return fmtDate(iso); };

/* WhatsApp & phone links (dynamic, never hardcoded) */
const toIntl = (number) => { const d = String(number || '').replace(/[^\d]/g, ''); if (d.length === 9) return '254' + d; if (d.length === 10 && d.startsWith('0')) return '254' + d.slice(1); if (d.length === 12 && d.startsWith('254')) return d; if (d.length === 11 && d.startsWith('0')) return '254' + d.slice(1); return d || null; };
const buildWhatsAppLink = (number, message) => { const intl = toIntl(number); if (!intl) return '#'; const text = message || 'Hello, I found your listing on Changara Connect and I would like to know more.'; return 'https://wa.me/' + intl + '?text=' + encodeURIComponent(text); };
const buildTelLink = (number) => { const intl = toIntl(number); return intl ? 'tel:+' + intl : '#'; };

/* Image fallback (low data: tiny local SVG) */
const mediaSrc = (src) => { if (src && src.startsWith('/uploads')) return src; if (src && (src.startsWith('http://') || src.startsWith('https://'))) return src; return '/assets/images/placeholder.svg'; };

/* Toasts */
function toast(message, type = 'success') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid fa-' + (icons[type] || 'circle-info') + '"></i><span></span><button class="toast-close" aria-label="Dismiss">&times;</button>';
  el.querySelector('span').textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
  setTimeout(() => dismissToast(el), 4200);
  return el;
}
function dismissToast(el) { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }

/* Modals */
const openModal = (id) => { const m = document.getElementById(id); if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; } };
const closeModal = (id) => { const m = document.getElementById(id); if (m) { m.classList.remove('open'); document.body.style.overflow = ''; } };
const closeModalAll = () => { document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open')); document.body.style.overflow = ''; };
function initModals() {
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModalAll(); }));
  document.querySelectorAll('.modal-close').forEach((btn) => btn.addEventListener('click', () => { const m = btn.closest('.modal'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; }));
}
/* Drawer */
const openDrawer = () => { const d = document.getElementById('drawer'); if (d) d.classList.add('open'); };
const closeDrawer = () => { const d = document.getElementById('drawer'); if (d) d.classList.remove('open'); };
function initDrawer() {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
  const toggle = document.getElementById('navToggle');
  if (toggle) toggle.addEventListener('click', openDrawer);
  const closeBtn = document.querySelector('.drawer-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-panel a').forEach((a) => a.addEventListener('click', closeDrawer));
}

/* Auth shell */
function refreshAuthShell() {
  const logged = Auth.isLoggedIn();
  const user = Auth.getUser();
  const loginBtn = document.getElementById('loginBtn');
  const dashBtn = document.getElementById('dashBtn');
  const drawerAuth = document.getElementById('drawerAuth');
  if (loginBtn) { loginBtn.style.display = logged ? 'none' : ''; if (!logged) { loginBtn.href = 'login.html'; loginBtn.textContent = 'Log in'; } }
  if (dashBtn) {
    if (logged) { dashBtn.style.display = ''; dashBtn.href = 'dashboard.html'; dashBtn.textContent = user && user.name ? String(user.name).split(' ')[0] : 'Account'; }
    else { dashBtn.style.display = 'none'; }
  }
  if (drawerAuth) {
    if (logged && user) {
      const role = user.role === 'ADMIN' ? 'Administrator' : user.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Member';
      drawerAuth.innerHTML =
        '<div><i class="fa-solid fa-circle-user" style="color:var(--primary)"></i> <b>' + esc(user.name) + '</b><br><small class="text-muted">' + esc(role) + '</small></div>' +
        '<hr class="divider">' +
        '<p><a href="dashboard.html"><i class="fa-solid fa-gauge-high"></i> My Dashboard</a></p>' +
        '<p><a href="profile.html"><i class="fa-solid fa-user-gear"></i> My Profile</a></p>' +
        '<p><a href="#" id="drawerLogout"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></p>';
      const lo = document.getElementById('drawerLogout');
      if (lo) lo.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });
    } else {
      drawerAuth.innerHTML =
        '<a href="login.html" class="btn btn-primary btn-block"><i class="fa-solid fa-arrow-right-to-bracket"></i> Log in</a>' +
        '<a href="register.html" class="btn btn-outline btn-block mt-1">Create account</a>';
    }
  }
}

function doLogout() { Auth.clear(); toast('You have been logged out.', 'success'); setTimeout(() => { window.location.href = 'index.html'; }, 700); }

/* Categories cache */
let CATEGORIES_CACHE = null;
async function getCategories(force) {
  if (CATEGORIES_CACHE && !force) return CATEGORIES_CACHE;
  try { const res = await API.get('/api/categories'); CATEGORIES_CACHE = res.data; return res.data; }
  catch (e) { return { business: [], product: [], job: [], rental: [], notice: [] }; }
}
async function fillCategorySelect(selectEl, type, selected) {
  const cats = await getCategories();
  const list = cats[type] || [];
  selectEl.innerHTML = '<option value="">All ' + type + 's</option>' + list.map((c) => '<option value="' + esc(c) + '" ' + (c === selected ? 'selected' : '') + '>' + esc(c) + '</option>').join('');
}

/* Misc */
const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms || 300); }; };
const loadingBtn = (btn, on) => { if (!btn) return; if (on) { btn.classList.add('loading'); btn.setAttribute('aria-busy', 'true'); } else { btn.classList.remove('loading'); btn.setAttribute('aria-busy', 'false'); } };
const setActiveNav = () => {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('active', el.getAttribute('data-nav') === here));
};

/* Shell init - call on every page after DOMContentLoaded */
function initShell() {
  initModals();
  initDrawer();
  refreshAuthShell();
  setActiveNav();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModalAll(); closeDrawer(); } });
}

/* File input preview */
function bindImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  input.addEventListener('change', () => {
    preview.innerHTML = '';
    Array.from(input.files || []).slice(0, 8).forEach((f) => {
      try {
        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = URL.createObjectURL(f);
        img.alt = 'Upload preview';
        preview.appendChild(img);
      } catch (e) { /* file URLs not supported - ignore */ }
    });
  });
}

/* PWA install helper (documented placeholder - real install is browser-driven) */
function bindInstallButton() {
  const btn = document.getElementById('installApp');
  if (!btn) return;
  btn.addEventListener('click', () => {
    toast('On Android Chrome: open the browser menu (⋮) then "Install app" / "Add to Home screen".', 'warning');
  });
}

/* ===== LISTING CARD RENDERERS (shared by all pages) ===== */
const tierBadge = (b) =>
  b.listingType === 'PREMIUM' ? '<span class="lc-tier premium">&#128142; PREMIUM</span>' :
  b.listingType === 'FEATURED' ? '<span class="lc-tier">&#11088; FEATURED</span>' : '';

const waLinkFor = (item) => {
  const num = item.whatsapp || item.phone;
  return num ? buildWhatsAppLink(num) : '';
};

const mediaBox = (href, img, alt, extra) =>
  '<a class="lc-media" href="' + href + '" aria-label="View ' + esc(alt) + '">' +
    (extra || '') + '<img src="' + esc(mediaSrc(img)) + '" alt="' + esc(alt) + '" loading="lazy">' +
  '</a>';

const renderBusinessCard = (b) =>
  '<div class="card listing-card">' +
    mediaBox('business-details.html?id=' + b._id, b.logo, b.name,
      tierBadge(b) + (b.verified ? '<span class="lc-verify" title="Verified business"><i class="fa-solid fa-check"></i></span>' : '')) +
    '<div class="lc-body">' +
      '<h3 class="lc-title"><a href="business-details.html?id=' + b._id + '">' + esc(b.name) + '</a></h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(b.category) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(b.location) + '</p>' +
      '<p class="lc-desc">' + esc(b.description) + '</p>' +
      '<div class="lc-foot">' +
        (waLinkFor(b) ? '<a class="lc-btn-wa" href="' + waLinkFor(b) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' : '') +
        '<a class="lc-link" href="business-details.html?id=' + b._id + '">View profile</a>' +
      '</div>' +
    '</div>' +
  '</div>';

const renderProductCard = (p) => {
  const img = p.images && p.images.length ? p.images[0] : null;
  return '<div class="card listing-card">' +
    mediaBox('marketplace.html?id=' + p._id, img, p.title, p.featured ? '<span class="lc-tier">&#11088; FEATURED</span>' : '') +
    '<div class="lc-body">' +
      '<p class="lc-price">' + fmtKsh(p.price) + (p.negotiable ? ' <small class="text-muted">Negotiable</small>' : '') + '</p>' +
      '<h3 class="lc-title"><a href="marketplace.html?id=' + p._id + '">' + esc(p.title) + '</a></h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(p.category) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(p.location) + '</p>' +
      '<div class="lc-foot"><span class="lc-meta"><i class="fa-solid fa-rotate"></i> ' + esc(p.condition || '') + '</span><span class="lc-meta"><i class="fa-regular fa-clock"></i> ' + timeAgo(p.createdAt) + '</span></div>' +
    '</div>' +
  '</div>';
};

const salaryLabel = (j) => {
  if (j.salary && j.salary > 0) {
    const unit = { Daily: '/day', Weekly: '/week', Monthly: '/mo' }[j.salaryType] || '';
    return fmtKsh(j.salary) + unit;
  }
  return 'Negotiable';
};

const renderJobCard = (j) =>
  '<div class="card listing-card">' +
    '<div class="lc-body">' +
      '<p class="lc-price" style="color:var(--green)">' + esc(salaryLabel(j)) + '</p>' +
      '<h3 class="lc-title"><a href="jobs.html?id=' + j._id + '">' + esc(j.title) + '</a></h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-building"></i> ' + esc(j.employer) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(j.location) + '</p>' +
      '<p class="lc-desc">' + esc(j.description) + '</p>' +
      '<div class="lc-foot"><span class="badge badge-blue">' + esc(j.category) + '</span><span class="lc-meta"><i class="fa-regular fa-clock"></i> ' + timeAgo(j.createdAt) + '</span></div>' +
    '</div>' +
  '</div>';

const renderRentalCard = (r) => {
  const img = r.images && r.images.length ? r.images[0] : null;
  const avail = '<span class="lc-tier" style="background:' + (r.available ? '#0f6d3a;color:#fff">Available' : '#8a5d05;color:#fff">Taken') + '</span>';
  return '<div class="card listing-card">' +
    mediaBox('rentals.html?id=' + r._id, img, r.title, avail) +
    '<div class="lc-body">' +
      '<p class="lc-price">' + fmtKsh(r.price) + ' <small class="text-muted">/month</small></p>' +
      '<h3 class="lc-title"><a href="rentals.html?id=' + r._id + '">' + esc(r.title) + '</a></h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-house"></i> ' + esc(r.propertyType) + (r.rooms > 0 ? ' &middot; ' + r.rooms + ' room(s)' : '') + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(r.location) + '</p>' +
    '</div>' +
  '</div>';
};

const renderNoticeCard = (n) =>
  '<div class="card listing-card">' +
    '<div class="lc-body">' +
      '<h3 class="lc-title"><a href="notices.html?id=' + n._id + '">' + esc(n.title) + '</a></h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-bullhorn"></i> ' + esc(n.category) + (n.location ? ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(n.location) : '') + '</p>' +
      '<p class="lc-desc">' + esc(n.description) + '</p>' +
      '<div class="lc-foot"><span class="lc-meta"><i class="fa-regular fa-clock"></i> ' + timeAgo(n.createdAt) + '</span></div>' +
    '</div>' +
  '</div>';

const renderPager = (p) => {
  if (!p || p.pages <= 1) return '';
  return '<button class="pg-prev" data-pg="' + (p.page - 1) + '" ' + (p.page <= 1 ? 'disabled' : '') + '><i class="fa-solid fa-chevron-left"></i> Prev</button>' +
    '<span class="pg-info">Page ' + p.page + ' of ' + p.pages + ' &middot; ' + p.total + ' items</span>' +
    '<button class="pg-next" data-pg="' + (p.page + 1) + '" ' + (p.page >= p.pages ? 'disabled' : '') + '>Next <i class="fa-solid fa-chevron-right"></i></button>';
};

const skeletonGrid = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) s += '<div class="sk-card"></div>';
  return s;
};