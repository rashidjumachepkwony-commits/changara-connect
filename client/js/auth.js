/* CHANGARA CONNECT - Login & registration */
document.addEventListener('DOMContentLoaded', () => {
  initShell();

  // Already logged in? Go straight to the dashboard.
  const params = new URLSearchParams(window.location.search);
  const loginForm = document.getElementById('loginForm');
  const isAdminLogin = loginForm?.dataset.adminLogin === 'true';
  const getSafeNextUrl = () => {
    if (isAdminLogin) return 'dashboard.html?s=admin';
    const next = params.get('next');
    if (!next) return 'dashboard.html';
    try {
      const target = new URL(next, window.location.href);
      return target.origin === window.location.origin
        ? target.pathname + target.search + target.hash
        : 'dashboard.html';
    } catch (error) {
      return 'dashboard.html';
    }
  };
  if (Auth.isLoggedIn() && !isAdminLogin) {
    window.location.href = getSafeNextUrl();
    return;
  }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  const regForm = document.getElementById('regForm');
  if (regForm) regForm.addEventListener('submit', handleRegister);

  async function handleLogin(e) {
    e.preventDefault();
    const errEl = document.getElementById('loginErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('loginSubmit');
    const phone = document.getElementById('lId').value.trim();
    const password = document.getElementById('lPass').value;
    if (!phone || !password) {
      errEl.textContent = 'Please enter your phone number and password.';
      errEl.classList.add('show');
      return;
    }
    loadingBtn(btn, true);
    try {
      const res = await API.post('/api/auth/login', { phone, password });
      if (isAdminLogin && res.data.user.role !== 'ADMIN') {
        errEl.textContent = 'Administrator access is not enabled for this account. Contact the system owner.';
        errEl.classList.add('show');
        return;
      }
      Auth.setToken(res.data.token);
      Auth.setUser(res.data.user);
      toast(res.message || 'Welcome back!', 'success');
      setTimeout(() => {
        window.location.href = getSafeNextUrl();
      }, 600);
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const errEl = document.getElementById('regErr');
    errEl.classList.remove('show');
    const btn = document.getElementById('regSubmit');
    const name = document.getElementById('rName').value.trim();
    const phone = document.getElementById('rPhone').value.trim();
    const email = document.getElementById('rEmail').value.trim();
    const location = document.getElementById('rLoc').value.trim();
    const role = document.getElementById('rRole').value;
    const password = document.getElementById('rPass').value;
    if (!name || !phone || !password) {
      errEl.textContent = 'Please complete all required fields.';
      errEl.classList.add('show');
      return;
    }
    loadingBtn(btn, true);
    try {
      const res = await API.post('/api/auth/register', { name, phone, email, location, role, password });
      Auth.setToken(res.data.token);
      Auth.setUser(res.data.user);
      toast(res.message || 'Account created successfully.', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    } catch (err) {
      errEl.textContent = apiErrorMessage(err);
      errEl.classList.add('show');
    } finally { loadingBtn(btn, false); }
  }
});