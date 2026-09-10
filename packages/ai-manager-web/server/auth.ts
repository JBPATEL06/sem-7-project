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
import crypto from 'crypto';
import mongoose from 'mongoose';

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

import {
  UserModel,
  ProjectModel,
  ModuleModel,
  DiagramModel,
  BranchFlagModel,
  ActivityLogModel,
  SettingModel,
  DbConnectionModel
} from './models/index.js';

export { UserModel };

let isMongoConnected = false;

export function getIsMongoConnected(): boolean {
  return isMongoConnected;
}

export async function initMongoAndMigrate(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[AUTH] No MONGODB_URI configured. Operating in local-first JSON mode.');
    return false;
  }

  try {
    console.log('[AUTH] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    isMongoConnected = true;
    console.log('[AUTH] Connected to MongoDB Atlas successfully.');

    // 1. Ensure owner accounts have admin role in MongoDB Atlas
    await UserModel.updateMany(
      { email: { $in: OWNER_ADMIN_EMAILS } },
      { $set: { role: 'admin' } }
    );

    // 2. Ensure owner account bhanderijeel8@gmail.com exists with default/known hash if not present
    const ownerEmail = 'bhanderijeel8@gmail.com';
    const existingOwner = await UserModel.findOne({ email: ownerEmail });
    if (!existingOwner) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123456', salt);
      await UserModel.create({
        id: `usr_owner_${Date.now()}`,
        email: ownerEmail,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log(`[AUTH] Seeded Owner Admin account: ${ownerEmail} in MongoDB Atlas.`);
    }

    // 3. Migrate existing local users into MongoDB
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
              role: isOwnerAdmin(u.email) ? 'admin' : (u.role || 'user'),
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

    // 4. Migrate local projects to MongoDB Atlas
    try {
      const projectsFile = path.resolve(process.cwd(), '.ai-manager/projects.json');
      if (fs.existsSync(projectsFile)) {
        const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
        if (Array.isArray(projects)) {
          for (const p of projects) {
            await ProjectModel.updateOne(
              { projectId: p.projectId || p.id },
              { $setOnInsert: { ...p, projectId: p.projectId || p.id } },
              { upsert: true }
            );
          }
        }
      }
    } catch (e) {
      console.error('[AUTH] Error migrating projects to Atlas:', e);
    }

    // 5. Migrate local diagrams to MongoDB Atlas
    try {
      const diagFile = path.resolve(process.cwd(), '.ai-manager/diagrams.json');
      if (fs.existsSync(diagFile)) {
        const diagrams = JSON.parse(fs.readFileSync(diagFile, 'utf-8'));
        if (Array.isArray(diagrams)) {
          for (const d of diagrams) {
            await DiagramModel.updateOne(
              { id: d.id },
              { $setOnInsert: d },
              { upsert: true }
            );
          }
        }
      }
    } catch (e) {
      console.error('[AUTH] Error migrating diagrams to Atlas:', e);
    }

    // 6. Migrate branch flags to MongoDB Atlas
    try {
      const flagsFile = path.resolve(process.cwd(), '.ai-manager/branch-flags.json');
      if (fs.existsSync(flagsFile)) {
        const flags = JSON.parse(fs.readFileSync(flagsFile, 'utf-8'));
        for (const [branch, data] of Object.entries(flags || {})) {
          const flagData = data as any;
          await BranchFlagModel.updateOne(
            { branch },
            {
              $set: {
                branch,
                userId: 'usr_admin_default',
                flag: flagData.flag || 'neutral',
                note: flagData.note || '',
                updatedAt: flagData.updatedAt || new Date().toISOString()
              }
            },
            { upsert: true }
          );
        }
      }
    } catch (e) {
      console.error('[AUTH] Error migrating branch flags to Atlas:', e);
    }

    // 7. Ensure all existing records in MongoDB Atlas have valid userId
    try {
      const defaultAdmin = await UserModel.findOne({ role: 'admin' });
      const adminId = defaultAdmin ? defaultAdmin.id : 'usr_admin_default';

      const unassignedFilter = {
        $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }]
      };

      const pRes = await ProjectModel.updateMany(unassignedFilter, { $set: { userId: adminId } });
      const dRes = await DiagramModel.updateMany(unassignedFilter, { $set: { userId: adminId } });
      const mRes = await ModuleModel.updateMany(unassignedFilter, { $set: { userId: adminId } });
      const aRes = await ActivityLogModel.updateMany(unassignedFilter, { $set: { userId: adminId } });
      const dbRes = await DbConnectionModel.updateMany(unassignedFilter, { $set: { userId: adminId } });
      const bRes = await BranchFlagModel.updateMany(unassignedFilter, { $set: { userId: adminId } });

      console.log(`[AUTH] Assigned legacy records to admin (${adminId}): projects=${pRes.modifiedCount}, diagrams=${dRes.modifiedCount}, modules=${mRes.modifiedCount}, activity=${aRes.modifiedCount}, db=${dbRes.modifiedCount}, flags=${bRes.modifiedCount}`);
    } catch (e) {
      console.error('[AUTH] Error assigning legacy records to admin:', e);
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
          role: isOwnerAdmin((doc as any).email) ? 'admin' : (doc as any).role as 'user' | 'admin',
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
  // Guarantee owner admin status
  if (isOwnerAdmin(user.email)) {
    user.role = 'admin';
  }

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
        role: isOwnerAdmin(doc.email) ? 'admin' : (doc.role as 'user' | 'admin'),
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

  if (isMongoConnected) {
    try {
      await UserModel.updateOne({ email: cleanEmail }, { $set: { passwordHash } });
    } catch (e) {
      console.error('[AUTH] MongoDB updateUserPassword error:', e);
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
    email: 'bhanderijeel8@gmail.com',
    role: 'admin',
    authMethod: 'password',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  next();
}

/**
 * Seeds default admin and owner accounts on startup
 */
export async function initDefaultAdmin(): Promise<{ email: string; generatedPass?: string } | null> {
  const allUsers = await getAllUsers();
  
  // Ensure owner accounts always have admin role
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

  console.log('\n============================================================');
  console.log(' [AUTH] Seeded Default Owner/Admin Account:');
  console.log(` Email:    ${adminEmail}`);
  console.log(` Password: ${defaultPass}`);
  console.log('============================================================\n');

  return { email: adminEmail, generatedPass: defaultPass };
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

// POST /api/auth/register — Register new user
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
      message: 'Account created successfully in MongoDB Atlas.',
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Registration error: ${err.message}` });
  }
});

// POST /api/auth/login — Login with email + password
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

    // Guarantee owner accounts have admin role
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

// POST /api/auth/reset-password — Set / Reset password for user
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
      // If user doesn't exist, create account directly
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
    mongoConnected: isMongoConnected,
    user: req.user ? { ...req.user, role } : null
  });
});
