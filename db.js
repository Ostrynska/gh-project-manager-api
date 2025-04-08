const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const initDB = async () => {
  const db = await open({
    filename: './projects.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT,
      name TEXT,
      url TEXT,
      stars INTEGER,
      forks INTEGER,
      issues INTEGER,
      created_at INTEGER
    )
  `);

  return db;
};

module.exports = { initDB };
