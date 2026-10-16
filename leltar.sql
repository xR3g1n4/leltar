-- Adatbázis táblák és tesztadatok a K-pop raktárhoz

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL,
  storage INTEGER NOT NULL
);

-- Jelszó mindegyiknél: jelszo123 (bcrypt hash)
INSERT INTO users (username, password, role) VALUES 
('Nagy Anna', '$2b$10$cnF4inW6wUH9V4HiuepHCuWpTzFgYvyRuoq6HmCODii.ljCYI6mV.', 'Adminisztrátor'),
('Szikra Panni', '$2b$10$0S6MlOLf9EaT2Rv5odT7leqQBMTddTHaEb0.y8iISHfeNAml.ZHDm', 'Dolgozó'),
('Kiss Péter', '$2b$10$mKbQCu./YA/.3FNfFqZVz.Usbn640nTeWVXMbsqj5TW6Q6PWb4796', 'Dolgozó');

// Admin99, SKZ<3, ATEEZ<3,

INSERT INTO products (artist, album, price, status, storage) VALUES 
('Stray Kids', 'Karma', 7000, 'Új', 67),
('BTS', 'Proof', 127000, 'Új', 2),
('Ateez', 'Golden Hour: Part 2', 11000, 'Sérült', 23),
('XLOV', 'I,god', 13000, 'Új', 17),
('MEOVV', 'Bite Now', 7000, 'Új', 69),
('LE SSERAFIM', 'SPAGHETTI', 8500, 'Új', 12);