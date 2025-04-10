const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = new sqlite3.Database('projects.db');
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

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
    res.json({ success: true });
  });
});

app.get('/api/user-projects', (req, res) => {
  const { email } = req.query;

  db.all(
    `SELECT owner, name, url, stars, forks, issues, createdAt FROM user_projects WHERE email = ?`,
    [email],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.delete('/api/delete-project', (req, res) => {
  const { email, owner, name } = req.body;

  if (!email || !owner || !name) {
    return res.status(400).json({ error: 'Missing data' });
  }

  db.run(
    `DELETE FROM user_projects WHERE email = ? AND owner = ? AND name = ?`,
    [email, owner, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
