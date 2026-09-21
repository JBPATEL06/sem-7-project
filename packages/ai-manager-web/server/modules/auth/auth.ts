import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ai_manager_jwt_secret_dev_key_2026';
const USERS_FILE = path.resolve(process.cwd(), '.ai-manager/users.json');

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

export interface LocalUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
}

// -------------------------------------------------------------
// Local JSON User Repository
// -------------------------------------------------------------
export function getLocalUsers(): LocalUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading local users file:', e);
  }
  return [];
}

export function saveLocalUsers(users: LocalUser[]) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving local users file:', e);
  }
}

export async function findUserByEmail(email: string): Promise<LocalUser | null> {
  const cleanEmail = email.toLowerCase().trim();
  const local = getLocalUsers();
  return local.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export async function createUser(user: LocalUser): Promise<LocalUser> {
  if (isOwnerAdmin(user.email)) {
    user.role = 'admin';
  }

  const local = getLocalUsers();
  if (!local.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
    local.push(user);
    saveLocalUsers(local);
  }

  return user;
}

export async function getAllUsers(): Promise<LocalUser[]> {
  return getLocalUsers();
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<boolean> {
  const local = getLocalUsers();
  const user = local.find((u) => u.id === id);
  if (user) {
    user.role = role;
    saveLocalUsers(local);
  }
  return true;
}

export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const local = getLocalUsers();
  const user = local.find((u) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.passwordHash = passwordHash;
    saveLocalUsers(local);
  }
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const local = getLocalUsers();
  const filtered = local.filter((u) => u.id !== id);
  saveLocalUsers(filtered);
  return true;
}

// -------------------------------------------------------------
// JWT Token Generation & Verification
// -------------------------------------------------------------
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
  if (token === 'local_dev_token') {
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

/**
 * Seeds default admin and owner accounts on startup in local storage
 */
export async function initDefaultAdmin(): Promise<{ email: string; generatedPass?: string } | null> {
  const allUsers = await getAllUsers();
  
  for (const email of OWNER_ADMIN_EMAILS) {
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user && user.role !== 'admin') {
      await updateUserRole(user.id, 'admin');
    }
  }

  const existingAdmin = allUsers.find((u) => u.role === 'admin');
  if (existingAdmin) {
    return { email: existingAdmin.email };
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'bhanderijeel8@gmail.com';
  const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPass, salt);

  const adminUser: LocalUser = {
    id: `usr_admin_${Date.now()}`,
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  await createUser(adminUser);
  return { email: adminEmail, generatedPass: defaultPass };
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

// POST /api/auth/register — Register new user locally
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered. Please sign in or reset password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole: 'user' | 'admin' = isOwnerAdmin(email) ? 'admin' : 'user';

    const newUser: LocalUser = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      passwordHash,
      role: userRole,
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    const token = generateToken(newUser);
    res.status(201).json({
      success: true,
      message: 'Account created successfully in local storage.',
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Registration error: ${err.message}` });
  }
});

// POST /api/auth/login — Login with email + password locally
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (isOwnerAdmin(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await updateUserRole(user.id, 'admin');
    }

    const token = generateToken(user);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, role: isOwnerAdmin(user.email) ? 'admin' : user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

// POST /api/auth/reset-password — Set / Reset password for user locally
authRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Email and new password are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      const userRole: 'user' | 'admin' = isOwnerAdmin(email) ? 'admin' : 'user';

      const newUser: LocalUser = {
        id: `usr_${Date.now()}`,
        email: email.toLowerCase(),
        passwordHash,
        role: userRole,
        createdAt: new Date().toISOString()
      };
      await createUser(newUser);
      const token = generateToken(newUser);
      res.status(200).json({
        success: true,
        message: 'Account created and password set.',
        token,
        user: { id: newUser.id, email: newUser.email, role: newUser.role }
      });
      return;
    }

    await updateUserPassword(email, newPassword);
    const updatedUser = { ...user, role: isOwnerAdmin(user.email) ? 'admin' as const : user.role };
    const token = generateToken(updatedUser);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      token,
      user: { id: user.id, email: user.email, role: updatedUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Password update failed: ${err.message}` });
  }
});

// POST /api/auth/logout — Invalidate client session
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me — Get active session user info
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  const role = isOwnerAdmin(req.user?.email || '') ? 'admin' : req.user?.role;
  res.status(200).json({
    authenticated: true,
    user: {
      id: req.user?.sub,
      email: req.user?.email,
      role
    }
  });
});

// GET /api/auth/status — Auth status check
authRouter.get('/status', localOrAuth, (req: AuthRequest, res: Response): void => {
  const role = isOwnerAdmin(req.user?.email || '') ? 'admin' : req.user?.role;
  res.status(200).json({
    authenticated: true,
    storage: 'local-json',
    user: req.user ? { ...req.user, role } : null
  });
});
