import 'dotenv/config';
import helmet from 'helmet';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use('/api', csrfProtection);
app.use('/api/auth', authRouter);

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