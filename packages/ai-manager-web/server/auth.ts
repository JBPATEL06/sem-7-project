import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ai_manager_jwt_secret_dev_key_2026';
const USERS_FILE = path.resolve(process.cwd(), '.ai-manager/users.json');

export interface LocalUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
}

// -------------------------------------------------------------
// MongoDB Atlas Mongoose Model
// -------------------------------------------------------------
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

let isMongoConnected = false;

import dns from 'dns';

export async function initMongoAndMigrate(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[AUTH] No MONGODB_URI configured. Operating in local-first JSON mode.');
    return false;
  }

  try {
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch {}

    console.log('[AUTH] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
    isMongoConnected = true;
    console.log('[AUTH] Connected to MongoDB Atlas successfully.');

    // Migrate existing local users into MongoDB
    const localUsers = getLocalUsers();
    if (localUsers.length > 0) {
      let migratedCount = 0;
      for (const u of localUsers) {
        const res = await UserModel.updateOne(
          { email: u.email.toLowerCase() },
          {
            $setOnInsert: {
              id: u.id,
              email: u.email.toLowerCase(),
              passwordHash: u.passwordHash,
              role: u.role || 'user',
              createdAt: u.createdAt || new Date().toISOString()
            }
          },
          { upsert: true }
        );
        if (res.upsertedCount > 0) migratedCount++;
      }
      if (migratedCount > 0) {
        console.log(`[AUTH] Migrated ${migratedCount} user(s) from .ai-manager/users.json into MongoDB.`);
      }
    }
    return true;
  } catch (err: any) {
    isMongoConnected = false;
    console.warn(`[AUTH] MongoDB Atlas connection failed (${err.message}). Falling back to local JSON user store.`);
    return false;
  }
}

// -------------------------------------------------------------
// Hybrid User Repository (MongoDB Primary + Local JSON Fallback)
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
  if (isMongoConnected) {
    try {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      if (doc) {
        return {
          id: (doc as any).id,
          email: (doc as any).email,
          passwordHash: (doc as any).passwordHash,
          role: (doc as any).role as 'user' | 'admin',
          createdAt: (doc as any).createdAt
        };
      }
      return null;
    } catch (e) {
      console.error('[AUTH] MongoDB find error, falling back to local JSON:', e);
    }
  }

  const local = getLocalUsers();
  return local.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export async function createUser(user: LocalUser): Promise<LocalUser> {
  // Always update local JSON as backup
  const local = getLocalUsers();
  if (!local.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
    local.push(user);
    saveLocalUsers(local);
  }

  if (isMongoConnected) {
    try {
      await UserModel.create({
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role,
        createdAt: user.createdAt
      });
    } catch (e) {
      console.error('[AUTH] MongoDB create error:', e);
    }
  }

  return user;
}

export async function getAllUsers(): Promise<LocalUser[]> {
  if (isMongoConnected) {
    try {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((doc: any) => ({
        id: doc.id,
        email: doc.email,
        passwordHash: doc.passwordHash,
        role: doc.role as 'user' | 'admin',
        createdAt: doc.createdAt
      }));
    } catch (e) {
      console.error('[AUTH] MongoDB getAllUsers error, falling back to local JSON:', e);
    }
  }
  return getLocalUsers();
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<boolean> {
  const local = getLocalUsers();
  const user = local.find((u) => u.id === id);
  if (user) {
    user.role = role;
    saveLocalUsers(local);
  }

  if (isMongoConnected) {
    try {
      await UserModel.updateOne({ id }, { $set: { role } });
    } catch (e) {
      console.error('[AUTH] MongoDB updateUserRole error:', e);
    }
  }
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const local = getLocalUsers();
  const filtered = local.filter((u) => u.id !== id);
  saveLocalUsers(filtered);

  if (isMongoConnected) {
    try {
      await UserModel.deleteOne({ id });
    } catch (e) {
      console.error('[AUTH] MongoDB deleteUser error:', e);
    }
  }
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

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    authMethod: 'password',
    iat,
    exp
  };

  return jwt.sign(payload, JWT_SECRET);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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

export function localOrAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      req.user = payload;
      return next();
    } catch {
      // Fall through to local fallback
    }
  }
  req.user = {
    sub: 'local-dev-user',
    email: 'admin@local.workspace',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}

/**
 * Seeds a default admin account on startup if none exists in store
 */
export async function initDefaultAdmin(): Promise<{ email: string; generatedPass?: string } | null> {
  const allUsers = await getAllUsers();
  const existingAdmin = allUsers.find((u) => u.role === 'admin');
  if (existingAdmin) {
    return { email: existingAdmin.email };
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local.workspace';
  const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || `Admin_${crypto.randomBytes(4).toString('hex')}!`;
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

  console.log('\n============================================================');
  console.log(' [AUTH] Seeded Default Admin Account on First Boot:');
  console.log(` Email:    ${adminEmail}`);
  console.log(` Password: ${defaultPass}`);
  console.log('============================================================\n');

  return { email: adminEmail, generatedPass: defaultPass };
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

// POST /api/auth/register — Register new standard user (hashed with bcrypt)
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
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser: LocalUser = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    const token = generateToken(newUser);
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Registration error: ${err.message}` });
  }
});

// POST /api/auth/login — Login with email + password (verified with bcrypt.compare)
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

    const token = generateToken(user);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

// POST /api/auth/logout — Invalidate client session
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me — Get active session user info
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  res.status(200).json({
    authenticated: true,
    user: {
      id: req.user?.sub,
      email: req.user?.email,
      role: req.user?.role
    }
  });
});

// GET /api/auth/status — Auth status check
authRouter.get('/status', localOrAuth, (req: AuthRequest, res: Response): void => {
  res.status(200).json({
    authenticated: true,
    user: req.user
  });
});
