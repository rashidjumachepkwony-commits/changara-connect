/* CHANGARA CONNECT - Business directory + registration form */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    location: params.get('location') || '',
    sort: params.get('sort') || 'featured',
    page: parseInt(params.get('page') || '1', 10) || 1
  };

  const fSearch = document.getElementById('fSearch');
  const fCat = document.getElementById('fCat');
  const fLoc = document.getElementById('fLoc');
  const fSort = document.getElementById('fSort');
  fSearch.value = state.q;
  fLoc.value = state.location;
  fSort.value = state.sort;
  fillCategorySelect(fCat, 'business', state.category);
  fillFormCategories();

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  fSearch.addEventListener('input', deb);
  fLoc.addEventListener('input', deb);
  fCat.addEventListener('change', () => { state.page = 1; load(); });
  fSort.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applyFilters').addEventListener('click', () => { state.page = 1; load(); });

  document.getElementById('openBizForm').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      toast('Please log in or create a free account first.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('businesses.html'); }, 900);
      return;
    }
    openModal('bizModal');
  });

  bindImagePreview('bLogo', 'bLogoPrev');
  bindMediaPreview('bMedia', 'bMediaPrev');
  document.getElementById('bizForm').addEventListener('submit', submitBusiness);

  async function load() {
    const grid = document.getElementById('bizGrid');
    const pager = document.getElementById('bizPager');
    const count = document.getElementById('bizCount');
    state.q = fSearch.value.trim();
    state.category = fCat.value;
    state.location = fLoc.value.trim();
    state.sort = fSort.value;

    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';

    const qs = new URLSearchParams({ page: state.page, limit: 12, sort: state.sort });
    if (state.q) qs.set('q', state.q);
    if (state.category) qs.set('category', state.category);
    if (state.location) qs.set('location', state.location);

    try {
      const res = await API.get('/api/businesses?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No businesses found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-store-slash"></i><h3>No businesses found yet</h3><p>Try a different search, or list your own business for free.</p><button class="btn btn-green" id="emptyListBtn"><i class="fa-solid fa-plus"></i> List your business</button></div>';
        const b = document.getElementById('emptyListBtn');
        if (b) b.addEventListener('click', () => document.getElementById('openBizForm').click());
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' business' + ((pg && pg.total === 1) ? '' : 'es');
      grid.innerHTML = items.map(renderBusinessCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load businesses</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" type="button" data-retry-list>Retry</button></div>';
      grid.querySelector('[data-retry-list]').addEventListener('click', load);
    }
  }

/* ===== BIZ_SUBMIT ===== */
  async function fillFormCategories() {
    const cats = await getCategories();
    const sel = document.getElementById('bCat');
    if (sel) sel.innerHTML = '<option value="">Select category *</option>' + (cats.business || []).map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  }

  async function submitBusiness(e) {
    e.preventDefault();
    const errEl = document.getElementById('bizErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('bizSubmit');
    const form = document.getElementById('bizForm');

    const name = document.getElementById('bName').value.trim();
    const category = document.getElementById('bCat').value;
    const phone = document.getElementById('bPhone').value.trim();
    const description = document.getElementById('bDesc').value.trim();
    const location = document.getElementById('bLoc').value.trim();

    if (!name || !category || !phone || !description || !location) {
      errEl.textContent = 'Please complete all required fields.';
      errEl.classList.add('show');
      return;
    }

    const fd = new FormData(form);
    const logoInput = document.getElementById('bLogo');
    const mediaInput = document.getElementById('bMedia');
    if (logoInput.files.length > 1) {
      errEl.textContent = 'Please choose only one logo image.';
      errEl.classList.add('show');
      return;
    }
    if (mediaInput.files.length > 6) {
      errEl.textContent = 'You can upload a maximum of 6 media files.';
      errEl.classList.add('show');
      return;
    }

    loadingBtn(btn, true);
    try {
      const res = await API.postForm('/api/businesses', fd);
      toast(res.message || 'Business submitted successfully.', 'success');
      form.reset();
      closeModal('bizModal');
      load();
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally {
      loadingBtn(btn, false);
    }
  }

  load();
});