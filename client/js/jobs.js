/* CHANGARA CONNECT - Jobs list + detail + posting */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');
  const state = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    salaryType: params.get('salaryType') || '',
    page: 1
  };

  const jSearch = document.getElementById('jSearch');
  const jCat = document.getElementById('jCat');
  const jPay = document.getElementById('jPay');
  jSearch.value = state.q;
  jPay.value = state.salaryType;
  fillCategorySelect(jCat, 'job', state.category);
  fillFormCategories();

  const deb = debounce(() => { state.page = 1; load(); }, 400);
  jSearch.addEventListener('input', deb);
  jCat.addEventListener('change', () => { state.page = 1; load(); });
  jPay.addEventListener('change', () => { state.page = 1; load(); });
  document.getElementById('applyJobs').addEventListener('click', () => { state.page = 1; load(); });

  document.getElementById('openJobForm').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      toast('Please log in or create a free account first.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?next=' + encodeURIComponent('jobs.html'); }, 900);
      return;
    }
    openModal('postJobModal');
  });
  document.getElementById('jobForm').addEventListener('submit', submitJob);

  async function load() {
    const grid = document.getElementById('jobGrid');
    const pager = document.getElementById('jobPager');
    const count = document.getElementById('jobCount');
    state.q = jSearch.value.trim();
    state.category = jCat.value;
    state.salaryType = jPay.value;

    grid.innerHTML = skeletonGrid(6);
    pager.innerHTML = '';
    count.textContent = 'Loading...';

    const qs = new URLSearchParams({ page: state.page, limit: 12 });
    if (state.q) qs.set('q', state.q);
    if (state.category) qs.set('category', state.category);
    if (state.salaryType) qs.set('salaryType', state.salaryType);

    try {
      const res = await API.get('/api/jobs?' + qs.toString());
      const items = res.data || [];
      const pg = res.pagination;
      if (!items.length) {
        count.textContent = 'No jobs found';
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-briefcase"></i><h3>No jobs have been posted yet</h3><p>Try a different search, or post a job opportunity.</p></div>';
        return;
      }
      count.textContent = (pg ? pg.total : items.length) + ' job' + ((pg && pg.total === 1) ? '' : 's');
      grid.innerHTML = items.map(renderJobCard).join('');
      pager.innerHTML = renderPager(pg);
      pager.querySelectorAll('button[data-pg]').forEach((btn) =>
        btn.addEventListener('click', () => { state.page = parseInt(btn.getAttribute('data-pg'), 10); window.scrollTo({ top: 0, behavior: 'smooth' }); load(); })
      );
    } catch (err) {
      count.textContent = 'Could not load';
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wifi"></i><h3>Could not load jobs</h3><p>' + esc(apiErrorMessage(err)) + '</p><button class="btn btn-outline" type="button" data-retry-list>Retry</button></div>';
      grid.querySelector('[data-retry-list]').addEventListener('click', load);
    }
  }
/* ===== JOBS_DETAIL ===== */
  async function fillFormCategories() {
    const cats = await getCategories();
    const sel = document.getElementById('jbCat');
    if (sel) sel.innerHTML = '<option value="">Select category *</option>' + (cats.job || []).map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  }

  async function submitJob(e) {
    e.preventDefault();
    const errEl = document.getElementById('jobErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('jobSubmit');
    const fd = new FormData(document.getElementById('jobForm'));
    const payload = Object.fromEntries(fd.entries());
    loadingBtn(btn, true);
    try {
      const res = await API.post('/api/jobs', payload);
      toast(res.message || 'Job submitted.', 'success');
      document.getElementById('jobForm').reset();
      closeModal('postJobModal');
      load();
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }

  async function openDetail(jid) {
    const box = document.getElementById('jobDetail');
    box.innerHTML = '<div class="sk-line"></div><div class="sk-line" style="height:200px"></div><div class="sk-line"></div>';
    openModal('jobModal');
    try {
      const res = await API.get('/api/jobs/' + encodeURIComponent(jid));
      const j = res.data;
      const wb = buildWhatsAppLink(j.whatsapp || j.phone, 'Hello, I saw your job "' + j.title + '" on Changara Connect and I would like to apply.');
      box.innerHTML =
        '<p class="lc-price" style="color:var(--green)">' + esc(salaryLabel(j)) + '</p>' +
        '<h3>' + esc(j.title) + '</h3>' +
        '<p class="lc-sub"><i class="fa-solid fa-building"></i> ' + esc(j.employer) + ' &middot; <i class="fa-solid fa-location-dot"></i> ' + esc(j.location) + '</p>' +
        '<p class="mt-1"><span class="badge badge-blue">' + esc(j.category) + '</span> <span class="lc-meta">Posted ' + fmtDate(j.createdAt) + '</span></p>' +
        '<p class="mt-1">' + esc(j.description).replace(/\n/g, '<br>') + '</p>' +
        (j.applicationInstructions ? '<p class="mt-1"><b>How to apply:</b> ' + esc(j.applicationInstructions) + '</p>' : '') +
        (j.closingDate ? '<p class="lc-meta"><i class="fa-regular fa-calendar"></i> Closing: ' + fmtDate(j.closingDate) + '</p>' : '') +
        '<div class="grid grid-2 mt-2">' +
          '<a class="btn btn-primary btn-block" href="' + buildTelLink(j.phone) + '"><i class="fa-solid fa-phone"></i> CALL</a>' +
          '<a class="btn btn-whatsapp btn-block" href="' + wb + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' +
        '</div>' +
        '<div class="grid grid-2 mt-1">' +
          '<button class="btn btn-ghost btn-block" id="jdSave"><i class="fa-solid fa-bookmark"></i> SAVE</button>' +
          '<button class="btn btn-ghost btn-block" id="jdReport" style="color:var(--danger)"><i class="fa-solid fa-flag"></i> REPORT</button>' +
        '</div>';

      document.getElementById('jdSave').addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) { toast('Log in to save jobs.', 'warning'); return; }
        try {
          const res = await API.post('/api/jobs/' + j._id + '/favorite');
          toast(res.message, 'success');
        } catch (err) { toast(apiErrorMessage(err), 'error'); }
      });
      document.getElementById('jdReport').addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) { toast('Log in to report jobs.', 'warning'); return; }
        try {
          const res = await API.post('/api/jobs/' + j._id + '/report', { reason: 'Other', description: 'Reported from job details.' });
          toast(res.message, 'success');
        } catch (err) { toast(apiErrorMessage(err), 'error'); }
      });
    } catch (err) {
      box.innerHTML = '<div class="empty-state"><i class="fa-solid fa-briefcase"></i><h3>Job not found</h3><p>' + esc(apiErrorMessage(err)) + '</p></div>';
    }
  }

  if (detailId) openDetail(detailId);
  load();
});