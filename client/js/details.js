/* CHANGARA CONNECT - Business profile page */
document.addEventListener('DOMContentLoaded', () => {
  initShell();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const body = document.getElementById('detailBody');
  if (!id) {
    body.innerHTML = '<div class="empty-state mt-2"><i class="fa-solid fa-store-slash"></i><h3>No business selected</h3><p><a href="businesses.html">Browse the directory</a>.</p></div>';
    return;
  }
  body.innerHTML = '<div class="sk-line mt-2" style="height:24px;width:40%"></div><div class="sk-line" style="height:200px"></div><div class="sk-line"></div><div class="sk-line"></div>';
  loadDetail(id);

  async function loadDetail(bid) {
    try {
      const res = await API.get('/api/businesses/' + encodeURIComponent(bid));
      render(res.data);
    } catch (err) {
      body.innerHTML = '<div class="empty-state mt-2"><i class="fa-solid fa-store-slash"></i><h3>Business not found</h3><p>' + esc(apiErrorMessage(err)) + '</p><a class="btn btn-outline" href="businesses.html">Back to directory</a></div>';
    }
  }

  function render(b) {
    document.getElementById('crumbName').textContent = b.name;
    const wb = buildWhatsAppLink(b.whatsapp || b.phone);
    const tel = buildTelLink(b.phone);
    const gallery = (b.images || []).map((src) => '<a href="' + esc(mediaSrc(src)) + '" target="_blank" rel="noopener"><img src="' + esc(mediaSrc(src)) + '" alt="' + esc(b.name) + ' photo" loading="lazy" style="width:84px;height:84px;object-fit:cover;border-radius:10px"></a>').join('');
    const services = (b.services || []).map((s) => '<span class="pill">' + esc(s) + '</span>').join(' ');
    const products = (b.products || []).map(renderProductCard).join('');

    body.innerHTML =
      '<div class="card mt-2"><div class="card-body">' +
        '<div class="flex" style="align-items:flex-start">' +
          '<img src="' + esc(mediaSrc(b.logo)) + '" alt="' + esc(b.name) + ' logo" style="width:76px;height:76px;border-radius:16px;object-fit:cover;border:1px solid var(--border)">' +
          '<div style="margin-left:12px"><h1 class="page-title">' + esc(b.name) + '</h1>' +
            '<p class="lc-sub"><i class="fa-solid fa-tag"></i> ' + esc(b.category) + (b.subcategory ? ' / ' + esc(b.subcategory) : '') + '</p>' +
            '<p class="lc-sub"><i class="fa-solid fa-location-dot"></i> ' + esc(b.location) + (b.village ? ' (' + esc(b.village) + ')' : '') + '</p>' +
            '<p class="mt-1">' + tierBadge(b) + ' ' + (b.verified ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Verified</span>' : '') + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="mt-2">' + esc(b.description) + '</p>' +
        (services ? '<p class="mt-1"><b>Services:</b></p><p style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">' + services + '</p>' : '') +
        '<div class="grid grid-2 mt-2">' +
          '<a class="btn btn-primary btn-block" href="' + tel + '" data-click="phone"><i class="fa-solid fa-phone"></i> CALL NOW</a>' +
          '<a class="btn btn-whatsapp btn-block" href="' + wb + '" target="_blank" rel="noopener" data-click="whatsapp"><i class="fa-brands fa-whatsapp"></i> WHATSAPP</a>' +
        '</div>' +
        '<div class="grid grid-2 mt-1">' +
          '<a class="btn btn-outline btn-block" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.name + ' ' + b.location + ' Kenya') + '" target="_blank" rel="noopener"><i class="fa-solid fa-location-arrow"></i> GET DIRECTIONS</a>' +
          '<button class="btn btn-ghost btn-block" id="saveBtn"><i class="fa-solid fa-bookmark"></i> SAVE BUSINESS</button>' +
        '</div>' +
      '</div></div>' +
      '<div class="card mt-2"><div class="card-body">' +
        '<h2 class="mb-1">Contact &amp; Hours</h2>' +
        (b.openingHours ? '<p class="info-line"><i class="fa-regular fa-clock"></i> ' + esc(b.openingHours) + '</p>' : '') +
        '<p class="info-line"><i class="fa-solid fa-phone"></i> <a href="' + tel + '">' + esc(b.phone) + '</a></p>' +
        (b.email ? '<p class="info-line"><i class="fa-solid fa-envelope"></i> ' + esc(b.email) + '</p>' : '') +
        (b.owner && b.owner.name ? '<p class="info-line"><i class="fa-solid fa-user"></i> Owner: ' + esc(b.owner.name) + '</p>' : '') +
        '<p class="info-line"><i class="fa-solid fa-calendar"></i> Joined ' + fmtDate(b.createdAt) + '</p>' +
        '<hr class="divider">' +
        '<div class="flex" style="gap:14px"><button class="lc-btn-call" id="contactBtn"><i class="fa-solid fa-paper-plane"></i> Send message</button><button class="lc-btn-call" id="reportBtn" style="color:var(--danger)"><i class="fa-solid fa-flag"></i> REPORT LISTING</button></div>' +
      '</div></div>' +
      (gallery ? '<div class="card mt-2"><div class="card-body"><h2 class="mb-1">Photos</h2><div style="display:flex;gap:8px;flex-wrap:wrap">' + gallery + '</div></div></div>' : '') +
      (products ? '<div class="section-title"><h2>Products from this seller</h2></div><div class="grid grid-auto">' + products + '</div>' : '');
/* ===== DETAIL_ACTIONS ===== */
    body.querySelectorAll('[data-click]').forEach((a) =>
      a.addEventListener('click', () => { API.post('/api/businesses/' + b._id + '/click', { type: a.getAttribute('data-click') }).catch(() => {}); })
    );
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      if (!Auth.isLoggedIn()) { toast('Log in to save businesses.', 'warning'); return; }
      try {
        const res = await API.post('/api/businesses/' + b._id + '/favorite');
        toast(res.message, 'success');
      } catch (err) { toast(apiErrorMessage(err), 'error'); }
    });

    const repBtn = document.getElementById('reportBtn');
    if (repBtn) repBtn.addEventListener('click', () => {
      if (!Auth.isLoggedIn()) { toast('Log in to report a listing.', 'warning'); return; }
      openModal('reportModal');
    });
    document.getElementById('reportForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('repErr');
      errEl.classList.remove('show');
      const btn = document.getElementById('repSubmit');
      loadingBtn(btn, true);
      try {
        const res = await API.post('/api/businesses/' + b._id + '/report', { reason: document.getElementById('repReason').value, description: document.getElementById('repDesc').value });
        toast(res.message, 'success');
        closeModal('reportModal');
      } catch (err) {
        errEl.textContent = apiErrorMessage(err);
        errEl.classList.add('show');
      } finally { loadingBtn(btn, false); }
    });

    const conBtn = document.getElementById('contactBtn');
    if (conBtn) conBtn.addEventListener('click', () => {
      if (!Auth.isLoggedIn()) { toast('Log in to send a message.', 'warning'); return; }
      openModal('contactModal');
    });
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('conErr');
      errEl.classList.remove('show');
      const btn = document.getElementById('conSubmit');
      loadingBtn(btn, true);
      try {
        const res = await API.post('/api/businesses/' + b._id + '/contact', { message: document.getElementById('conMsg').value });
        toast(res.message, 'success');
        closeModal('contactModal');
        document.getElementById('conMsg').value = '';
      } catch (err) {
        errEl.textContent = apiErrorMessage(err);
        errEl.classList.add('show');
      } finally { loadingBtn(btn, false); }
    });
  }
});