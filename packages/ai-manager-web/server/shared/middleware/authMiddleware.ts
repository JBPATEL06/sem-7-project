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

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  req.user = {
    sub: 'local-dev-user',
    email: 'local@workspace.dev',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  req.user = {
    sub: 'local-dev-user',
    email: 'local@workspace.dev',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}

export function localOrAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  req.user = {
    sub: 'local-dev-user',
    email: 'local@workspace.dev',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}
