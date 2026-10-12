// server.js – Leltár API
// Telepítés: npm install express sqlite3 bcryptjs jsonwebtoken cors
// Indítás:   node server.js

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'valtoztasd-meg-ezt-a-titkot';
const DB_FILE = path.join(__dirname, 'leltar.db');
const SQL_FILE = path.join(__dirname, 'leltar.sql');

const ROLE_ADMIN = 'Adminisztrátor';
const ROLE_WORKER = 'Dolgozó';
const VALID_ROLES = [ROLE_ADMIN, ROLE_WORKER];

// ---------------------------------------------------------------------------
// Adatbázis (promise-os segédfüggvényekkel)
// ---------------------------------------------------------------------------
const db = new sqlite3.Database(DB_FILE);

const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    })
  );
const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
const exec = (sql) =>
  new Promise((resolve, reject) => db.exec(sql, (err) => (err ? reject(err) : resolve())));

const staticDir = path.join(__dirname, 'static');
console.log('Static mappa:', staticDir, fs.existsSync(path.join(staticDir, 'login.html')));
// Első indításkor betölti a leltar.sql fájlt
async function initDb() {
  const existing = await get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  if (!existing && fs.existsSync(SQL_FILE)) {
    await exec(fs.readFileSync(SQL_FILE, 'utf8'));
    console.log('Adatbázis létrehozva a leltar.sql alapján.');
  }
}

// A táblákban nincs id oszlop, ezért a SQLite beépített rowid-ját használjuk id-ként.
const USER_COLS = 'rowid AS id, username, role';
const PRODUCT_COLS = 'rowid AS id, artist, album, price, status, storage';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Frontend (static/login.html, static/login.css, ...)
app.use(express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.redirect('/login.html'));

const revokedTokens = new Set(); // kijelentkezett tokenek (memóriában)

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Bejelentkezés szükséges.' });
  if (revokedTokens.has(token))
    return res.status(401).json({ error: 'A munkamenet lejárt, jelentkezz be újra.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: 'Érvénytelen vagy lejárt token.' });
  }
}

// Felhasználó / Admin: minden bejelentkezett dolgozó és admin
const requireUser = (req, res, next) =>
  VALID_ROLES.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'Nincs jogosultságod ehhez a művelethez.' });

const requireAdmin = (req, res, next) =>
  req.user.role === ROLE_ADMIN
    ? next()
    : res.status(403).json({ error: 'Ehhez Admin jogosultság szükséges.' });

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Szerverhiba.' });
  });

const isInt = (v) => Number.isInteger(v);

// ---------------------------------------------------------------------------
// 1. Hitelesítés és felhasználókezelés (/api/auth & /api/users)
// ---------------------------------------------------------------------------

// POST /api/auth/login – Nyilvános
app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Add meg a felhasználónevet és a jelszót.' });

  const user = await get('SELECT rowid AS id, * FROM users WHERE username = ?', [username]);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
}));

// POST /api/auth/logout – Bejelentkezett
app.post('/api/auth/logout', authenticate, (req, res) => {
  revokedTokens.add(req.token);
  res.json({ message: 'Sikeres kijelentkezés.' });
});

// GET /api/auth/me – Bejelentkezett
app.get('/api/auth/me', authenticate, wrap(async (req, res) => {
  const user = await get(`SELECT ${USER_COLS} FROM users WHERE rowid = ?`, [req.user.id]);
  if (!user) return res.status(404).json({ error: 'A felhasználó nem található.' });
  res.json(user);
}));

// GET /api/users – Admin
app.get('/api/users', authenticate, requireAdmin, wrap(async (req, res) => {
  res.json(await all(`SELECT ${USER_COLS} FROM users ORDER BY rowid`));
}));

// POST /api/users – Admin
app.post('/api/users', authenticate, requireAdmin, wrap(async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role)
    return res.status(400).json({ error: 'username, password és role megadása kötelező.' });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: `A role értéke: ${VALID_ROLES.join(' vagy ')}.` });

  const exists = await get('SELECT 1 FROM users WHERE username = ?', [username]);
  if (exists) return res.status(409).json({ error: 'Ez a felhasználónév már foglalt.' });

  const hash = await bcrypt.hash(password, 10);
  const { lastID } = await run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hash, role]
  );
  res.status(201).json(await get(`SELECT ${USER_COLS} FROM users WHERE rowid = ?`, [lastID]));
}));

// PUT / PATCH /api/users/:id – Admin
const updateUser = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const current = await get('SELECT rowid AS id, * FROM users WHERE rowid = ?', [id]);
  if (!current) return res.status(404).json({ error: 'A felhasználó nem található.' });

  const { username, password, role } = req.body || {};
  if (role !== undefined && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: `A role értéke: ${VALID_ROLES.join(' vagy ')}.` });
  if (username !== undefined && username !== current.username) {
    const taken = await get('SELECT 1 FROM users WHERE username = ?', [username]);
    if (taken) return res.status(409).json({ error: 'Ez a felhasználónév már foglalt.' });
  }
  if (id === req.user.id && role !== undefined && role !== ROLE_ADMIN)
    return res.status(400).json({ error: 'Saját admin jogosultságodat nem veheted el.' });

  const newHash = password ? await bcrypt.hash(password, 10) : current.password;
  await run('UPDATE users SET username = ?, password = ?, role = ? WHERE rowid = ?', [
    username ?? current.username,
    newHash,
    role ?? current.role,
    id,
  ]);
  res.json(await get(`SELECT ${USER_COLS} FROM users WHERE rowid = ?`, [id]));
});
app.put('/api/users/:id', authenticate, requireAdmin, updateUser);
app.patch('/api/users/:id', authenticate, requireAdmin, updateUser);

// DELETE /api/users/:id – Admin
app.delete('/api/users/:id', authenticate, requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id)
    return res.status(400).json({ error: 'Saját magadat nem törölheted.' });
  const { changes } = await run('DELETE FROM users WHERE rowid = ?', [id]);
  if (!changes) return res.status(404).json({ error: 'A felhasználó nem található.' });
  res.json({ message: 'Felhasználó törölve.' });
}));

// ---------------------------------------------------------------------------
// 2. Termék- és raktárkezelés (/api/products)
// ---------------------------------------------------------------------------

// GET /api/products?artist=&album=&status= – Bejelentkezett
app.get('/api/products', authenticate, wrap(async (req, res) => {
  const where = [];
  const params = [];
  for (const field of ['artist', 'album', 'status']) {
    if (req.query[field]) {
      where.push(`${field} LIKE ?`);
      params.push(`%${req.query[field]}%`);
    }
  }
  const sql =
    `SELECT ${PRODUCT_COLS} FROM products` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY rowid';
  res.json(await all(sql, params));
}));

// GET /api/products/:id – Bejelentkezett
app.get('/api/products/:id', authenticate, wrap(async (req, res) => {
  const product = await get(`SELECT ${PRODUCT_COLS} FROM products WHERE rowid = ?`, [
    Number(req.params.id),
  ]);
  if (!product) return res.status(404).json({ error: 'A termék nem található.' });
  res.json(product);
}));

// POST /api/products – Felhasználó / Admin
app.post('/api/products', authenticate, requireUser, wrap(async (req, res) => {
  const { artist, album, price, status, storage } = req.body || {};
  if (!artist || !album || !status || price === undefined || storage === undefined)
    return res.status(400).json({ error: 'artist, album, price, status és storage kötelező.' });
  if (!isInt(price) || price < 0 || !isInt(storage) || storage < 0)
    return res.status(400).json({ error: 'A price és a storage nem negatív egész szám legyen.' });

  const { lastID } = await run(
    'INSERT INTO products (artist, album, price, status, storage) VALUES (?, ?, ?, ?, ?)',
    [artist, album, price, status, storage]
  );
  res.status(201).json(await get(`SELECT ${PRODUCT_COLS} FROM products WHERE rowid = ?`, [lastID]));
}));

// PATCH /api/products/:id/stock – Felhasználó / Admin
// Body: { "change": 5 } (növelés), { "change": -3 } (csökkentés), vagy { "storage": 20 } (beállítás)
app.patch('/api/products/:id/stock', authenticate, requireUser, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const product = await get('SELECT rowid AS id, * FROM products WHERE rowid = ?', [id]);
  if (!product) return res.status(404).json({ error: 'A termék nem található.' });

  // Body: { change } vagy { storage } és/vagy { status: "Új" | "Bontott" | "Sérült" }
  const { change, storage, status } = req.body || {};
  let newStorage = product.storage;
  if (change !== undefined) {
    if (!isInt(change)) return res.status(400).json({ error: 'A change egész szám legyen.' });
    newStorage = product.storage + change;
  } else if (storage !== undefined) {
    if (!isInt(storage)) return res.status(400).json({ error: 'A storage egész szám legyen.' });
    newStorage = storage;
  } else if (status === undefined) {
    return res.status(400).json({ error: 'Add meg a change, storage vagy status mezőt.' });
  }
  if (status !== undefined && !['Új', 'Bontott', 'Sérült'].includes(status))
    return res.status(400).json({ error: 'A status értéke: Új, Bontott vagy Sérült.' });
  if (newStorage < 0)
    return res.status(400).json({
      error: `Nincs elég készlet (jelenlegi: ${product.storage}).`,
    });

  await run('UPDATE products SET storage = ?, status = ? WHERE rowid = ?', [
    newStorage,
    status ?? product.status,
    id,
  ]);
  res.json(await get(`SELECT ${PRODUCT_COLS} FROM products WHERE rowid = ?`, [id]));
}));

// PATCH /api/products/:id/status – Felhasználó / Admin
// Body: { "status": "Új" | "Bontott" | "Sérült" }
const VALID_STATUSES = ['Új', 'Bontott', 'Sérült'];
app.patch('/api/products/:id/status', authenticate, requireUser, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `A státusz értéke: ${VALID_STATUSES.join(', ')}.` });

  const { changes } = await run('UPDATE products SET status = ? WHERE rowid = ?', [status, id]);
  if (!changes) return res.status(404).json({ error: 'A termék nem található.' });
  res.json(await get(`SELECT ${PRODUCT_COLS} FROM products WHERE rowid = ?`, [id]));
}));

// PUT / PATCH /api/products/:id – Admin (ár módosítása is)
const updateProduct = wrap(async (req, res) => {
  const id = Number(req.params.id);
  const current = await get('SELECT rowid AS id, * FROM products WHERE rowid = ?', [id]);
  if (!current) return res.status(404).json({ error: 'A termék nem található.' });

  const { artist, album, price, status, storage } = req.body || {};
  if (price !== undefined && (!isInt(price) || price < 0))
    return res.status(400).json({ error: 'A price nem negatív egész szám legyen.' });
  if (storage !== undefined && (!isInt(storage) || storage < 0))
    return res.status(400).json({ error: 'A storage nem negatív egész szám legyen.' });

  await run(
    'UPDATE products SET artist = ?, album = ?, price = ?, status = ?, storage = ? WHERE rowid = ?',
    [
      artist ?? current.artist,
      album ?? current.album,
      price ?? current.price,
      status ?? current.status,
      storage ?? current.storage,
      id,
    ]
  );
  res.json(await get(`SELECT ${PRODUCT_COLS} FROM products WHERE rowid = ?`, [id]));
});
app.put('/api/products/:id', authenticate, requireAdmin, updateProduct);
app.patch('/api/products/:id', authenticate, requireAdmin, updateProduct);

// DELETE /api/products/:id – Admin
app.delete('/api/products/:id', authenticate, requireAdmin, wrap(async (req, res) => {
  const { changes } = await run('DELETE FROM products WHERE rowid = ?', [Number(req.params.id)]);
  if (!changes) return res.status(404).json({ error: 'A termék nem található.' });
  res.json({ message: 'Termék törölve.' });
}));

// ---------------------------------------------------------------------------
// 404 + indítás
// ---------------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ error: 'Ismeretlen végpont.' }));

initDb()
  .then(() => app.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Adatbázis hiba:', err);
    process.exit(1);
  });