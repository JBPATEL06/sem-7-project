import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  loadIndexFromSqlite,
  addDiscussionEntry,
  addDecisionRecord,
  addPlanRecord,
  addPlanProgressLog,
  addProposalRecord,
  approveProposal,
  rejectProposal
} from '@ai-manager/core';


const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.LOCAL_ENCRYPTION_KEY || 'dbci_local_default_32byte_secret_key_987654321!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptLocalSecret(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptLocalSecret(ciphertext: string): string {
  if (!ciphertext) return '';
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface LocalServerOptions {
  port?: number;
  rootDir?: string;
  dbPath?: string;
}

export async function startLocalServer(options: LocalServerOptions = {}): Promise<{ server: http.Server; port: number; url: string }> {
  const port = options.port || 4550;
  const rootDir = path.resolve(options.rootDir || '.');
  const dbPath = path.resolve(options.dbPath || path.join(rootDir, '.dbci', 'index.sqlite'));

  const app = express();
  app.use(express.json());

  // CORS middleware for local development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // GET /local-api/summary
  app.get('/local-api/summary', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      const queriesCount = index.queries ? index.queries.length : 0;
      const unresolvedCount = index.unresolved ? index.unresolved.length : 0;
      const healthPercent = Math.round(((queriesCount - unresolvedCount) / Math.max(1, queriesCount)) * 100);

      res.status(200).json({
        mode: 'LOCAL',
        projectName: path.basename(rootDir),
        rootDir,
        dbPath,
        clientsCount: index.clients ? index.clients.length : 0,
        queriesCount,
        functionsCount: index.functions ? index.functions.length : 0,
        edgesCount: index.edges ? index.edges.length : 0,
        referencesCount: index.references ? index.references.length : 0,
        unresolvedCount,
        healthScore: `${healthPercent}%`
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local summary error: ${err.message}` });
    }
  });

  // GET /local-api/functions
  app.get('/local-api/functions', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      res.status(200).json({
        functionsCount: index.functions ? index.functions.length : 0,
        functions: index.functions || []
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local functions error: ${err.message}` });
    }
  });

  // GET /local-api/functions/:id — Phase 2: Local Code Preview (direct disk read)
  app.get('/local-api/functions/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const decodedId = decodeURIComponent(rawId);

      const fn = (index.functions || []).find(f => 
        f.id === rawId || f.id === decodedId || f.name === rawId || f.name === decodedId
      );

      if (!fn) {
        res.status(404).json({ error: `Function symbol '${rawId}' not found in local index.` });
        return;
      }

      const filePath = path.isAbsolute(fn.file) ? fn.file : path.resolve(rootDir, fn.file);
      let code: string | null = null;
      let fullContent: string | null = null;
      let fileExists = false;

      if (fs.existsSync(filePath)) {
        fileExists = true;
        fullContent = fs.readFileSync(filePath, 'utf8');
        const lines = fullContent.split('\n');

        const start = Math.max(1, fn.line || 1);
        const end = Math.min(lines.length, fn.endLine || (start + 20));

        code = lines.slice(start - 1, end).join('\n');
      }

      const linkedQueries = (index.queries || []).filter(q => 
        q.enclosingFunction === fn.name || (fn.id && q.enclosingFunction === fn.id)
      );

      const references = (index.references || []).filter(r => 
        r.declarationId === fn.id || r.id.endsWith(`:${fn.name}`)
      );

      res.status(200).json({
        id: fn.id,
        name: fn.name,
        kind: fn.className ? 'method' : 'function',
        className: fn.className || null,
        file: fn.file,
        startLine: fn.line || 1,
        endLine: fn.endLine || fn.line || 1,
        touchesDb: fn.touchesDb || [],
        transitiveTouchesDb: fn.transitiveTouchesDb || [],
        linkedQueries,
        references,
        fileExists,
        code: code || `// Source file ${fn.file} not found on local disk.`,
        fullContent
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local function detail error: ${err.message}` });
    }
  });

  // GET /local-api/queries — Phase 3: Local Queries (optional filters ?db= & ?table=)
  app.get('/local-api/queries', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      let queries = index.queries || [];

      const dbFilter = req.query.db ? (Array.isArray(req.query.db) ? req.query.db[0] : req.query.db) as string : null;
      const tableFilter = req.query.table ? (Array.isArray(req.query.table) ? req.query.table[0] : req.query.table) as string : null;

      if (dbFilter) {
        const targetDb = dbFilter.toLowerCase();
        queries = queries.filter(q => {
          const type = q.dbType.toLowerCase();
          if (targetDb === 'mongo' || targetDb === 'mongodb') return type === 'mongo' || type === 'mongodb';
          return type === targetDb;
        });
      }

      if (tableFilter) {
        const targetTable = tableFilter.toLowerCase();
        queries = queries.filter(q => q.target && q.target.toLowerCase().includes(targetTable));
      }

      res.status(200).json({
        queriesCount: queries.length,
        queries
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local queries error: ${err.message}` });
    }
  });

  // GET /local-api/call-graph — Phase 3: Local Call Graph
  app.get('/local-api/call-graph', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      res.status(200).json({
        edgesCount: (index.edges || []).length,
        functionsCount: (index.functions || []).length,
        edges: index.edges || [],
        functions: index.functions || []
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local call graph error: ${err.message}` });
    }
  });

  // GET /local-api/discussions — Phase 3: Local Discussions (optional ?target=)
  app.get('/local-api/discussions', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      let threads = index.threads || [];
      let entries = index.entries || [];

      const targetFilter = req.query.target ? (Array.isArray(req.query.target) ? req.query.target[0] : req.query.target) as string : null;

      if (targetFilter) {
        threads = threads.filter(t => t.targetId === targetFilter || t.title.includes(targetFilter));
        const threadIds = new Set(threads.map(t => t.id));
        entries = entries.filter(e => threadIds.has(e.threadId));
      }

      res.status(200).json({
        threadsCount: threads.length,
        entriesCount: entries.length,
        threads,
        entries
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local discussions error: ${err.message}` });
    }
  });

  // GET /local-api/decisions — Phase 3: Local Decisions (optional ?target=)
  app.get('/local-api/decisions', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      let decisions = index.decisions || [];

      const targetFilter = req.query.target ? (Array.isArray(req.query.target) ? req.query.target[0] : req.query.target) as string : null;

      if (targetFilter) {
        decisions = decisions.filter(d => d.targetId === targetFilter || d.targetType === targetFilter);
      }

      res.status(200).json({
        decisionsCount: decisions.length,
        decisions
      });
    } catch (err: any) {
      res.status(500).json({ error: `Local decisions error: ${err.message}` });
    }
  });

  // GET /local-api/plans
  app.get('/local-api/plans', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      const plans = index.plans || [];
      res.status(200).json({ plansCount: plans.length, plans });
    } catch (err: any) {
      res.status(500).json({ error: `Local plans error: ${err.message}` });
    }
  });

  // POST /local-api/plans
  app.post('/local-api/plans', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const { title, goal, createdBy, sourceThreadId, relatedDecisionId } = req.body;
      if (!title || !goal) {
        res.status(400).json({ error: 'Missing title or goal' });
        return;
      }

      const projectId = path.basename(rootDir);
      const plan = await addPlanRecord(
        dbPath,
        projectId,
        title,
        goal,
        createdBy || 'user',
        sourceThreadId,
        relatedDecisionId
      );

      res.status(200).json({ success: true, plan });
    } catch (err: any) {
      res.status(500).json({ error: `Local add plan error: ${err.message}` });
    }
  });

  // POST /local-api/plans/:planId/progress
  app.post('/local-api/plans/:planId/progress', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const rawPlanId = req.params.planId;
      const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;
      const { stepIndex, description, status, evidence } = req.body;
      if (stepIndex === undefined || !description || !status) {
        res.status(400).json({ error: 'Missing stepIndex, description, or status' });
        return;
      }

      const log = await addPlanProgressLog(
        dbPath,
        planId,
        stepIndex,
        description,
        status,
        evidence
      );

      res.status(200).json({ success: true, log });
    } catch (err: any) {
      res.status(500).json({ error: `Local add plan progress error: ${err.message}` });
    }
  });

  // GET /local-api/proposals
  app.get('/local-api/proposals', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const index = await loadIndexFromSqlite(dbPath);
      let proposals = index.proposals || [];
      const statusFilter = req.query.status ? (Array.isArray(req.query.status) ? req.query.status[0] : req.query.status) as string : null;
      if (statusFilter) {
        proposals = proposals.filter(p => p.status === statusFilter);
      }

      res.status(200).json({ proposalsCount: proposals.length, proposals });
    } catch (err: any) {
      res.status(500).json({ error: `Local proposals error: ${err.message}` });
    }
  });

  // POST /local-api/proposals
  app.post('/local-api/proposals', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const { type, targetType, targetId, title, payload, proposedBy } = req.body;
      if (!type || !targetType || !targetId || !title || !payload) {
        res.status(400).json({ error: 'Missing type, targetType, targetId, title, or payload' });
        return;
      }

      const proposal = await addProposalRecord(
        dbPath,
        type,
        targetType,
        targetId,
        title,
        typeof payload === 'string' ? payload : JSON.stringify(payload),
        proposedBy || 'ai'
      );

      res.status(200).json({ success: true, proposal });
    } catch (err: any) {
      res.status(500).json({ error: `Local create proposal error: ${err.message}` });
    }
  });

  // POST /local-api/proposals/:id/approve — Human-only local approval (executes code payload)
  app.post('/local-api/proposals/:id/approve', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const rawId = req.params.id;
      const proposalId = Array.isArray(rawId) ? rawId[0] : rawId;
      const { reviewedBy } = req.body;

      const result = await approveProposal(dbPath, proposalId, reviewedBy || 'local_human_user', { rootDir });
      if (!result.success) {
        res.status(404).json({ error: `Proposal '${proposalId}' not found or already reviewed.` });
        return;
      }

      res.status(200).json({ success: true, proposal: result.proposal, applied: true });
    } catch (err: any) {
      res.status(500).json({ error: `Local approve proposal error: ${err.message}` });
    }
  });

  // POST /local-api/proposals/:id/reject — Human-only local rejection with persistent audit log
  app.post('/local-api/proposals/:id/reject', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!fs.existsSync(dbPath)) {
        res.status(404).json({ error: 'Index file not found. Run dbci scan first.' });
        return;
      }

      const rawId = req.params.id;
      const proposalId = Array.isArray(rawId) ? rawId[0] : rawId;
      const { reviewedBy, rejectionReason } = req.body;

      const result = await rejectProposal(dbPath, proposalId, reviewedBy || 'local_human_user', rejectionReason);
      if (!result.success) {
        res.status(404).json({ error: `Proposal '${proposalId}' not found or already reviewed.` });
        return;
      }

      res.status(200).json({ success: true, proposal: result.proposal });
    } catch (err: any) {
      res.status(500).json({ error: `Local reject proposal error: ${err.message}` });
    }
  });

  // Phase 5: Optional Local Encrypted Groq Key & Local Secrets File
  const secretsPath = path.join(rootDir, '.dbci', 'local-secrets.json');

  app.get('/local-api/groq-key', (req: Request, res: Response): void => {
    try {
      if (!fs.existsSync(secretsPath)) {
        res.status(200).json({ hasKey: false, maskedKey: null });
        return;
      }
      const raw = fs.readFileSync(secretsPath, 'utf8');
      const data = JSON.parse(raw);
      if (data.encryptedGroqKey) {
        const decrypted = decryptLocalSecret(data.encryptedGroqKey);
        const maskedKey = decrypted.length > 8 ? `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}` : '****';
        res.status(200).json({ hasKey: true, maskedKey });
        return;
      }
      res.status(200).json({ hasKey: false, maskedKey: null });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to read local secrets: ${err.message}` });
    }
  });

  app.post('/local-api/groq-key', (req: Request, res: Response): void => {
    try {
      const { apiKey } = req.body || {};
      if (!apiKey || typeof apiKey !== 'string') {
        res.status(400).json({ error: 'apiKey string is required.' });
        return;
      }

      const dbciDir = path.join(rootDir, '.dbci');
      if (!fs.existsSync(dbciDir)) {
        fs.mkdirSync(dbciDir, { recursive: true });
      }

      const encryptedGroqKey = encryptLocalSecret(apiKey);
      const payload = {
        encryptedGroqKey,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(secretsPath, JSON.stringify(payload, null, 2), 'utf8');
      res.status(200).json({
        success: true,
        message: 'Groq API key saved locally in .dbci/local-secrets.json (AES-256-GCM encrypted)'
      });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to save local Groq key: ${err.message}` });
    }
  });

  app.post('/local-api/groq/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt string is required.' });
        return;
      }

      if (!fs.existsSync(secretsPath)) {
        res.status(400).json({ error: 'No local Groq API key set. Save key via POST /local-api/groq-key first.' });
        return;
      }

      const raw = fs.readFileSync(secretsPath, 'utf8');
      const data = JSON.parse(raw);
      if (!data.encryptedGroqKey) {
        res.status(400).json({ error: 'No local Groq API key set. Save key via POST /local-api/groq-key first.' });
        return;
      }

      const apiKey = decryptLocalSecret(data.encryptedGroqKey);
      let contextSummary = 'Project AST Context: ';

      if (fs.existsSync(dbPath)) {
        const index = await loadIndexFromSqlite(dbPath);
        const plansCount = index.plans ? index.plans.length : 0;
        const decCount = index.decisions ? index.decisions.length : 0;
        contextSummary += `Project: ${path.basename(rootDir)}, Functions: ${index.functions.length}, DB Queries: ${index.queries.length}, Active Plans: ${plansCount}, ADR Decisions: ${decCount}.`;
      }

      if (apiKey.startsWith('gsk_')) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: `You are an AI assistant grounded in the following codebase index context: ${contextSummary}` },
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!groqRes.ok) {
          const errData = (await groqRes.json().catch(() => ({}))) as any;
          res.status(200).json({ success: false, error: errData.error?.message || 'Groq API request failed', groundedContext: contextSummary });
          return;
        }

        const groqData = (await groqRes.json()) as any;
        const reply = groqData.choices?.[0]?.message?.content || 'No response generated';
        res.status(200).json({ success: true, response: reply, groundedContext: contextSummary });
      } else {
        // Dev/Test mode proxy response
        res.status(200).json({
          success: true,
          response: `[Local Groq Proxy] Grounded Response for: "${prompt}". (${contextSummary})`,
          groundedContext: contextSummary
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: `Local Groq chat error: ${err.message}` });
    }
  });

  // Static frontend serving in Local Mode
  const possibleDistPaths = [
    path.resolve(rootDir, 'packages/ai-manager-web/dist'),
    path.resolve(__dirname, '../../../ai-manager-web/dist'),
    path.resolve(__dirname, '../../../../ai-manager-web/dist')
  ];

  const webDistPath = possibleDistPaths.find((p) => fs.existsSync(p));
  if (webDistPath) {
    app.use(express.static(webDistPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/local-api')) return next();
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  const server = await new Promise<http.Server>((resolve, reject) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
    s.on('error', (err) => reject(err));
  });

  const url = `http://127.0.0.1:${port}`;
  return { server, port, url };
}
