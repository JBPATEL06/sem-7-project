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

export interface OpenPencilModelConfig {
  id: string;
  name: string;
  provider: 'openai-compatible' | 'groq' | 'grok' | 'openai' | 'anthropic' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  modelId: string;
  enableTools?: boolean;
}

export interface OpenPencilAiAssignments {
  designAgent: string; // model id
  review: string; // model id or 'same-as-design'
  fastTasks: string; // model id or 'same-as-design'
  vision: string; // model id or 'none'
}

export interface StoredCredentials {
  groq?: string;
  github?: string;
  openai?: string;
  grok?: string;
  aiModels?: OpenPencilModelConfig[];
  aiAssignments?: OpenPencilAiAssignments;
  rememberInBrowser?: boolean;
  updatedAt?: string;
}

export function getDefaultOpenPencilModels(): OpenPencilModelConfig[] {
  return [
    {
      id: 'model_groq_primary',
      name: 'Design model (Groq 120B)',
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      modelId: 'openai/gpt-oss-120b',
      enableTools: true
    },
    {
      id: 'model_groq_fast',
      name: 'Fast Tasks (Groq 20B)',
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      modelId: 'openai/gpt-oss-20b',
      enableTools: true
    },
    {
      id: 'model_grok_2',
      name: 'xAI Grok-2',
      provider: 'grok',
      baseUrl: 'https://api.x.ai/v1',
      modelId: 'grok-2',
      enableTools: true
    },
    {
      id: 'model_openai_gpt4o',
      name: 'OpenAI GPT-4o',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o',
      enableTools: true
    }
  ];
}

export function getDefaultAiAssignments(): OpenPencilAiAssignments {
  return {
    designAgent: 'model_groq_primary',
    review: 'same-as-design',
    fastTasks: 'model_groq_fast',
    vision: 'none'
  };
}

export function loadDecryptedCredentials(): StoredCredentials {
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
    const keyType = req.params.keyType as string;
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
      delete (creds as any)[keyType];
    } else {
      (creds as any)[keyType] = trimmed;
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

// POST /api/settings/keys/verify — Test and verify if an API key is valid against live provider
settingsRouter.post('/keys/verify', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyType, keyValue } = req.body;
    if (!keyType || !['groq', 'github', 'openai'].includes(keyType)) {
      res.status(400).json({ valid: false, error: 'Valid keyType (groq, github, openai) is required.' });
      return;
    }

    const creds = loadDecryptedCredentials();
    let rawKey = typeof keyValue === 'string' ? keyValue.trim() : '';
    if (!rawKey) {
      if (keyType === 'groq') rawKey = creds.groq || process.env.GROQ_API_KEY || '';
      else if (keyType === 'github') rawKey = creds.github || process.env.GITHUB_TOKEN || '';
      else if (keyType === 'openai') rawKey = creds.openai || process.env.OPENAI_API_KEY || '';
    }

    if (!rawKey) {
      res.status(200).json({
        valid: false,
        keyType,
        error: `No API key provided or configured for '${keyType}'.`
      });
      return;
    }

    if (keyType === 'groq') {
      try {
        const testRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            Authorization: `Bearer ${rawKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (testRes.ok) {
          const data: any = await testRes.json();
          const models = Array.isArray(data?.data) ? data.data.map((m: any) => m.id) : [];
          res.status(200).json({
            valid: true,
            provider: 'Groq',
            keyType,
            message: 'Groq API Key is valid and active!',
            modelsCount: models.length,
            recommendedModel: 'llama-3.3-70b-versatile'
          });
          return;
        } else {
          const errData: any = await testRes.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Authentication failed (HTTP ${testRes.status})`;
          res.status(200).json({
            valid: false,
            provider: 'Groq',
            keyType,
            error: errMsg
          });
          return;
        }
      } catch (e: any) {
        res.status(200).json({
          valid: false,
          provider: 'Groq',
          keyType,
          error: `Network error connecting to Groq API: ${e.message}`
        });
        return;
      }
    } else if (keyType === 'openai') {
      try {
        const testRes = await fetch('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${rawKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (testRes.ok) {
          const data: any = await testRes.json();
          const models = Array.isArray(data?.data) ? data.data.map((m: any) => m.id) : [];
          res.status(200).json({
            valid: true,
            provider: 'OpenAI',
            keyType,
            message: 'OpenAI API Key is valid and active!',
            modelsCount: models.length,
            recommendedModel: 'gpt-4o-mini'
          });
          return;
        } else {
          const errData: any = await testRes.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Authentication failed (HTTP ${testRes.status})`;
          res.status(200).json({
            valid: false,
            provider: 'OpenAI',
            keyType,
            error: errMsg
          });
          return;
        }
      } catch (e: any) {
        res.status(200).json({
          valid: false,
          provider: 'OpenAI',
          keyType,
          error: `Network error connecting to OpenAI API: ${e.message}`
        });
        return;
      }
    } else if (keyType === 'github') {
      try {
        const testRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${rawKey}`,
            'User-Agent': 'AI-Manager-Platform',
            Accept: 'application/vnd.github.v3+json'
          }
        });
        if (testRes.ok) {
          const data: any = await testRes.json();
          res.status(200).json({
            valid: true,
            provider: 'GitHub',
            keyType,
            message: `GitHub Token is valid! Authenticated as @${data.login}.`,
            username: data.login,
            scopes: testRes.headers.get('x-oauth-scopes') || 'repo/workflow'
          });
          return;
        } else {
          res.status(200).json({
            valid: false,
            provider: 'GitHub',
            keyType,
            error: `Invalid GitHub Token (HTTP ${testRes.status}: Bad credentials)`
          });
          return;
        }
      } catch (e: any) {
        res.status(200).json({
          valid: false,
          provider: 'GitHub',
          keyType,
          error: `Network error connecting to GitHub API: ${e.message}`
        });
        return;
      }
    }
  } catch (err: any) {
    console.error('[settings/keys/verify] Error:', err);
    res.status(500).json({ valid: false, error: `Verification failed: ${err.message}` });
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

// GET /api/settings/ai-config — Retrieve OpenPencil AI Models & Role Assignments
settingsRouter.get('/ai-config', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const creds = loadDecryptedCredentials();
    const rawModels = (creds.aiModels && creds.aiModels.length > 0) ? creds.aiModels : getDefaultOpenPencilModels();
    const assignments = creds.aiAssignments || getDefaultAiAssignments();

    // Map models with status indicator and masked keys for secure UI display
    const models = rawModels.map(m => {
      let key = m.apiKey;
      if (!key) {
        if (m.provider === 'groq') key = creds.groq || process.env.GROQ_API_KEY;
        else if (m.provider === 'grok') key = creds.grok || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
        else if (m.provider === 'openai') key = creds.openai || process.env.OPENAI_API_KEY;
      }
      const hasKey = Boolean(key && key.trim().length > 0);
      return {
        id: m.id,
        name: m.name,
        provider: m.provider,
        baseUrl: m.baseUrl || '',
        modelId: m.modelId,
        enableTools: m.enableTools !== false,
        hasKey,
        maskedKey: hasKey ? maskKey(key) : 'Needs key'
      };
    });

    res.status(200).json({
      success: true,
      models,
      assignments,
      rememberInBrowser: creds.rememberInBrowser !== false
    });
  } catch (err: any) {
    console.error('[settings/ai-config/get] Error:', err);
    res.status(500).json({ error: `Failed to load AI config: ${err.message}` });
  }
});

// POST /api/settings/ai-config — Update OpenPencil AI Models & Role Assignments
settingsRouter.post('/ai-config', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { models, assignments, rememberInBrowser } = req.body;
    const creds = loadDecryptedCredentials();

    if (Array.isArray(models)) {
      // Preserve existing API keys if masked or unchanged
      const updatedModels: OpenPencilModelConfig[] = models.map((m: any) => {
        const existing = creds.aiModels?.find(em => em.id === m.id);
        let apiKey = m.apiKey;
        if (!apiKey || apiKey.includes('••••')) {
          apiKey = existing?.apiKey;
        }
        return {
          id: m.id || `model_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: m.name || 'AI Model',
          provider: m.provider || 'openai-compatible',
          baseUrl: m.baseUrl || '',
          apiKey: apiKey || '',
          modelId: m.modelId || 'openai/gpt-oss-120b',
          enableTools: m.enableTools !== false
        };
      });
      creds.aiModels = updatedModels;

      // Update active provider keys in credentials store if provided
      for (const m of updatedModels) {
        if (m.apiKey && m.apiKey.trim().length > 0) {
          if (m.provider === 'groq') {
            creds.groq = m.apiKey;
            process.env.GROQ_API_KEY = m.apiKey;
          } else if (m.provider === 'grok') {
            creds.grok = m.apiKey;
            process.env.GROK_API_KEY = m.apiKey;
          } else if (m.provider === 'openai') {
            creds.openai = m.apiKey;
            process.env.OPENAI_API_KEY = m.apiKey;
          }
        }
      }
    }

    if (assignments && typeof assignments === 'object') {
      creds.aiAssignments = {
        designAgent: assignments.designAgent || 'model_groq_primary',
        review: assignments.review || 'same-as-design',
        fastTasks: assignments.fastTasks || 'same-as-design',
        vision: assignments.vision || 'none'
      };
    }

    if (rememberInBrowser !== undefined) {
      creds.rememberInBrowser = Boolean(rememberInBrowser);
    }

    saveEncryptedCredentials(creds);

    logActivity({
      projectId: 'global',
      projectName: 'Settings',
      action: 'AI Config Updated',
      detail: `Configured ${creds.aiModels?.length || 0} OpenPencil models with updated role assignments`,
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'OpenPencil AI models and assignments saved successfully.',
      models: creds.aiModels?.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        baseUrl: m.baseUrl,
        modelId: m.modelId,
        enableTools: m.enableTools,
        hasKey: Boolean(m.apiKey || creds[m.provider as keyof StoredCredentials]),
        maskedKey: maskKey(m.apiKey || creds[m.provider as keyof StoredCredentials] as string)
      })),
      assignments: creds.aiAssignments,
      rememberInBrowser: creds.rememberInBrowser
    });
  } catch (err: any) {
    console.error('[settings/ai-config/post] Error:', err);
    res.status(500).json({ error: `Failed to save AI config: ${err.message}` });
  }
});

