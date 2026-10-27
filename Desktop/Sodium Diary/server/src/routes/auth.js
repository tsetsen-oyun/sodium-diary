import argon2 from 'argon2';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db.js';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const registerSchema = z.object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password: z.string().min(10).max(128),
})

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' },
    });
  },
});

authRouter.post('/register', authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and a password.'}
        });
    }
    const { email, password } = parsed.data;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    try {
        const { rows } = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, passwordHash],
        ); 
        res.status(201).json({ user: rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.'}});
        }
        throw err;
    }
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});

// Used when the email is unknown, so timing doesn't reveal which emails exist.
let dummyHash;
function getDummyHash() {
  dummyHash ??= argon2.hash('not-a-real-password', { type: argon2.argon2id });
  return dummyHash;
}

authRouter.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter your email and password.' } });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = await argon2.verify(user ? user.password_hash : await getDummyHash(), password);
  if (!user || !ok) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest();
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, absolute_expires_at)
     VALUES ($1, $2, now() + interval '7 days', now() + interval '30 days')`,
    [user.id, tokenHash],
  );

  res.cookie('sd_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.json({ user: { id: user.id, email: user.email } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.sd_session;
  if (typeof token === 'string' && token.length > 0 && token.length <= 200) {
    const tokenHash = crypto.createHash('sha256').update(token).digest();
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
  res.clearCookie('sd_session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(204).end();
});