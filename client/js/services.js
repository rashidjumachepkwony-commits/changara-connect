/* CHANGARA CONNECT - Services (providers, transport, farm) */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    service: params.get('service') || '',
    page: 1
  };

  const sSearch = document.getElementById('sSearch');
  const sCat = document.getElementById('sCat');
  sSearch.value = state.q;

  fillCategorySelect(sCat, 'business', state.category);

  document.querySelectorAll('#svcTabs .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.service = chip.getAttribute('data-service');
      state.page = 1;
      markTab();
      load();
    });
  });
  function markTab() {
    document.querySelectorAll('#svcTabs .chip').forEach((c) => {
      const on = c.getAttribute('data-service') === state.service;
      c.style.color = on ? '#fff' : 'var(--primary)';
      c.style.background = on ? 'var(--primary)' : '#fff';
      c.style.borderColor = 'var(--primary)';
    });
  }
  markTab();

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  sSearch.addEventListener('input', deb);
  sCat.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applySvc').addEventListener('click', () => { state.page = 1; load(); });

  async function load() {
    const grid = document.getElementById('svcGrid');
    const pager = document.getElementById('svcPager');
    const count = document.getElementById('svcCount');
    state.q = sSearch.value.trim();
    state.category = sCat.value;

    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';

    const qs = new URLSearchParams({ page: state.page, limit: 12 });
    if (state.q) qs.set('q', state.q);
    if (state.category) qs.set('category', state.category);
    if (state.service) qs.set('service', state.service);

    const base = state.service === 'transport' ? '/api/services/transport' : '/api/services';
    try {
      const res = await API.get(base + '?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No providers found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wrench"></i><h3>No providers found</h3><p>Try a different search or <a href="businesses.html">list your service</a>.</p></div>';
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' provider' + ((pg && pg.total === 1) ? '' : 's');
      grid.innerHTML = items.map(serviceCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load services</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" type="button" data-retry-services>Retry</button></div>';
      grid.querySelector('[data-retry-services]').addEventListener('click', load);
    }
  }
/* ===== SVC_DETAIL ===== */
  function serviceCard(b) {
    const wb = waLinkFor(b);
    const tel = buildTelLink(b.phone);
    return '<div class="card listing-card">' +
      '<div class="lc-body">' +
        '<h3 class="lc-title">' + esc(b.name) + ' ' + tierBadge(b) + (b.verified ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i></span>' : '') + '</h3>' +
        '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(b.category) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(b.location) + '</p>' +
        '<p class="lc-desc">' + esc(b.description) + '</p>' +
        '<div class="grid grid-3 mt-1" style="gap:8px">' +
          '<a class="lc-btn-call" href="' + tel + '"><i class="fa-solid fa-phone"></i> CALL</a>' +
          (wb ? '<a class="lc-btn-wa" href="' + wb + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' : '') +
          '<button class="lc-btn-call" data-view="' + b._id + '">VIEW PROFILE</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('svcGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    const bid = btn.getAttribute('data-view');
    const box = document.getElementById('svcBody');
    box.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:150px"></div>';
    openModal('svcDetail');
    try {
      const res = await API.get('/api/businesses/' + encodeURIComponent(bid));
      const b = res.data;
      const wb = buildWhatsAppLink(b.whatsapp || b.phone);
      box.innerHTML =
        '<h3>' + esc(b.name) + '</h3>' +
        '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(b.category) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(b.location) + '</p>' +
        '<p class="mt-1">' + esc(b.description) + '</p>' +
        ((b.services || []).length ? '<p class="mt-1"><b>Services:</b> ' + b.services.map((s) => esc(s)).join(', ') + '</p>' : '') +
        (b.openingHours ? '<p class="lc-sub"><i class="fa-regular fa-clock"></i> ' + esc(b.openingHours) + '</p>' : '') +
        '<div class="grid grid-2 mt-2">' +
          '<a class="btn btn-primary btn-block" href="' + buildTelLink(b.phone) + '"><i class="fa-solid fa-phone"></i> CALL NOW</a>' +
          '<a class="btn btn-whatsapp btn-block" href="' + wb + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' +
        '</div>' +
        '<a class="btn btn-outline btn-block mt-1" href="business-details.html?id=' + b._id + '">VIEW FULL PROFILE</a>';
    } catch (err) {
      box.innerHTML = '<p class="text-danger">' + esc(apiErrorMessage(err)) + '</p>';
    }
  });

  load();
});