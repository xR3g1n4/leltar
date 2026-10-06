-- database: ./leltar.db

CREATE TABLE IF NOT EXISTS users (
  username TEXT UNIQUE NOT NULL,
  password TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL
);


INSERT INTO users (username, password, role) VALUES 
('Szikra Panni', '$2y$10$YIUahRpx7H8Mhn35gOxbs.otP8ElnsM25N10EZtdF25TBBFXMSerW', 'Dolgozó'),
('Nagyi Kati' ,'$2b$10$g/TzyDNKvf1jkQWr5dVwZ.0ieBAIXALgKa31A7IA4Xtomi7m4ZC1G', 'Dolgozó'),
('Kiss Péter', '$2b$10$A8y5my3gqHwIXaxs4ryt8eZeBxWeD1Qc2G/VrKQgIIeng5ByRcTpG', 'Dolgozó'),
('Nagy Anna', '$2b$10$SGUiT22WyyPv8CuQ4ed/QOzWqtDlDdYWRPHoBGOUGXtqEnGpC5g8i', 'Adminisztrátor'),
('Szabó Béla', '$2b$10$.BDU2ItscPaZ3vlkK8Rw1eemnqaMIUbo.xJ9sHSlx1takeGxpAyYu', 'Dolgozó'),
('Tóth Károly', '$2b$10$gVPZD2F.4A4knDzo8ySoJuOBRBdxi4dxFn3M2K1CsQ6fMXZqQPYom', 'Dolgozó');




CREATE TABLE IF NOT EXISTS products (
  artist TEXT NOT NULL,
   album TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL,
  storage INTEGER NOT NULL);

INSERT INTO products (artist, album, price, status, storage) VALUES 
("Stray Kids", "Karma", 7000, "Új", 67),
("BTS", "Proof", 127000, "Új", 2),
("Ateez", "Golden Hour: Part 2", 11000, "Sérült", 23),
("XLOV", "I,god", 13000, "Új", 17),
("MEOVV", "Bite Now", 7000, "Új", 69),
("LE SSERAFIM", "SPAGHETTI", 8500, "Új", 12);

