const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const headerOk = req.get('x-requested-with') === 'sodium-diary';
  const originOk = !origin || origin === CLIENT_ORIGIN;

  if (!headerOk || !originOk) {
    return res.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'Request rejected.' } });
  }
  next();
}