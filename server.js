// require('dotenv').config();

// const express = require('express');
// const cors = require('cors');
// const { initDB } = require('./db');
// const projectsRouter = require('./routes/projects');

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT;

// const start = async () => {
//   const db = await initDB();
//   app.use('/api/projects', projectsRouter(db));

//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// };

// start();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('projects.db');

app.use(cors());
app.use(express.json());

// Створити таблицю (один раз)
db.run(`
CREATE TABLE IF NOT EXISTS user_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  stars INTEGER,
  forks INTEGER,
  issues INTEGER,
  createdAt INTEGER,
  UNIQUE(email, owner, name)
  )
`);

// ✅ POST: Зберегти проєкти
app.patch('/api/save-projects', (req, res) => {
  const { email, projects } = req.body;

  if (!email || !projects || !Array.isArray(projects)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const stmt = db.prepare(`
    INSERT INTO user_projects (email, owner, name, url, stars, forks, issues, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email, owner, name)
    DO UPDATE SET
      url = excluded.url,
      stars = excluded.stars,
      forks = excluded.forks,
      issues = excluded.issues,
      createdAt = excluded.createdAt
  `);

  projects.forEach(project => {
    stmt.run(
      email,
      project.owner,
      project.name,
      project.url,
      project.stars,
      project.forks,
      project.issues,
      project.createdAt,
      (err) => {
        if (err) console.error('❌ Error:', err.message);
      }
    );
  });

  stmt.finalize(() => {
    console.log('✅ Patched or inserted projects');
    res.json({ success: true });
  });
});


// ✅ GET: Отримати проєкти по email
app.get('/api/user-projects', (req, res) => {
  const { email } = req.query;

  console.log('🔍 Запитано проєкти для email:', email);

  db.all(
    `SELECT owner, name, url, stars, forks, issues, createdAt FROM user_projects WHERE email = ?`,
    [email],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log('📤 Результат:', rows);
      res.json(rows);
    }
  );
});


app.listen(3001, () => {
  console.log('✅ Сервер запущено на http://localhost:3001');
});
