const token = localStorage.getItem('token');
if (!token) location.replace('/login.html');

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ADMIN = 'Adminisztrátor';

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(options.headers || {}) },
  });
  if (res.status === 401) { localStorage.removeItem('token'); location.replace('/login.html'); throw new Error('Lejárt a munkamenet.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Valami hiba történt.');
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('err', isError);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('token');
  location.replace('/login.html');
}

// Oldalsáv és jogosultság: az admin menüpontok csak adminnak látszanak
async function initPage(adminOnly = false) {
  const me = await api('/auth/me');
  const isAdmin = me.role === ADMIN;
  if (adminOnly && !isAdmin) { location.replace('/leltar.html'); return me; }
  $('role').textContent = isAdmin ? 'Admin' : me.role;
  document.querySelectorAll('[data-admin]').forEach((el) => (el.hidden = !isAdmin));
  $('logout').onclick = logout;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.activeElement === document.body && confirm('Biztosan kijelentkezel?')) logout();
  });
  return me;
}
