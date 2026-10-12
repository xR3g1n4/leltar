# K-pop Bolt Raktárkezelő Rendszer - API Végpontok

## 1. Hitelesítés és Felhasználókezelés (`/api/auth` és `/api/users`)

| Metódus | Végpont | Jogosultság | Leírás / Funkció |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Nyilvános | Bejelentkezés (felhasználónév + jelszó ellenőrzése, munkamenet/token indítása). |
| **POST** | `/api/auth/logout` | Bejelentkezett | Kijelentkezés. |
| **GET** | `/api/auth/me` | Bejelentkezett | Az aktuálisan bejelentkezett felhasználó adatait (név, szerepkör) adja vissza. |
| **GET** | `/api/users` | Adminisztrátor | Az összes felhasználó listázása (pl. Admin felületre). |
| **POST** | `/api/users` | Adminisztrátor | Új felhasználó létrehozása (dolgozó regisztrálása). |
| **PUT / PATCH** | `/api/users/:id` | Adminisztrátor | Felhasználó adatainak/szerepkörének módosítása. |
| **DELETE** | `/api/users/:id` | Adminisztrátor | Felhasználó törlése. |

---

## 2. Termékek és Készletkezelés (`/api/products`)

| Metódus | Végpont | Jogosultság | Leírás / Funkció |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | Bejelentkezett | Termékek lekérése. Támogatja a szűrést query paraméterekkel (pl. `?artist=...&album=...&status=...`). |
| **GET** | `/api/products/:id` | Bejelentkezett | Egy konkrét termék részletes adatai. |
| **POST** | `/api/products` | Dolgozó / Adminisztrátor | Új termék felvitele a raktárba. |
| **PATCH** | `/api/products/:id/stock` | Dolgozó / Adminisztrátor | **Készletmennyiség és státusz módosítása** (készlet növelése/csökkentése, állapot frissítése: új/sérült/bontott). |
| **PATCH** | `/api/products/:id/price` | **Csak Adminisztrátor** | **Ár módosítása** (külön kezelve, mert ehhez csak az adminnak van joga). |
| **PUT** | `/api/products/:id` | Adminisztrátor | Termék összes adatának teljes körű módosítása (Admin felületen). |
| **DELETE** | `/api/products/:id` | Adminisztrátor | Termék törlése a rendszerből. |

---

## 3. Legördülő elemek (Filterek) adatai (`/api/filters`)

| Metódus | Végpont | Jogosultság | Leírás / Funkció |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/filters/artists` | Bejelentkezett | Visszaadja az adatbázisban található **egyedi előadók** listáját (`SELECT DISTINCT artist FROM products`). |
| **GET** | `/api/filters/albums` | Bejelentkezett | Visszaadja az albumok listáját (akár `?artist=...` szűrővel kombinálva az adott előadó albumaihoz). |
| **GET** | `/api/filters/statuses` | Bejelentkezett | Visszaadja az elérhető státuszokat (`új`, `sérült`, `bontott`). |
