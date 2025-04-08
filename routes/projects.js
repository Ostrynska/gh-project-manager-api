const express = require('express');
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function projectsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const projects = await db.all('SELECT * FROM projects');
    res.json(projects);
  });

  router.put('/:id', async (req, res) => {
    const { id } = req.params;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${project.owner}/${project.name}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
          },
        }
      );
      const data = response.data;

      await db.run(
        `UPDATE projects
         SET name = ?, url = ?, stars = ?, forks = ?, issues = ?
         WHERE id = ?`,
        [
          data.name,
          data.html_url,
          data.stargazers_count,
          data.forks_count,
          data.open_issues_count,
          id,
        ]
      );

      res.status(200).json({ message: 'Project updated from GitHub' });
    } catch (error) {
        console.error('GitHub update failed:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Headers:', error.response?.headers);
        res.status(500).json({ error: 'Failed to update from GitHub' });
    }
  });

  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      await db.run('UPDATE projects SET name = ? WHERE id = ?', [name, id]);
      res.sendStatus(200);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: 'Failed to update project name' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await db.run('DELETE FROM projects WHERE id = ?', [id]);
    res.sendStatus(200);
  });

  router.post('/', async (req, res) => {
    const { path } = req.body;

    if (!path || !path.includes('/')) {
      return res.status(400).json({ error: 'Invalid repository path format. Use "owner/repo".' });
    }

    const [owner, repo] = path.split('/');

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
          },
        }
      );
      const data = response.data;

      const createdAtUnix = Math.floor(new Date(data.created_at).getTime() / 1000);

      await db.run(
        `INSERT INTO projects (owner, name, url, stars, forks, issues, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.owner.login,
          data.name,
          data.html_url,
          data.stargazers_count,
          data.forks_count,
          data.open_issues_count,
          createdAtUnix,
        ]
      );

      res.status(201).json({ message: 'Repository added successfully' });
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(404).json({ error: 'Repository not found or GitHub API error' });
    }
  });

  return router;
}

module.exports = projectsRouter;
