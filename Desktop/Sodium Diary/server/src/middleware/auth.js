import crypto from 'node:crypto';
import { pool } from '../db.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.sd_session;
  if (typeof token !== 'string' || token.length === 0 || token.length > 200) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Please log in.' } });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest();
  const { rows } = await pool.query(
    `SELECT u.id, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND s.absolute_expires_at > now()`,
    [tokenHash],
  );

  if (!rows[0]) {
    return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' } });
  }

  req.user = rows[0];
  next();
}