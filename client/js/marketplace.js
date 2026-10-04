/* CHANGARA CONNECT - Marketplace list + detail + sell form */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');
  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    condition: params.get('condition') || '',
    sort: params.get('sort') || 'featured',
    page: 1
  };

  const pSearch = document.getElementById('pSearch');
  const pCat = document.getElementById('pCat');
  const pCond = document.getElementById('pCond');
  const pSort = document.getElementById('pSort');
  pSearch.value = state.q;
  pCond.value = state.condition;
  pSort.value = state.sort;
  fillCategorySelect(pCat, 'product', state.category);
  fillFormCategories();

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  pSearch.addEventListener('input', deb);
  pCat.addEventListener('change', () => { state.page = 1; load(); });
  pCond.addEventListener('change', () => { state.page = 1; load(); });
  pSort.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applyProd').addEventListener('click', () => { state.page = 1; load(); });

  document.getElementById('openProdForm').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      toast('Please log in or create a free account first.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('marketplace.html'); }, 900);
      return;
    }
    openModal('sellModal');
  });

  bindMediaPreview('sMedia', 'sMediaPrev');
  document.getElementById('sellForm').addEventListener('submit', submitProduct);

  async function load() {
    const grid = document.getElementById('prodGrid');
    const pager = document.getElementById('prodPager');
    const count = document.getElementById('prodCount');
    state.q = pSearch.value.trim();
    state.category = pCat.value;
    state.condition = pCond.value;
    state.sort = pSort.value;

    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';

    const qs = new URLSearchParams({ page: state.page, limit: 12, sort: state.sort });
    if (state.q) qs.set('q', state.q);
    if (state.category) qs.set('category', state.category);
    if (state.condition) qs.set('condition', state.condition);

    try {
      const res = await API.get('/api/products?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No products found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><h3>No products available yet</h3><p>Try a different search, or sell your own item for free.</p></div>';
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' item' + ((pg && pg.total === 1) ? '' : 's');
      grid.innerHTML = items.map(renderProductCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load products</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" type="button" data-retry-list>Retry</button></div>';
      grid.querySelector('[data-retry-list]').addEventListener('click', load);
    }
  }
/* ===== PROD_DETAIL ===== */
  async function fillFormCategories() {
    const cats = await getCategories();
    const sel = document.getElementById('sCat');
    if (sel) sel.innerHTML = '<option value="">Select category *</option>' + (cats.product || []).map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  }

  async function submitProduct(e) {
    e.preventDefault();
    const errEl = document.getElementById('sellErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('sellSubmit');
    const form = document.getElementById('sellForm');
    const media = document.getElementById('sMedia');
    if (media.files.length > 6) {
      errEl.textContent = 'You can upload a maximum of 6 media files.';
      errEl.classList.add('show');
      return;
    }
    loadingBtn(btn, true);
    try {
      const res = await API.postForm('/api/products', new FormData(form));
      toast(res.message || 'Product submitted.', 'success');
      form.reset();
      closeModal('sellModal');
      load();
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }

  async function openDetail(pid) {
    const box = document.getElementById('prodDetail');
    box.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div><div class="sk-line"></div>';
    openModal('prodModal');
    try {
      const res = await API.get('/api/products/' + encodeURIComponent(pid));
      renderDetail(res.data);
    } catch (err) {
      box.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>Product not found</h3><p>' + esc(apiErrorMessage(err)) + '</p></div>';
    }
  }

  function renderDetail(p) {
    const box = document.getElementById('prodDetail');
    const gallery = renderMediaGallery(getListingMedia(p), p.title);
    const wb = buildWhatsAppLink(p.whatsapp || p.phone, 'Hello, I saw your item "' + p.title + '" on Changara Connect and I am interested.');
    box.innerHTML =
      gallery +
      '<p class="lc-price">' + fmtKsh(p.price) + (p.negotiable ? ' <small class="text-muted">Negotiable</small>' : '') + '</p>' +
      '<h3>' + esc(p.title) + '</h3>' +
      '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(p.category) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(p.location) + '</p>' +
      '<p class="lc-meta mt-1"><i class="fa-solid fa-rotate"></i> ' + esc(p.condition || '') + ' &middot; Posted ' + fmtDate(p.createdAt) + (p.seller && p.seller.name ? ' by ' + esc(p.seller.name) : '') + '</p>' +
      '<p class="mt-1">' + esc(p.description).replace(/\n/g, '<br>') + '</p>' +
      '<div class="grid grid-2 mt-2">' +
        '<a class="btn btn-primary btn-block" href="' + buildTelLink(p.phone) + '"><i class="fa-solid fa-phone"></i> CALL</a>' +
        '<a class="btn btn-whatsapp btn-block" href="' + wb + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' +
      '</div>' +
      '<div class="grid grid-2 mt-1">' +
        '<button class="btn btn-ghost btn-block" id="pdSave"><i class="fa-solid fa-bookmark"></i> SAVE</button>' +
        '<button class="btn btn-ghost btn-block" id="pdReport" style="color:var(--danger)"><i class="fa-solid fa-flag"></i> REPORT</button>' +
      '</div>';

    const saveBtn = document.getElementById('pdSave');
    saveBtn.addEventListener('click', async () => {
      if (!Auth.isLoggedIn()) { toast('Log in to save items.', 'warning'); return; }
      try {
        const res = await API.post('/api/products/' + p._id + '/favorite');
        toast(res.message, 'success');
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
    });
    document.getElementById('pdReport').addEventListener('click', async () => {
      if (!Auth.isLoggedIn()) { toast('Log in to report items.', 'warning'); return; }
      try {
        const res = await API.post('/api/products/' + p._id + '/report', { reason: 'Other', description: 'Reported from product details.' });
        toast(res.message, 'success');
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
    });
  }

  if (detailId) openDetail(detailId);
  load();
});