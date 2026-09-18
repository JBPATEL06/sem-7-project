import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_manager_jwt_secret_dev_key_2026';

export const OWNER_ADMIN_EMAILS = [
  'bhanderijeel8@gmail.com',
  'bhanderijeel80@gmail.com',
  'jbhanderi976@gmail.com',
  (process.env.ADMIN_EMAIL || 'admin@local.workspace').toLowerCase()
];

export function isOwnerAdmin(email: string): boolean {
  if (!email) return false;
  return OWNER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  authMethod: 'password';
  iat: number;
  exp: number;
}

export function generateToken(user: { id: string; email: string; role: 'user' | 'admin' }): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 Hours

  const role = isOwnerAdmin(user.email) ? 'admin' : user.role;

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role,
    authMethod: 'password',
    iat,
    exp
  };

  return jwt.sign(payload, JWT_SECRET);
}

export function verifyToken(token: string): JwtPayload {
  if (token === 'local_dev_token' && process.env.NODE_ENV !== 'production') {
    return {
      sub: 'usr_local_admin',
      email: 'admin@local.workspace',
      role: 'admin',
      authMethod: 'password',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    };
  }
  const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  if (isOwnerAdmin(payload.email)) {
    payload.role = 'admin';
  }
  return payload;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Token missing or invalid header.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
      return;
    }
    next();
  });
}

export function localOrAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      req.user = payload;
      return next();
    } catch {
      // Token provided but invalid
      if (process.env.NODE_ENV === 'production') {
        res.status(401).json({ error: 'Invalid or expired session token.' });
        return;
      }
    }
  }

  // Strictly restrict unauthenticated admin fallback to non-production local dev
  if (process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: 'Unauthorized. Token missing or invalid header.' });
    return;
  }

  req.user = {
    sub: 'local-dev-user',
    email: 'bhanderijeel8@gmail.com',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}
