const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('leltar.db');
const hash = bcrypt.hashSync('pass111', 10);

db.run("UPDATE users SET password = ? WHERE username = 'Nagy Anna'", [hash], function (err) {
  console.log(err ? err.message : `Módosított sorok: ${this.changes}`);
  db.close();
});