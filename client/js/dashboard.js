/* CHANGARA CONNECT - Role-aware dashboard */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html?next=' + encodeURIComponent('dashboard.html');
    return;
  }

  const body = document.getElementById('dashBody');
  const nav = document.getElementById('dashNav');
  const params = new URLSearchParams(window.location.search);
  let section = params.get('s') || 'overview';

  const USER_TABS = [
    { k: 'overview', label: 'Overview', icon: 'fa-gauge-high' },
    { k: 'listings', label: 'My Listings', icon: 'fa-layer-group' },
    { k: 'saved', label: 'Saved Items', icon: 'fa-bookmark' },
    { k: 'inquiries', label: 'My Inquiries', icon: 'fa-inbox' },
    { k: 'profile', label: 'My Profile', icon: 'fa-user-gear' }
  ];
  const ADMIN_TABS = [
    { k: 'admin', label: 'Admin Dashboard', icon: 'fa-gauge-high' },
    { k: 'pending', label: 'Pending Approvals', icon: 'fa-hourglass-half' },
    { k: 'businesses', label: 'Businesses', icon: 'fa-store' },
    { k: 'products', label: 'Marketplace', icon: 'fa-cart-shopping' },
    { k: 'jobs', label: 'Jobs', icon: 'fa-briefcase' },
    { k: 'rentals', label: 'Rentals', icon: 'fa-house' },
    { k: 'notices', label: 'Notices', icon: 'fa-bullhorn' },
    { k: 'users', label: 'Users', icon: 'fa-users' },
    { k: 'ads', label: 'Advertisements', icon: 'fa-rectangle-ad' },
    { k: 'categories', label: 'Categories', icon: 'fa-tags' },
    { k: 'reports', label: 'Reports', icon: 'fa-flag' },
    { k: 'payments', label: 'Payments', icon: 'fa-money-bill-wave' },
    { k: 'inquiries', label: 'Inquiries', icon: 'fa-inbox' },
    { k: 'profile', label: 'My Profile', icon: 'fa-user-gear' }
  ];

  boot();

  async function boot() {
    let me;
    try {
      const res = await API.get('/api/auth/me');
      me = res.data;
      Auth.setUser(me);
      refreshAuthShell();
    } catch (err) {
      body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-wifi"></i><h3>Could not load dashboard</h3><p>' + esc(apiErrorMessage(err)) + '</p></div>';
      return;
    }
    document.getElementById('dashTitle').textContent = me.role === 'ADMIN' ? 'Admin Dashboard' : 'My Dashboard';
    document.getElementById('dashSub').textContent = 'Welcome, ' + me.name + '.';
    document.getElementById('sideName').textContent = me.name;
    document.getElementById('sideRole').textContent = me.role === 'ADMIN' ? 'Administrator' : me.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Member';

    const tabs = me.role === 'ADMIN' ? ADMIN_TABS : USER_TABS;
    if (!tabs.find((t) => t.k === section)) section = tabs[0].k;
    renderNav(tabs, me);
    showSection(me);
    body.addEventListener('click', (e) => wireActions(e, me));
  }

  function renderNav(tabs, me) {
    const pendingBadge = me._pendingCount > 0 ? '<span class="nav-badge">' + me._pendingCount + '</span>' : '';
    nav.innerHTML = tabs.map((t) => {
      const badge = t.k === 'pending' ? pendingBadge : '';
      return '<button data-tab="' + t.k + '" class="' + (t.k === section ? 'active' : '') + '"><i class="fa-solid ' + t.icon + '"></i> ' + esc(t.label) + badge + '</button>';
    }).join('');
    if (me.role === 'ADMIN') countPending(me);
    nav.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        section = b.getAttribute('data-tab');
        nav.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('s', section);
        window.history.pushState({}, '', nextUrl);
        showSection(me);
      })
    );
    window.addEventListener('popstate', () => {
      const selected = new URLSearchParams(window.location.search).get('s');
      if (!tabs.some((tab) => tab.k === selected)) return;
      section = selected;
      nav.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === section));
      showSection(me);
    });
  }

  async function countPending(me) {
    try {
      const res = await API.get('/api/admin/pending');
      if (res.success) {
        me._pendingCount = res.data.total || 0;
        const btn = nav.querySelector('[data-tab="pending"]');
        const badge = btn && btn.querySelector('.nav-badge');
        if (me._pendingCount > 0) {
          if (badge) badge.textContent = me._pendingCount;
          else if (btn) btn.insertAdjacentHTML('beforeend', '<span class="nav-badge">' + me._pendingCount + '</span>');
        } else if (badge) {
          badge.remove();
        }
      }
    } catch (e) { /* ignore */ }
  }

  function showSection(me) {
    const sections = me.role === 'ADMIN'
      ? {
          admin: () => adminHome(),
          pending: () => adminPending(),
          businesses: () => adminListings('businesses'),
          products: () => adminListings('products'),
          jobs: () => adminListings('jobs'),
          rentals: () => adminListings('rentals'),
          notices: () => adminListings('notices'),
          users: () => adminUsers(),
          ads: () => adminAds(),
          categories: () => adminCategories(),
          reports: () => adminReports(),
          payments: () => adminPayments(),
          inquiries: () => userInquiries(me),
          profile: () => dashboardProfile(me)
        }
      : {
          overview: () => userOverview(me),
          listings: () => userListings(),
          saved: () => userSaved(),
          inquiries: () => userInquiries(me),
          profile: () => dashboardProfile(me)
        };

    const render = sections[section];
    if (render) render();
  }

  function statusDot(s) {
    return '<span class="status-dot ' + String(s).toLowerCase() + '"></span>' + esc(s);
  }

  function listingRow(type, it) {
    const name = it.name || it.title;
    const view = type === 'business' ? 'business-details.html?id=' + it._id : '#';
    return '<tr><td><a href="' + view + '">' + esc(name) + '</a></td><td>' + statusDot(it.status) + '</td><td>' + fmtDate(it.createdAt) + '</td><td><span class="actions"><button class="btn btn-sm btn-ghost" data-view="' + it._id + '" data-type="' + type + '">View</button><button class="btn btn-sm btn-danger" data-del="' + it._id + '" data-type="' + type + '">Delete</button></span></td></tr>';
  }
/* ===== DASH_USER ===== */
  function stat(label, num, sub) {
    return '<div class="stat-card"><small>' + esc(label) + '</small><div class="stat-num">' + esc(String(num)) + '</div><div class="stat-sub">' + esc(sub || '') + '</div></div>';
  }

  async function userOverview(me) {
    body.innerHTML = '<div class="stat-grid">' + skeletonGrid(4) + '</div>';
    try {
      const res = await API.get('/api/user/listings');
      const d = res.data;
      const n = (a) => (a || []).length;
      const keys = ['businesses', 'products', 'jobs', 'rentals', 'notices'];
      const approved = keys.reduce((s, k) => s + (d[k] || []).filter((i) => i.status === 'APPROVED').length, 0);
      const pending = keys.reduce((s, k) => s + (d[k] || []).filter((i) => i.status === 'PENDING').length, 0);
      const total = keys.reduce((s, k) => s + n(d[k]), 0);
      body.innerHTML =
        '<div class="stat-grid">' +
          stat('My Listings', total, 'across all sections') +
          stat('Live', approved, 'approved listings') +
          stat('Pending', pending, 'awaiting review') +
          stat('Account', me.role === 'BUSINESS_OWNER' ? 'Owner' : 'Member', me.phone || '') +
        '</div>' +
        '<div class="card mt-2"><div class="card-body"><h3>Quick actions</h3><div class="flex mt-1" style="flex-wrap:wrap">' +
          '<a class="btn btn-green btn-sm" href="businesses.html">List a business</a>' +
          '<a class="btn btn-outline btn-sm" href="marketplace.html">Sell an item</a>' +
          '<a class="btn btn-outline btn-sm" href="jobs.html">Post a job</a>' +
          '<a class="btn btn-outline btn-sm" href="rentals.html">List property</a>' +
          '<a class="btn btn-ghost btn-sm" href="profile.html">Edit profile</a>' +
        '</div></div></div>';
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }

  function ownBlock(title, type, items) {
    if (!items || !items.length) return '';
    const rows = items.map((i) => {
      const note = i.adminNote ? '<br><small class="text-muted">Admin note: ' + esc(i.adminNote) + '</small>' : '';
      return '<tr><td>' + esc(i.name || i.title) + note + '</td><td>' + statusDot(i.status) + '</td><td>' + (i.views || 0) + '</td><td>' + fmtDate(i.createdAt) + '</td><td><span class="actions"><button class="btn btn-sm btn-danger" data-del="' + i._id + '" data-type="' + type + '">Delete</button></span></td></tr>';
    }).join('');
    return '<h3 class="mt-2">' + esc(title) + ' (' + items.length + ')</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Status</th><th>Views</th><th>Date</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  async function userListings() {
    body.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div>';
    try {
      const res = await API.get('/api/user/listings');
      const d = res.data;
      const html =
        ownBlock('My Businesses', 'business', d.businesses) +
        ownBlock('My Products', 'product', d.products) +
        ownBlock('My Jobs', 'job', d.jobs) +
        ownBlock('My Rentals', 'rental', d.rentals) +
        ownBlock('My Notices', 'notice', d.notices);
      body.innerHTML = html || '<div class="empty-state"><i class="fa-solid fa-layer-group"></i><h3>No listings yet</h3><p>Your businesses, products, jobs, rentals and notices will appear here.</p></div>';
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }
/* ===== DASH_SAVED ===== */
  async function userSaved() {
    body.innerHTML = '<div class="grid grid-auto">' + skeletonGrid(4) + '</div>';
    try {
      const res = await API.get('/api/user/favorites');
      const g = res.data || {};
      const collect = (items, renderer) => (items || []).map((f) => '<div>' + renderer(f.item) + '<button class="btn btn-sm btn-ghost mt-1" data-unsave="' + f.favoriteId + '"><i class="fa-solid fa-trash"></i> Remove</button></div>').join('');
      const html =
        collect(g.business, renderBusinessCard) +
        collect(g.product, renderProductCard) +
        collect(g.job, renderJobCard) +
        collect(g.rental, renderRentalCard);
      body.innerHTML = html ? '<div class="grid grid-auto">' + html + '</div>' : '<div class="empty-state"><i class="fa-solid fa-bookmark"></i><h3>No saved items</h3><p>Tap "Save" on any listing to find it here.</p></div>';
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }

  async function userInquiries(me) {
    body.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div>';
    try {
      const [res, businesses] = await Promise.all([
        API.get('/api/user/inquiries'),
        me.role === 'ADMIN' ? API.get('/api/admin/businesses') : Promise.resolve({ data: [] })
      ]);
      const businessNames = new Map((businesses.data || []).map((business) => [business._id, business.name]));
      const items = res.data || [];
      if (!items.length) {
        body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><h3>No inquiries yet</h3><p>Messages customers send about your businesses will appear here.</p></div>';
        return;
      }
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Business</th><th>From</th><th>Message</th></tr></thead><tbody>' +
        items.map((q) => {
          const businessId = q.businessId || q.business_id || (q.business && (q.business._id || q.business.id));
          const businessName = q.business && q.business.name || businessNames.get(businessId) || 'Business';
          return '<tr><td>' + fmtDate(q.createdAt) + '</td><td>' + esc(businessName) + '</td><td>' + esc(q.name) + '<br><a href="' + buildTelLink(q.phone) + '">' + esc(q.phone) + '</a></td><td>' + esc(q.message) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }

  function dashboardProfile(me) {
    body.innerHTML =
      '<form class="form-card" id="dashboardProfileForm">' +
        '<h3>Account details</h3>' +
        '<div class="form-group"><label class="form-label" for="dashProfileName">Full name</label><input class="form-input" id="dashProfileName" name="name" required value="' + esc(me.name || '') + '"></div>' +
        '<div class="form-group"><label class="form-label" for="dashProfilePhone">Phone</label><input class="form-input" id="dashProfilePhone" value="' + esc(me.phone || '') + '" disabled></div>' +
        '<div class="form-group"><label class="form-label" for="dashProfileEmail">Email</label><input class="form-input" id="dashProfileEmail" name="email" type="email" value="' + esc(me.email || '') + '"></div>' +
        '<div class="form-group"><label class="form-label" for="dashProfileLocation">Location</label><input class="form-input" id="dashProfileLocation" name="location" value="' + esc(me.location || '') + '"></div>' +
        '<p class="form-error" id="dashProfileError" role="alert"></p>' +
        '<button class="btn btn-primary" type="submit" id="dashProfileSave">Save profile</button>' +
      '</form>' +
      '<form class="form-card mt-2" id="dashboardPasswordForm">' +
        '<h3>Change password</h3>' +
        '<div class="form-group"><label class="form-label" for="dashCurrentPassword">Current password</label><input class="form-input" id="dashCurrentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div>' +
        '<div class="form-group"><label class="form-label" for="dashNewPassword">New password</label><input class="form-input" id="dashNewPassword" name="newPassword" type="password" autocomplete="new-password" minlength="6" required></div>' +
        '<p class="form-error" id="dashPasswordError" role="alert"></p>' +
        '<button class="btn btn-outline" type="submit" id="dashPasswordSave">Update password</button>' +
      '</form>';

    document.getElementById('dashboardProfileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = document.getElementById('dashProfileError');
      const button = document.getElementById('dashProfileSave');
      error.classList.remove('show');
      loadingBtn(button, true);
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        const result = await API.put('/api/user/profile', values);
        Object.assign(me, result.data);
        Auth.setUser(result.data);
        document.getElementById('sideName').textContent = result.data.name;
        document.getElementById('dashSub').textContent = 'Welcome, ' + result.data.name + '.';
        refreshAuthShell();
        toast(result.message || 'Profile updated.', 'success');
      } catch (err) {
        error.textContent = apiErrorMessage(err);
        error.classList.add('show');
      } finally {
        loadingBtn(button, false);
      }
    });

    document.getElementById('dashboardPasswordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = document.getElementById('dashPasswordError');
      const button = document.getElementById('dashPasswordSave');
      error.classList.remove('show');
      loadingBtn(button, true);
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        const result = await API.put('/api/user/profile', values);
        toast(result.message || 'Password updated.', 'success');
        form.reset();
      } catch (err) {
        error.textContent = apiErrorMessage(err);
        error.classList.add('show');
      } finally {
        loadingBtn(button, false);
      }
    });
  }
/* ===== DASH_ADMIN ===== */
  async function adminHome() {
    body.innerHTML = '<div class="stat-grid">' + skeletonGrid(8) + '</div>';
    try {
      const res = await API.get('/api/admin/dashboard');
      const d = res.data;
      const t = d.totals;
      const p = d.pending;
      body.innerHTML =
        '<div class="stat-grid">' +
          stat('Users', t.users, d.today.users + ' today') +
          stat('Businesses', t.businesses, p.businesses + ' pending') +
          stat('Products', t.products, p.products + ' pending') +
          stat('Jobs', t.jobs, p.jobs + ' pending') +
          stat('Rentals', t.rentals, p.rentals + ' pending') +
          stat('Notices', t.notices, p.notices + ' pending') +
          stat('Reports', t.openReports, 'open') +
          stat('Ad Revenue', 'KSh ' + Number(d.featuredRevenue || 0), 'featured/premium') +
        '</div>' +
        '<div class="grid grid-2 mt-2" style="align-items:start">' +
          '<div class="card"><div class="card-body"><h3>Most popular categories</h3>' + catBars(d.popularCategories) + '</div></div>' +
          '<div class="card"><div class="card-body"><h3>Most viewed businesses</h3>' + topBiz(d.topBusinesses) + '</div></div>' +
        '</div>';
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }

  function catBars(list) {
    if (!list || !list.length) return '<p class="text-muted">No data yet.</p>';
    const max = Math.max.apply(null, list.map((c) => c.count)) || 1;
    return list.map((c) => {
      const w = Math.round((c.count / max) * 100);
      return '<div class="bar-row"><span class="bar-label">' + esc(c._id || 'Unknown') + '</span><span class="bar-track"><span class="bar-fill" style="width:' + w + '%"></span></span><span class="bar-num">' + c.count + '</span></div>';
    }).join('');
  }

  function topBiz(list) {
    if (!list || !list.length) return '<p class="text-muted">No data yet.</p>';
    return '<ul style="list-style:none;padding:0">' + list.map((b) => '<li class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--border)"><a href="business-details.html?id=' + b._id + '">' + esc(b.name) + '</a><span class="lc-meta"><i class="fa-regular fa-eye"></i> ' + (b.views || 0) + '</span></li>').join('') + '</ul>';
  }

  const MOD_LABEL = { businesses: 'Business', products: 'Product', jobs: 'Job', rentals: 'Rental', notices: 'Notice' };
  const MOD_PLURAL = { businesses: 'Businesses', products: 'Products', jobs: 'Jobs', rentals: 'Rentals', notices: 'Notices' };
  const MOD_API = { businesses: 'businesses', products: 'products', jobs: 'jobs', rentals: 'rentals', notices: 'notices' };
  const MOD_OWNER = { businesses: 'owner', products: 'seller', jobs: 'poster', rentals: 'owner', notices: 'author' };

  async function adminPending() {
    body.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:240px"></div>';
    try {
      const res = await API.get('/api/admin/pending');
      const d = res.data;
      if (!d.total) {
        body.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-check"></i><h3>All caught up</h3><p>No listings waiting for review.</p></div>';
        return;
      }
      const secHtml = (type, items) => {
        if (!items || !items.length) return '';
        const rows = items.map((i) => pendingRow(type, i)).join('');
        return '<h3 class="mt-2">' + MOD_PLURAL[type] + ' (' + items.length + ')</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Title</th><th>Owner</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      };
      body.innerHTML =
        '<div class="stat-grid">' + stat('Waiting for review', d.total, 'across all sections') + '</div>' +
        secHtml('businesses', d.businesses) +
        secHtml('products', d.products) +
        secHtml('jobs', d.jobs) +
        secHtml('rentals', d.rentals) +
        secHtml('notices', d.notices);
    } catch (err) {
      body.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  }
/* ===== DASH_MOD ===== */
  function ownerName(i, type) {
    const o = i[MOD_OWNER[type]];
    return o ? (o.name + (o.phone ? ' (' + o.phone + ')' : '')) : '-';
  }

  function pendingRow(type, i) {
    const title = esc(i.name || i.title);
    const viewUrl = type === 'businesses' ? 'business-details.html?id=' + i._id : '#';
    return '<tr><td>' + fmtDate(i.createdAt) + '</td><td>' + (type === 'businesses' ? '<a href="' + viewUrl + '">' + title + '</a>' : title) + '<br><small class="text-muted">' + esc(i.category || i.propertyType || '') + '</small></td><td>' + esc(ownerName(i, type)) + '</td><td><span class="actions">' +
      '<button class="btn btn-sm btn-green" data-approve="' + i._id + '" data-type="' + type + '">Approve</button>' +
      '<button class="btn btn-sm btn-ghost" data-reject="' + i._id + '" data-type="' + type + '">Reject</button>' +
      '<button class="btn btn-sm btn-danger" data-del="' + i._id + '" data-type="' + type + '">Delete</button>' +
    '</span></td></tr>';
  }

  let modStatus = 'ALL';
  async function adminListings(type) {
    modStatus = 'ALL';
    body.innerHTML =
      '<div class="dash-tabs">' + ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => '<button data-st="' + s + '" class="' + (modStatus === s ? 'active' : '') + '">' + s + '</button>').join('') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Status</th><th></th></tr></thead><tbody id="modRows"><tr><td colspan="3">Loading...</td></tr></tbody></table></div>';
    body.querySelectorAll('[data-st]').forEach((b) =>
      b.addEventListener('click', () => {
        modStatus = b.getAttribute('data-st');
        body.querySelectorAll('[data-st]').forEach((x) => x.classList.toggle('active', x === b));
        fillMod(type);
      })
    );
    async function fillMod(t) {
      const rows = document.getElementById('modRows');
      try {
        const res = await API.get('/api/admin/' + MOD_API[t] + '?status=' + modStatus);
        const items = res.data || [];
        if (!items.length) { rows.innerHTML = '<tr><td colspan="3">No ' + MOD_PLURAL[t].toLowerCase() + ' in this state.</td></tr>'; return; }
        rows.innerHTML = items.map((i) => {
          const title = esc(i.name || i.title);
          return '<tr><td>' + title + '<br><small class="text-muted">' + esc(i.category || i.propertyType || '') + '</small></td><td>' + statusDot(i.status) + '</td><td><span class="actions">' +
            '<button class="btn btn-sm btn-outline" data-media="' + i._id + '">Manage media</button>' +
            '<button class="btn btn-sm btn-green" data-approve="' + i._id + '" data-type="' + t + '">Approve</button>' +
            '<button class="btn btn-sm btn-ghost" data-reject="' + i._id + '" data-type="' + t + '">Reject</button>' +
            '<button class="btn btn-sm btn-orange" data-suspend="' + i._id + '" data-type="' + t + '">Suspend</button>' +
            (t === 'businesses' ? '<button class="btn btn-sm btn-outline" data-feature="' + i._id + '">Feature</button><button class="btn btn-sm btn-outline" data-verify="' + i._id + '">Verify</button>' : '') +
            (t === 'products' ? '<button class="btn btn-sm btn-outline" data-pfeature="' + i._id + '">Feature</button>' : '') +
            '<button class="btn btn-sm btn-danger" data-del="' + i._id + '" data-type="' + t + '">Delete</button>' +
          '</span></td></tr>';
        }).join('');
        rows.querySelectorAll('[data-media]').forEach((button) => {
          button.addEventListener('click', () => {
            const item = items.find((entry) => entry._id === button.getAttribute('data-media'));
            if (item) adminMediaForm(t, item);
          });
        });
      } catch (err) {
        rows.innerHTML = '<tr><td colspan="3">' + esc(apiErrorMessage(err)) + '</td></tr>';
      }
    }
    fillMod(type);
  }

  function adminMediaForm(type, item) {
    const title = item.name || item.title || MOD_LABEL[type];
    body.innerHTML =
      '<form class="form-card" id="listingMediaForm" enctype="multipart/form-data">' +
        '<h3>Manage media: ' + esc(title) + '</h3>' +
        '<p class="text-muted">Existing uploads are kept. New uploads are added to this listing.</p>' +
        renderMediaGallery(getListingMedia(item), title) +
        '<div class="form-group"><label class="form-label" for="listingMedia">Add photos, audio or video (up to 6 files)</label><label class="file-input">Choose media<input type="file" id="listingMedia" name="media" accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,video/mp4,video/webm,video/quicktime" multiple></label><div class="img-preview" id="listingMediaPreview"></div></div>' +
        '<p class="form-error" id="listingMediaError"></p>' +
        '<button class="btn btn-primary" type="submit">Save media</button> <button class="btn btn-ghost" type="button" id="listingMediaCancel">Cancel</button>' +
      '</form>';
    bindMediaPreview('listingMedia', 'listingMediaPreview');
    document.getElementById('listingMediaCancel').addEventListener('click', () => adminListings(type));
    document.getElementById('listingMediaForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.getElementById('listingMediaError');
      error.classList.remove('show');
      if (!document.getElementById('listingMedia').files.length) {
        error.textContent = 'Choose at least one media file to upload.';
        error.classList.add('show');
        return;
      }
      try {
        await API.putForm('/api/' + MOD_API[type] + '/' + encodeURIComponent(item._id), new FormData(event.currentTarget));
        toast('Listing media updated.', 'success');
        adminListings(type);
      } catch (err) {
        error.textContent = apiErrorMessage(err);
        error.classList.add('show');
      }
    });
  }
/* ===== DASH_REST ===== */
  async function adminUsers() {
    body.innerHTML = '<div class="filters"><div class="f"><input id="uSearch" type="search" placeholder="Search users by name, phone or email..."></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Account</th><th>Actions</th></tr></thead><tbody id="uRows"><tr><td colspan="5">Loading...</td></tr></tbody></table></div>';
    document.getElementById('uSearch').addEventListener('input', debounce(loadUsers, 400));
    async function loadUsers() {
      const q = document.getElementById('uSearch').value.trim();
      const rows = document.getElementById('uRows');
      try {
        const res = await API.get('/api/admin/users' + (q ? '?q=' + encodeURIComponent(q) : ''));
        if (!res.data.length) { rows.innerHTML = '<tr><td colspan="5">No users found.</td></tr>'; return; }
        rows.innerHTML = res.data.map((u) => '<tr><td>' + esc(u.name) + '<br><small class="text-muted">' + fmtDate(u.createdAt) + '</small></td><td>' + esc(u.email || '-') + '<br><a href="' + buildTelLink(u.phone) + '">' + esc(u.phone) + '</a></td><td>' + esc(u.role) + '</td><td>' + (u.isActive ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Suspended</span>') + '</td><td><span class="actions"><button class="btn btn-sm btn-ghost" data-suspend-u="' + u._id + '" data-active="' + u.isActive + '">' + (u.isActive ? 'Suspend' : 'Activate') + '</button><button class="btn btn-sm btn-outline" data-role="' + u._id + '">Change role</button></span></td></tr>').join('');
      } catch (err) { rows.innerHTML = '<tr><td colspan="5">' + esc(apiErrorMessage(err)) + '</td></tr>'; }
    }
    loadUsers();
  }

  async function adminAds() {
    body.innerHTML = '<button class="btn btn-green mb-2" id="newAdBtn"><i class="fa-solid fa-plus"></i> New advertisement</button><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Placement</th><th>Status</th><th></th></tr></thead><tbody id="adRows"><tr><td colspan="4">Loading...</td></tr></tbody></table></div>';
    document.getElementById('newAdBtn').addEventListener('click', () => adForm());
    async function loadAds() {
      const rows = document.getElementById('adRows');
      try {
        const res = await API.get('/api/admin/ads');
        if (!res.data.length) { rows.innerHTML = '<tr><td colspan="4">No advertisements yet.</td></tr>'; return; }
        rows.innerHTML = res.data.map((a) => '<tr><td>' + esc(a.title) + '</td><td>' + esc(a.placement) + '</td><td>' + (a.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-grey">Inactive</span>') + '</td><td><span class="actions"><button class="btn btn-sm btn-outline" data-editad="' + a._id + '">Edit</button><button class="btn btn-sm btn-danger" data-delad="' + a._id + '">Delete</button></span></td></tr>').join('');
      } catch (err) { rows.innerHTML = '<tr><td colspan="4">' + esc(apiErrorMessage(err)) + '</td></tr>'; }
    }
    loadAds();
    window._dashReload = () => { if (section === 'ads') adminAds(); };
  }

  function adForm(ad) {
    ad = ad || {};
    body.innerHTML =
      '<form class="form-card" id="adForm" enctype="multipart/form-data">' +
        '<h3>' + (ad._id ? 'Edit advertisement' : 'New advertisement') + '</h3>' +
        '<div class="form-group"><label class="form-label">Title *</label><input class="form-input" name="title" required value="' + esc(ad.title || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description">' + esc(ad.description || '') + '</textarea></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Placement</label><select class="form-select" name="placement"><option' + (ad.placement === 'homepage' ? ' selected' : '') + '>homepage</option><option' + (ad.placement === 'category' ? ' selected' : '') + '>category</option><option' + (ad.placement === 'sidebar' ? ' selected' : '') + '>sidebar</option><option' + (ad.placement === 'sponsored' ? ' selected' : '') + '>sponsored</option></select></div>' +
        '<div class="form-group"><label class="form-label">Link (optional)</label><input class="form-input" name="link" value="' + esc(ad.link || '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">Start date</label><input class="form-input" type="date" name="startDate"></div>' +
        '<div class="form-group"><label class="form-label">End date</label><input class="form-input" type="date" name="endDate"></div></div>' +
        '<div class="form-group"><label class="form-label" for="adMedia">Photos, audio or video (up to 6 files)</label><label class="file-input">Choose media<input type="file" id="adMedia" name="media" accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,video/mp4,video/webm,video/quicktime" multiple></label><div class="img-preview" id="adMediaPreview"></div></div>' +
        renderMediaGallery(getListingMedia(ad), ad.title || 'Advertisement') +
        '<div class="form-group"><label class="check-inline"><input type="checkbox" name="active" value="true" ' + (ad.active ? 'checked' : '') + '> Active</label></div>' +
        '<p class="form-error" id="adErr"></p>' +
        '<button class="btn btn-primary" type="submit">' + (ad._id ? 'Save changes' : 'Create advertisement') + '</button> ' +
        '<button class="btn btn-ghost" type="button" id="adCancel">Cancel</button>' +
      '</form>';
    bindMediaPreview('adMedia', 'adMediaPreview');
    document.getElementById('adCancel').addEventListener('click', () => adminAds());
    document.getElementById('adForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('adErr');
      errEl.classList.remove('show');
      try {
        const fd = new FormData(e.target);
        let res;
        if (ad._id) { res = await API.patchForm('/api/admin/ads/' + ad._id, fd); }
        else { res = await API.postForm('/api/admin/ads', fd); }
        toast(res.message, 'success');
        adminAds();
      } catch (err) { errEl.textContent = apiErrorMessage(err); errEl.classList.add('show'); }
    });
  }
/* ===== DASH_FINAL ===== */
  async function adminCategories() {
    body.innerHTML = '<div class="filters"><div class="f"><input id="cName" placeholder="New category name..."></div><div class="f"><select id="cType"><option value="business">Business</option><option value="product">Product</option><option value="job">Job</option><option value="rental">Rental</option><option value="notice">Notice</option></select></div><button class="btn btn-green" id="cAdd"><i class="fa-solid fa-plus"></i> Add</button></div><div id="catList"><div class="sk-line"></div><div class="sk-line"></div></div>';
    document.getElementById('cAdd').addEventListener('click', async () => {
      const name = document.getElementById('cName').value.trim();
      const type = document.getElementById('cType').value;
      if (!name) { toast('Type a category name first.', 'warning'); return; }
      try {
        const res = await API.post('/api/admin/categories', { name, type });
        toast(res.message, 'success');
        document.getElementById('cName').value = '';
        loadCats();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
    });
    async function loadCats() {
      const box = document.getElementById('catList');
      try {
        const res = await API.get('/api/admin/categories');
        const byType = {};
        res.data.forEach((c) => { (byType[c.type] = byType[c.type] || []).push(c); });
        box.innerHTML = Object.keys(byType).sort().map((t) =>
          '<h3 class="mt-2" style="text-transform:capitalize">' + esc(t) + '</h3>' +
          '<p style="display:flex;flex-wrap:wrap;gap:6px">' +           byType[t].map((c) => '<span class="pill">' + esc(c.name) + ' <button type="button" class="btn btn-sm btn-ghost" data-editcat="' + c._id + '" data-name="' + esc(c.name) + '" aria-label="Rename ' + esc(c.name) + '"><i class="fa-solid fa-pen"></i></button> <a href="#" data-delcat="' + c._id + '" style="color:var(--danger);margin-left:4px" aria-label="Delete ' + esc(c.name) + '">&times;</a></span>').join('') + '</p>'
        ).join('') || '<p class="text-muted">No categories yet.</p>';
      } catch (err) { box.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>'; }
    }
    loadCats();
  }

  async function adminReports() {
    body.innerHTML = '<div class="dash-tabs"><button data-rst="OPEN" class="active">Open</button><button data-rst="RESOLVED">Resolved</button><button data-rst="ALL">All</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Report</th><th>Status</th><th></th></tr></thead><tbody id="repRows"><tr><td colspan="4">Loading...</td></tr></tbody></table></div>';
    let rst = 'OPEN';
    body.querySelectorAll('[data-rst]').forEach((b) =>
      b.addEventListener('click', () => {
        rst = b.getAttribute('data-rst');
        body.querySelectorAll('[data-rst]').forEach((x) => x.classList.toggle('active', x === b));
        fillReports();
      })
    );
    async function fillReports() {
      const rows = document.getElementById('repRows');
      try {
        const res = await API.get('/api/admin/reports?status=' + rst);
        if (!res.data.length) { rows.innerHTML = '<tr><td colspan="4">No ' + rst.toLowerCase() + ' reports.</td></tr>'; return; }
        rows.innerHTML = res.data.map((r) => '<tr><td>' + fmtDate(r.createdAt) + '<br><small class="text-muted">' + esc(r.itemType) + ' / ' + esc(String(r.itemId).slice(0, 8)) + '...</small></td><td><span class="badge badge-orange">' + esc(r.reason) + '</span>' + (r.description ? '<br><small>' + esc(r.description) + '</small>' : '') + '</td><td>' + (r.status === 'OPEN' ? '<span class="badge badge-red">Open</span>' : '<span class="badge badge-green">Resolved</span>') + '</td><td><span class="actions"><button class="btn btn-sm btn-outline" data-resolve="' + r._id + '">' + (r.status === 'OPEN' ? 'Resolve' : 'Reopen') + '</button><button class="btn btn-sm btn-danger" data-delrep="' + r._id + '">Delete</button></span></td></tr>').join('');
      } catch (err) { rows.innerHTML = '<tr><td colspan="4">' + esc(apiErrorMessage(err)) + '</td></tr>'; }
    }
    fillReports();
  }

  async function adminPayments() {
    body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>User</th></tr></thead><tbody id="paymentRows"><tr><td colspan="6">Loading...</td></tr></tbody></table></div>';
    try {
      const res = await API.get('/api/admin/payments');
      const rows = document.getElementById('paymentRows');
      if (!res.data.length) {
        rows.innerHTML = '<tr><td colspan="6">No payment records yet.</td></tr>';
        return;
      }
      rows.innerHTML = res.data.map((payment) =>
        '<tr><td>' + fmtDate(payment.createdAt) + '</td><td>' + esc(payment.transactionId || payment.mpesaReceipt || '-') + '</td><td>' + esc(payment.paymentType || '-') + '</td><td>KSh ' + esc(String(payment.amount || 0)) + '</td><td>' + statusDot(payment.status || 'UNKNOWN') + '</td><td>' + esc(payment.phone || payment.userId || '-') + '</td></tr>'
      ).join('');
    } catch (err) {
      document.getElementById('paymentRows').innerHTML = '<tr><td colspan="6">' + esc(apiErrorMessage(err)) + '</td></tr>';
    }
  }
/* ===== DASH_ACT ===== */
  async function wireActions(e, me) {
    const btn = e.target.closest('button, a');
    if (!btn || !btn.dataset) return;
    const d = btn.dataset;

    if (d.unsave) {
      e.preventDefault();
      if (!confirm('Remove this saved item?')) return;
      try { await API.delete('/api/user/favorites/' + d.unsave); toast('Removed from favourites.', 'success'); showSection(me); }
      catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }

    if (d.del) {
      e.preventDefault();
      if (!confirm('Delete this listing permanently?')) return;
      const map = { business: '/api/businesses/', product: '/api/products/', job: '/api/jobs/', rental: '/api/rentals/', notice: '/api/notices/', businesses: '/api/admin/businesses/', products: '/api/admin/products/', jobs: '/api/admin/jobs/', rentals: '/api/admin/rentals/', notices: '/api/admin/notices/' };
      const base = map[d.type];
      if (!base) return;
      try {
        await API.delete(base + d.del);
        toast('Deleted.', 'success');
        if (base.indexOf('/api/admin') === 0 && me.role === 'ADMIN') {
          if (section === 'pending') {
            adminPending();
            countPending(me);
          } else {
            adminListings(section);
          }
        } else showSection(me);
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }

    if (!me || me.role !== 'ADMIN') return;

    const refresh = () => { if (section === 'pending') adminPending(); else if (section === 'users') adminUsers(); else if (section === 'reports') adminReports(); else adminListings(section); };
    if (d.approve || d.reject || d.suspend) {
      const id = d.approve || d.reject || d.suspend;
      const status = d.approve ? 'APPROVED' : d.reject ? 'REJECTED' : 'SUSPENDED';
      const note = status === 'REJECTED' ? (prompt('Reason for rejection (shown to the owner):', '') || '') : '';
      try {
        const res = await API.patch('/api/admin/' + MOD_API[d.type] + '/' + id + '/status', { status: status, adminNote: note });
        toast(res.message, 'success');
        refresh();
        countPending(me);
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.feature) {
      const type = prompt('Listing type: FREE, FEATURED or PREMIUM', 'FEATURED');
      if (!type) return;
      try {
        const res = await API.patch('/api/admin/businesses/' + d.feature + '/feature', { listingType: type.toUpperCase() });
        toast(res.message, 'success');
        refresh();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.verify) {
      try {
        const res = await API.patch('/api/admin/businesses/' + d.verify + '/verify');
        toast(res.message, 'success');
        refresh();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.pfeature) {
      try {
        const res = await API.patch('/api/admin/products/' + d.pfeature + '/feature');
        toast(res.message, 'success');
        refresh();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.suspendU) {
      if (d.suspendU === (me.id || me._id) && d.active === 'true') {
        toast('You cannot suspend your own administrator account.', 'warning');
        return;
      }
      try {
        const res = await API.patch('/api/admin/users/' + d.suspendU, { isActive: d.active !== 'true' });
        toast(res.message, 'success');
        adminUsers();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.role) {
      const role = prompt('New role: USER, BUSINESS_OWNER or ADMIN', 'BUSINESS_OWNER');
      if (!role) return;
      const normalizedRole = role.toUpperCase();
      if (!['USER', 'BUSINESS_OWNER', 'ADMIN'].includes(normalizedRole)) {
        toast('Choose USER, BUSINESS_OWNER or ADMIN.', 'warning');
        return;
      }
      if (d.role === (me.id || me._id) && normalizedRole !== 'ADMIN') {
        toast('You cannot remove your own administrator role.', 'warning');
        return;
      }
      try {
        const res = await API.patch('/api/admin/users/' + d.role, { role: normalizedRole });
        toast(res.message, 'success');
        adminUsers();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.delcat) {
      e.preventDefault();
      if (!confirm('Delete this category?')) return;
      try { await API.delete('/api/admin/categories/' + d.delcat); toast('Category deleted.', 'success'); adminCategories(); }
      catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.editcat) {
      e.preventDefault();
      const name = prompt('New category name:', d.name || '');
      if (!name || !name.trim()) return;
      try {
        const res = await API.patch('/api/admin/categories/' + d.editcat, { name: name.trim() });
        toast(res.message, 'success');
        adminCategories();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.resolve) {
      try {
        const res = await API.patch('/api/admin/reports/' + d.resolve + '/resolve');
        toast(res.message, 'success');
        adminReports();
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.delrep) {
      if (!confirm('Delete this report?')) return;
      try { await API.delete('/api/admin/reports/' + d.delrep); toast('Report deleted.', 'success'); adminReports(); }
      catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.delad) {
      if (!confirm('Delete this advertisement?')) return;
      try { await API.delete('/api/admin/ads/' + d.delad); toast('Advertisement deleted.', 'success'); adminAds(); }
      catch (err) { toast(apiErrorMessage(err), 'error'); }
      return;
    }
    if (d.editad) {
      try {
        const res = await API.get('/api/admin/ads');
        const ad = res.data.find((a) => a._id === d.editad);
        if (ad) adForm(ad);
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
    }
  }
});