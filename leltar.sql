-- database: ./leltar.db

CREATE TABLE IF NOT EXISTS users (
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);


INSERT INTO users (username, password, role) VALUES ();




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

