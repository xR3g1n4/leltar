const API_URL = '/api';

// DOM elemek
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const sidebarUsername = document.getElementById('sidebar-username');
const sidebarRole = document.getElementById('sidebar-role');

// Navigáció
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Termék kezelés elemek
const productList = document.getElementById('product-list');
const addProductForm = document.getElementById('add-product-form');
const filterArtist = document.getElementById('filter-artist');
const filterAlbum = document.getElementById('filter-album');
const filterStatus = document.getElementById('filter-status');

// Felhasználó kezelés elemek
const userList = document.getElementById('user-list');
const addUserForm = document.getElementById('add-user-form');

// Induláskor token ellenőrzés
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    loadApp();
  }
});

// Bejelentkezés kezelése
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Bejelentkezési hiba');
    }

    localStorage.setItem('token', data.token);
    loadApp();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// Kijelentkezés logika függvénybe szervezve
function handleLogout() {
  localStorage.removeItem('token');
  appView.classList.remove('active');
  loginView.classList.add('active');
}

// Kijelentkezés gomb kattintásra
logoutBtn.addEventListener('click', handleLogout);

// ESC billentyű figyelése a kijelentkezéshez
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Csak akkor léptessünk ki, ha éppen a fő alkalmazás nézetben vagyunk
    if (appView.classList.contains('active')) {
      handleLogout();
    }
  }
});

// Alkalmazás betöltése
async function loadApp() {
  loginView.classList.remove('active');
  appView.classList.add('active');

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Munkamenet lejárt');
    const user = await res.json();

    sidebarUsername.textContent = user.username;
    sidebarRole.textContent = user.role;

    // Menüpontok megjelenítése szerepkör alapján
    const userTabBtn = document.querySelector('[data-target="tab-users"]');
    if (user.role === 'Adminisztrátor') {
      if (userTabBtn) userTabBtn.style.display = 'block';
    } else {
      if (userTabBtn) userTabBtn.style.display = 'none';
    }

    loadProducts();
    loadFilters();
  } catch (err) {
    localStorage.removeItem('token');
    appView.classList.remove('active');
    loginView.classList.add('active');
  }
}

// Navigációs fülek váltása
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));

    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');

    if (targetId === 'tab-users') {
      loadUsers();
    }
  });
});

// --- TERMÉKEK BETÖLTÉSE ÉS SZŰRÉSE ---
async function loadProducts() {
  const artist = filterArtist.value;
  const album = filterAlbum.value;
  const status = filterStatus.value;

  let query = `${API_URL}/products?`;
  if (artist) query += `artist=${encodeURIComponent(artist)}&`;
  if (album) query += `album=${encodeURIComponent(album)}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;

  try {
    const res = await fetch(query, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const products = await res.json();

    productList.innerHTML = '';
    products.forEach(p => {
      const statusClass = p.status === 'Új' ? 'uj' : (p.status === 'Sérült' ? 'serult' : 'bontott');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="product-cell-name">
            <div class="album-thumb"></div>
            <span>${p.album}</span>
          </div>
        </td>
        <td>${p.artist}</td>
        <td><strong>${p.price.toLocaleString()} Ft</strong></td>
        <td><span class="badge-status ${statusClass}">${p.status.toUpperCase()}</span></td>
        <td>
          <div class="stock-control">
            <button class="stock-btn" onclick="updateStock(${p.id}, ${p.storage - 1}, '${p.status}')">-</button>
            <span>${p.storage}</span>
            <button class="stock-btn" onclick="updateStock(${p.id}, ${p.storage + 1}, '${p.status}')">+</button>
          </div>
        </td>
      `;
      productList.appendChild(tr);
    });
  } catch (err) {
    console.error('Hiba a termékek betöltésekor:', err);
  }
}

// Készlet módosítás (+ / -)
async function updateStock(id, newStorage, status) {
  if (newStorage < 0) return;
  try {
    const res = await fetch(`${API_URL}/products/${id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ storage: newStorage, status })
    });
    if (res.ok) {
      loadProducts();
    }
  } catch (err) {
    console.error('Hiba a készlet frissítésekor:', err);
  }
}

// Új termék felvitele
addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newProduct = {
    artist: document.getElementById('new-artist').value,
    album: document.getElementById('new-album').value,
    price: parseInt(document.getElementById('new-price').value),
    status: document.getElementById('new-status').value,
    storage: parseInt(document.getElementById('new-storage').value)
  };

  try {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newProduct)
    });

    if (res.ok) {
      addProductForm.reset();
      loadProducts();
      loadFilters();
    }
  } catch (err) {
    console.error('Hiba új termék rögzítésekor:', err);
  }
});

// Szűrők betöltése
async function loadFilters() {
  try {
    const artistRes = await fetch(`${API_URL}/filters/artists`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const artists = await artistRes.json();

    filterArtist.innerHTML = '<option value="">Előadó</option>';
    artists.forEach(art => {
      filterArtist.innerHTML += `<option value="${art}">${art}</option>`;
    });

    const albumRes = await fetch(`${API_URL}/filters/albums`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const albums = await albumRes.json();

    filterAlbum.innerHTML = '<option value="">Album</option>';
    albums.forEach(alb => {
      filterAlbum.innerHTML += `<option value="${alb}">${alb}</option>`;
    });
  } catch (err) {
    console.error('Hiba a filterek betöltésekor:', err);
  }
}

filterArtist.addEventListener('change', loadProducts);
filterAlbum.addEventListener('change', loadProducts);
filterStatus.addEventListener('change', loadProducts);

// --- FELHASZNÁLÓK KEZELÉSE (Admin) ---
async function loadUsers() {
  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const users = await res.json();

    userList.innerHTML = '';
    users.forEach((u, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}.</td>
        <td><strong>${u.username}</strong></td>
        <td>${u.role}</td>
        <td><button class="delete-btn" onclick="deleteUser(${u.id})">Törlés</button></td>
      `;
      userList.appendChild(tr);
    });
  } catch (err) {
    console.error('Hiba a felhasználók betöltésekor:', err);
  }
}

addUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUser = {
    username: document.getElementById('new-user-username').value,
    password: document.getElementById('new-user-password').value,
    role: document.getElementById('new-user-role').value
  };

  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newUser)
    });

    if (res.ok) {
      addUserForm.reset();
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Hiba a felhasználó létrehozásakor');
    }
  } catch (err) {
    console.error('Hiba új felhasználó mentésekor:', err);
  }
});

async function deleteUser(id) {
  if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Nem sikerült törölni');
    }
  } catch (err) {
    console.error('Hiba törléskor:', err);
  }
}