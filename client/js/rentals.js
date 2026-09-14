/* CHANGARA CONNECT - Rentals list + detail + posting */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');
  const state = {
    q: params.get('q') || '',
    propertyType: params.get('propertyType') || '',
    sort: params.get('sort') || 'newest',
    page: 1
  };

  const rSearch = document.getElementById('rSearch');
  const rType = document.getElementById('rType');
  const rSort = document.getElementById('rSort');
  rSearch.value = state.q;
  rType.value = state.propertyType;
  rSort.value = state.sort;

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  rSearch.addEventListener('input', deb);
  rType.addEventListener('change', () => { state.page = 1; load(); });
  rSort.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applyRent').addEventListener('click', () => { state.page = 1; load(); });

  document.getElementById('openRentForm').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      toast('Please log in or create a free account first.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('rentals.html'); }, 900);
      return;
    }
    openModal('postRentModal');
  });
  bindImagePreview('rtImgs', 'rtImgsPrev');
  document.getElementById('rentForm').addEventListener('submit', submitRental);

  async function load() {
    const grid = document.getElementById('rentGrid');
    const pager = document.getElementById('rentPager');
    const count = document.getElementById('rentCount');
    state.q = rSearch.value.trim();
    state.propertyType = rType.value;
    state.sort = rSort.value;

    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';

    const qs = new URLSearchParams({ page: state.page, limit: 12, sort: state.sort });
    if (state.q) qs.set('q', state.q);
    if (state.propertyType) qs.set('propertyType', state.propertyType);

    try {
      const res = await API.get('/api/rentals?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No rentals found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-house"></i><h3>No rentals listed yet</h3><p>Try a different search, or list your own property for free.</p></div>';
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' rental' + ((pg && pg.total === 1) ? '' : 's');
      grid.innerHTML = items.map(renderRentalCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load rentals</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" onclick="location.reload()">Retry</button></div>';
    }
  }
/* ===== RENT_SECOND ===== */
  async function submitRental(e) {
    e.preventDefault();
    const errEl = document.getElementById('rentErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('rentSubmit');
    const form = document.getElementById('rentForm');
    const imgs = document.getElementById('rtImgs');
    if (imgs.files.length > 6) {
      errEl.textContent = 'You can upload a maximum of 6 photos.';
      errEl.classList.add('show');
      return;
    }
    loadingBtn(btn, true);
    try {
      const res = await API.postForm('/api/rentals', new FormData(form));
      toast(res.message || 'Rental submitted.', 'success');
      form.reset();
      closeModal('postRentModal');
      load();
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }

  async function openDetail(rid) {
    const box = document.getElementById('rentDetail');
    box.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div><div class="sk-line"></div>';
    openModal('rentModal');
    try {
      const res = await API.get('/api/rentals/' + encodeURIComponent(rid));
      const r = res.data;
      const imgs = (r.images || []).map((src) => '<img src="' + esc(mediaSrc(src)) + '" alt="' + esc(r.title) + '" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:10px">').join('');
      const wb = buildWhatsAppLink(r.whatsapp || r.phone, 'Hello, I saw your rental "' + r.title + '" on Changara Connect and I am interested.');
      box.innerHTML =
        (imgs ? '<div class="grid grid-2" style="gap:8px;margin-bottom:12px">' + imgs + '</div>' : '') +
        '<p class="lc-price">' + fmtKsh(r.price) + ' <small class="text-muted">/month</small></p>' +
        '<h3>' + esc(r.title) + '</h3>' +
        '<p class="lc-sub"><i class="fa-solid fa-house"></i> ' + esc(r.propertyType) + (r.rooms > 0 ? ' &middot; ' + r.rooms + ' room(s)' : '') + '</p>' +
        '<p class="lc-sub"><i class="fa-solid fa-location-dot"></i> ' + esc(r.location) + '</p>' +
        '<p class="mt-1"><span class="badge ' + (r.available ? 'badge-green">Available' : 'badge-orange">Taken') + '</span></p>' +
        '<p class="mt-1">' + esc(r.description).replace(/\n/g, '<br>') + '</p>' +
        '<div class="grid grid-2 mt-2">' +
          '<a class="btn btn-primary btn-block" href="' + buildTelLink(r.phone) + '"><i class="fa-solid fa-phone"></i> CALL</a>' +
          '<a class="btn btn-whatsapp btn-block" href="' + wb + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' +
        '</div>' +
        '<div class="grid grid-2 mt-1">' +
          '<button class="btn btn-ghost btn-block" id="rdSave"><i class="fa-solid fa-bookmark"></i> SAVE</button>' +
          '<button class="btn btn-ghost btn-block" id="rdReport" style="color:var(--danger)"><i class="fa-solid fa-flag"></i> REPORT</button>' +
        '</div>';

      document.getElementById('rdSave').addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) { toast('Log in to save rentals.', 'warning'); return; }
        try {
          const res = await API.post('/api/rentals/' + r._id + '/favorite');
          toast(res.message, 'success');
        } catch (err) { toast(apiErrorMessage(err), 'error'); }
      });
      document.getElementById('rdReport').addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) { toast('Log in to report rentals.', 'warning'); return; }
        try {
          const res = await API.post('/api/rentals/' + r._id + '/report', { reason: 'Other', description: 'Reported from rental details.' });
          toast(res.message, 'success');
        } catch (err) { toast(apiErrorMessage(err), 'error'); }
      });
    } catch (err) {
      box.innerHTML = '<div class="empty-state"><i class="fa-solid fa-house"></i><h3>Rental not found</h3><p>' + esc(apiErrorMessage(err)) + '</p></div>';
    }
  }

  if (detailId) openDetail(detailId);
  load();
});