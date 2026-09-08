import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import { encrypt, decrypt } from './utils/encryption.js';
import { logActivity } from './dashboardRoutes.js';

export const settingsRouter = Router();

const CREDS_FILE = path.resolve(process.cwd(), '.ai-manager/credentials.enc');
const DBS_DIR = path.resolve(process.cwd(), '.ai-manager/dbs');
const PROJECTS_FILE = path.resolve(process.cwd(), '.ai-manager/projects.json');

interface StoredCredentials {
  groq?: string;
  github?: string;
  openai?: string;
  updatedAt?: string;
}

function loadDecryptedCredentials(): StoredCredentials {
  try {
    if (fs.existsSync(CREDS_FILE)) {
      const encryptedData = fs.readFileSync(CREDS_FILE, 'utf-8');
      const decryptedJson = decrypt(encryptedData);
      if (decryptedJson) {
        return JSON.parse(decryptedJson);
      }
    }
  } catch (err) {
    console.error('[loadDecryptedCredentials] Decryption failed:', err);
  }
  return {};
}

function saveEncryptedCredentials(creds: StoredCredentials): void {
  const dir = path.dirname(CREDS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const plaintext = JSON.stringify({ ...creds, updatedAt: new Date().toISOString() });
  const encrypted = encrypt(plaintext);
  fs.writeFileSync(CREDS_FILE, encrypted, 'utf-8');
}

function maskKey(key?: string): string {
  if (!key || key.trim().length === 0) return 'Not set';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

// GET /api/settings/keys — Retrieve configured API keys (masked metadata only, NO plaintext values)
settingsRouter.get('/keys', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const creds = loadDecryptedCredentials();

    // Check configuration presence
    const groqRaw = creds.groq || process.env.GROQ_API_KEY || '';
    const githubRaw = creds.github || process.env.GITHUB_TOKEN || '';
    const openaiRaw = creds.openai || process.env.OPENAI_API_KEY || '';

    res.status(200).json({
      hasEncryptedStorage: fs.existsSync(CREDS_FILE),
      keys: {
        groq: {
          isConfigured: Boolean(groqRaw),
          masked: maskKey(groqRaw),
          source: creds.groq ? 'encrypted_storage' : (process.env.GROQ_API_KEY ? 'environment' : 'none')
        },
        github: {
          isConfigured: Boolean(githubRaw),
          masked: maskKey(githubRaw),
          source: creds.github ? 'encrypted_storage' : (process.env.GITHUB_TOKEN ? 'environment' : 'none')
        },
        openai: {
          isConfigured: Boolean(openaiRaw),
          masked: maskKey(openaiRaw),
          source: creds.openai ? 'encrypted_storage' : (process.env.OPENAI_API_KEY ? 'environment' : 'none')
        }
      }
    });
  } catch (err: any) {
    console.error('[settings/keys/get] Error:', err);
    res.status(500).json({ error: `Failed to load settings keys: ${err.message}` });
  }
});

// GET /api/settings/keys/:keyType/reveal — Explicitly decrypt and return plaintext key ONLY on user-triggered reveal call
settingsRouter.get('/keys/:keyType/reveal', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyType } = req.params;
    if (!keyType || !['groq', 'github', 'openai'].includes(keyType)) {
      res.status(400).json({ error: `Invalid keyType '${keyType}'. Must be groq, github, or openai.` });
      return;
    }

    const creds = loadDecryptedCredentials();
    let rawValue = '';
    if (keyType === 'groq') rawValue = creds.groq || process.env.GROQ_API_KEY || '';
    else if (keyType === 'github') rawValue = creds.github || process.env.GITHUB_TOKEN || '';
    else if (keyType === 'openai') rawValue = creds.openai || process.env.OPENAI_API_KEY || '';

    if (!rawValue) {
      res.status(404).json({ error: `No key configured for '${keyType}'.` });
      return;
    }

    res.status(200).json({
      keyType,
      value: rawValue
    });
  } catch (err: any) {
    console.error(`[settings/keys/reveal] Error for ${req.params.keyType}:`, err);
    res.status(500).json({ error: `Failed to decrypt key: ${err.message}` });
  }
});

// POST /api/settings/keys — Save an API key securely with AES-256-GCM
settingsRouter.post('/keys', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyType, keyValue } = req.body;
    if (!keyType || !['groq', 'github', 'openai'].includes(keyType)) {
      res.status(400).json({ error: 'Valid keyType (groq, github, openai) is required.' });
      return;
    }

    if (typeof keyValue !== 'string') {
      res.status(400).json({ error: 'keyValue string is required.' });
      return;
    }

    const creds = loadDecryptedCredentials();
    const trimmed = keyValue.trim();

    if (trimmed.length === 0) {
      delete creds[keyType as keyof StoredCredentials];
    } else {
      creds[keyType as keyof StoredCredentials] = trimmed;
    }

    saveEncryptedCredentials(creds);

    // Sync in-memory environment variable if applicable
    if (keyType === 'groq') {
      process.env.GROQ_API_KEY = trimmed;
    } else if (keyType === 'github') {
      process.env.GITHUB_TOKEN = trimmed;
    } else if (keyType === 'openai') {
      process.env.OPENAI_API_KEY = trimmed;
    }

    logActivity({
      projectId: 'global',
      projectName: 'Settings',
      action: 'API Key Saved',
      detail: `${keyType.toUpperCase()} credential securely updated (AES-256-GCM)`,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: `${keyType.toUpperCase()} key stored securely with AES-256-GCM encryption.`,
      keyType,
      isConfigured: trimmed.length > 0,
      masked: maskKey(trimmed)
    });
  } catch (err: any) {
    console.error('[settings/keys/post] Error:', err);
    res.status(500).json({ error: `Failed to save key: ${err.message}` });
  }
});

// POST /api/settings/reset — Reset all indexed SQLite databases and project metrics
settingsRouter.post('/reset', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let deletedDbsCount = 0;

    // 1. Wipe SQLite databases in .ai-manager/dbs
    if (fs.existsSync(DBS_DIR)) {
      const files = fs.readdirSync(DBS_DIR);
      for (const file of files) {
        if (file.endsWith('.sqlite') || file.endsWith('.db')) {
          fs.unlinkSync(path.join(DBS_DIR, file));
          deletedDbsCount++;
        }
      }
    }

    // 2. Reset project metrics in projects.json
    if (fs.existsSync(PROJECTS_FILE)) {
      try {
        const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
        const resetProjects = projects.map((p: any) => ({
          ...p,
          status: 'Not indexed',
          statusVariant: 'secondary',
          filesCount: null,
          files: '—',
          dbSize: '—',
          lastSynced: 'Never synced',
          metrics: 'Not indexed'
        }));
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify(resetProjects, null, 2), 'utf-8');
      } catch {}
    }

    logActivity({
      projectId: 'global',
      projectName: 'System Maintenance',
      action: 'Database Reset',
      detail: `Wiped ${deletedDbsCount} SQLite database(s) and cleared indexed caches`,
      status: 'warning'
    });

    res.status(200).json({
      success: true,
      message: `Reset complete. Deleted ${deletedDbsCount} project database(s) and restored clean unindexed state.`,
      deletedDbsCount
    });
  } catch (err: any) {
    console.error('[settings/reset] Error:', err);
    res.status(500).json({ error: `Failed to reset indexed data: ${err.message}` });
  }
});
