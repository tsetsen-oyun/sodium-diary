import 'dotenv/config';
import express from 'express';
import { pool } from './db.js'

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/db', async(req, res) => {
  const { rows } = await pool.query('SELECT current_database() AS database');
  res.json({ ok: true, database: rows[0].database });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${4000}`);
});