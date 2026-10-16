const bcrypt = require('bcryptjs');

async function createHash() {
  const plainPassword = 'ATEEZ<3'; // Ide írd be azt a jelszót, amit használni szeretnél
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  console.log('Hashelt jelszó:', hashedPassword);
}

createHash();