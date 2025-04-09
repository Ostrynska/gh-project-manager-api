require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const projectsRouter = require('./routes/projects');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;

const start = async () => {
  const db = await initDB();
  app.use('/api/projects', projectsRouter(db));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

