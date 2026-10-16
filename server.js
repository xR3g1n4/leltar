require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'valami_nagyon_titkos_es_eros_kulcs';
const DB_PATH = process.env.DB_PATH || './leltar.db';

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Adatbázis kapcsolat inicializálása
let db;
try {
  db = new Database(DB_PATH, { /* verbose: console.log */ });
  console.log(`Sikeresen csatlakozva a(z) ${DB_PATH} adatbázishoz (better-sqlite3).`);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  initializeDb();
} catch (err) {
  console.error('Hiba az adatbázishoz csatlakozáskor vagy inicializáláskor:', err.message);
  process.exit(1);
}

// Adatbázis séma inicializálása
function initializeDb() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        price INTEGER NOT NULL,
        status TEXT NOT NULL,
        storage INTEGER NOT NULL
      );
    `);
  } catch (err) {
    console.error("Hiba az adatbázis inicializálásakor:", err.message);
  }
}

// Segédfüggvények
function dbGet(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function dbAll(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function dbRun(sql, params = []) {
  return db.prepare(sql).run(...params);
}

// Middleware: JWT token hitelesítése
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Hiányzó vagy érvénytelen token.' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Érvénytelen token vagy lejárt munkamenet.' });
    req.user = user;
    next();
  });
}

// --- VÉGPONTOK ---

// 1. POST /api/auth/login - Bejelentkezés
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező.' });
  }
  try {
    const user = dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Bejelentkezési hiba:", error);
    res.status(500).json({ error: 'Szerverhiba történt a bejelentkezés során.' });
  }
});

// GET /api/auth/me - Aktuális felhasználó
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = dbGet('SELECT id, username, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Felhasználó nem található.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

// --- FELHASZNÁLÓKEZELÉS (/api/users) ---

app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'Adminisztrátor') {
    return res.status(403).json({ error: 'Nincs jogosultsága ehhez a művelethez.' });
  }
  try {
    const users = dbAll('SELECT id, username, role FROM users');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Adminisztrátor') {
    return res.status(403).json({ error: 'Nincs jogosultsága ehhez a művelethez.' });
  }
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Minden mező kitöltése kötelező.' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = dbRun('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
    const newUser = dbGet('SELECT id, username, role FROM users WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newUser);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A felhasználónév már foglalt.' });
    }
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Adminisztrátor') {
    return res.status(403).json({ error: 'Nincs jogosultsága ehhez a művelethez.' });
  }
  const idToDelete = parseInt(req.params.id, 10);
  if (req.user.id === idToDelete) {
    return res.status(400).json({ error: 'Adminisztrátor nem törölheti saját magát.' });
  }
  try {
    const result = dbRun('DELETE FROM users WHERE id = ?', [idToDelete]);
    if (result.changes === 0) return res.status(404).json({ error: 'Felhasználó nem található.' });
    res.status(200).json({ message: 'Felhasználó sikeresen törölve.' });
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

// --- TERMÉKEK ÉS KÉSZLETKEZELÉS (/api/products) ---

app.get('/api/products', authenticateToken, (req, res) => {
  const { artist, album, status } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  let params = [];

  if (artist) {
    sql += ' AND artist LIKE ?';
    params.push(`%${artist}%`);
  }
  if (album) {
    sql += ' AND album LIKE ?';
    params.push(`%${album}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  try {
    const products = dbAll(sql, params);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
  try {
    const product = dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Termék nem található.' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.post('/api/products', authenticateToken, (req, res) => {
  const { artist, album, price, status, storage } = req.body;
  if (!artist || !album || price === undefined || !status || storage === undefined) {
    return res.status(400).json({ error: 'Minden mező kitöltése kötelező.' });
  }
  try {
    const result = dbRun(
      'INSERT INTO products (artist, album, price, status, storage) VALUES (?, ?, ?, ?, ?)',
      [artist, album, price, status, storage]
    );
    const newProduct = dbGet('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

// Készletmennyiség és státusz módosítása (Dolgozó / Admin)
app.patch('/api/products/:id/stock', authenticateToken, (req, res) => {
  const { storage, status } = req.body;
  try {
    const product = dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Termék nem található.' });

    const newStorage = storage !== undefined ? storage : product.storage;
    const newStatus = status !== undefined ? status : product.status;

    dbRun('UPDATE products SET storage = ?, status = ? WHERE id = ?', [newStorage, newStatus, req.params.id]);
    const updated = dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

// Ár módosítása (Csak Adminisztrátor)
app.patch('/api/products/:id/price', authenticateToken, (req, res) => {
  if (req.user.role !== 'Adminisztrátor') {
    return res.status(403).json({ error: 'Csak adminisztrátor módosíthat árat.' });
  }
  const { price } = req.body;
  if (price === undefined) return res.status(400).json({ error: 'Az ár megadása kötelező.' });

  try {
    const product = dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Termék nem található.' });

    dbRun('UPDATE products SET price = ? WHERE id = ?', [price, req.params.id]);
    const updated = dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Adminisztrátor') {
    return res.status(403).json({ error: 'Nincs jogosultsága ehhez a művelethez.' });
  }
  try {
    const result = dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Termék nem található.' });
    res.status(200).json({ message: 'Termék sikeresen törölve.' });
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

// --- FILTEREK (/api/filters) ---

app.get('/api/filters/artists', authenticateToken, (req, res) => {
  try {
    const artists = dbAll('SELECT DISTINCT artist FROM products');
    res.status(200).json(artists.map(row => row.artist));
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.get('/api/filters/albums', authenticateToken, (req, res) => {
  const { artist } = req.query;
  try {
    let albums;
    if (artist) {
      albums = dbAll('SELECT album FROM products WHERE artist = ?', [artist]);
    } else {
      albums = dbAll('SELECT DISTINCT album FROM products');
    }
    res.status(200).json(albums.map(row => row.album));
  } catch (error) {
    res.status(500).json({ error: 'Szerverhiba.' });
  }
});

app.get('/api/filters/statuses', authenticateToken, (req, res) => {
  res.status(200).json(['Új', 'Sérült', 'Bontott']);
});

// Szerver indítása
app.listen(PORT, () => {
  console.log(`A K-pop raktárkezelő szerver fut a http://localhost:${PORT} címen`);
});