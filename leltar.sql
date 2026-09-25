-- database: ./leltar.db

CREATE TABLE IF NO`termekek`  (`eloado` TEXT NOT NULL, `album` TEXT NOT NULL, `ar` INTEGER NOT NULL, `db` INTEGER)
CREATE TABLE `users` (`felhasznaloNev` TEXT UNIQUE NOT NULL, `jelszo` INTEGER UNIQUE NOT NULL, `szerepkor` TEXT NOT NULL)


CREATE TABLE IF NOT EXISTS users (
  felhasznaloNev TEXT UNIQUE NOT NULL,
   jelszo INTEGER UNIQUE NOT NULL,
  szerepkor TEXT NOT NULL
);


INSERT INTO users (felhasznaloNev, jelszo, szerepkor) VALUES
/*('Marika nén', hash jelszó, 'dolgozo'); PÉLDA*/



CREATE TABLE IF NOT EXISTS termekek (
  eloado TEXT NOT NULL,
   album TEXT NOT NULL,
  ar INTEGER NOT NULL,
  db INTEGER
);

INSERT INTO termekek (eloado, album, ar, db) VALUES

