/* CHANGARA CONNECT - Noticeboard list + detail + posting */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');
  const state = { q: params.get('q') || '', category: params.get('category') || '', page: 1 };

  const nSearch = document.getElementById('nSearch');
  const nCat = document.getElementById('nCat');
  nSearch.value = state.q;
  fillCategorySelect(nCat, 'notice', state.category);
  fillFormCategories();

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  nSearch.addEventListener('input', deb);
  nCat.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applyNotices').addEventListener('click', () => { state.page = 1; load(); });

  document.getElementById('openNoticeForm').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      toast('Please log in or create a free account first.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('notices.html'); }, 900);
      return;
    }
    openModal('postNotModal');
  });
  bindImagePreview('ntImg', 'ntImgPrev');
  document.getElementById('notForm').addEventListener('submit', submitNotice);

  async function load() {
    const grid = document.getElementById('notGrid');
    const pager = document.getElementById('notPager');
    const count = document.getElementById('notCount');
    state.q = nSearch.value.trim();
    state.category = nCat.value;
    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';
    const qs = new URLSearchParams({ page: state.page, limit: 12 });
    if (state.q) qs.set('q', state.q);
    if (state.category) qs.set('category', state.category);
    try {
      const res = await API.get('/api/notices?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No notices found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-bullhorn"></i><h3>No community notices yet</h3><p>Share an event, announcement or lost &amp; found post.</p></div>';
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' notice' + ((pg && pg.total === 1) ? '' : 's');
      grid.innerHTML = items.map(renderNoticeCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load notices</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" type="button" data-retry-list>Retry</button></div>';
      grid.querySelector('[data-retry-list]').addEventListener('click', load);
    }
  }
/* ===== NOT_SECOND ===== */
  async function fillFormCategories() {
    const cats = await getCategories();
    const sel = document.getElementById('ntCat');
    if (sel) sel.innerHTML = '<option value="">Select category *</option>' + (cats.notice || []).map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  }

  async function submitNotice(e) {
    e.preventDefault();
    const errEl = document.getElementById('notErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('notSubmit');
    loadingBtn(btn, true);
    try {
      const res = await API.postForm('/api/notices', new FormData(document.getElementById('notForm')));
      toast(res.message || 'Notice submitted.', 'success');
      document.getElementById('notForm').reset();
      closeModal('postNotModal');
      load();
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }

  async function openDetail(nid) {
    const box = document.getElementById('notDetail');
    box.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div><div class="sk-line"></div>';
    openModal('notModal');
    try {
      const res = await API.get('/api/notices/' + encodeURIComponent(nid));
      const n = res.data;
      box.innerHTML =
        (n.image ? '<img src="' + esc(mediaSrc(n.image)) + '" alt="' + esc(n.title) + '" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:10px;margin-bottom:12px">' : '') +
        '<h3>' + esc(n.title) + '</h3>' +
        '<p class="mt-1"><span class="badge badge-blue">' + esc(n.category) + '</span></p>' +
        (n.location ? '<p class="lc-sub mt-1"><i class="fa-solid fa-location-dot"></i> ' + esc(n.location) + '</p>' : '') +
        '<p class="mt-1">' + esc(n.description).replace(/\n/g, '<br>') + '</p>' +
        '<p class="lc-meta mt-1"><i class="fa-regular fa-clock"></i> Posted ' + fmtDate(n.createdAt) + (n.author && n.author.name ? ' by ' + esc(n.author.name) : '') + '</p>' +
        (n.expiryDate ? '<p class="lc-meta"><i class="fa-regular fa-calendar"></i> Expires ' + fmtDate(n.expiryDate) + '</p>' : '') +
        (n.contact ? '<p class="mt-1"><b>Contact:</b> ' + esc(n.contact) + '</p>' : '') +
        '<button class="btn btn-ghost btn-block mt-2" id="ndReport" style="color:var(--danger)"><i class="fa-solid fa-flag"></i> REPORT</button>';

      document.getElementById('ndReport').addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) { toast('Log in to report notices.', 'warning'); return; }
        try {
          const res = await API.post('/api/notices/' + n._id + '/report', { reason: 'Other', description: 'Reported from notice details.' });
          toast(res.message, 'success');
        } catch (err) { toast(apiErrorMessage(err), 'error'); }
      });
    } catch (err) {
      box.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullhorn"></i><h3>Notice not found</h3><p>' + esc(apiErrorMessage(err)) + '</p></div>';
    }
  }

  if (detailId) openDetail(detailId);
  load();
});