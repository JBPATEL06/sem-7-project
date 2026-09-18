import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';
import { localOrAuth, AuthRequest } from '../auth/auth.js';
import { runDiagnostics, QaDiagnosticIssue, DiagnosticResult } from './qaDiagnosticsService.js';
import { runTestSuites, listTestSuites, TestRunReport } from './qaTestRunnerService.js';
import { runAstSafetyScan, AstSafetyReport } from './qaAstSafetyService.js';
import { logActivity } from '../dashboard/dashboardRoutes.js';

export const qaRouter = Router();

const ACTIVITY_FILE = path.resolve(process.cwd(), '.ai-manager/activity.json');

let SQL_PROMISE: ReturnType<typeof initSqlJs> | null = null;
async function getSqlInstance() {
  if (!SQL_PROMISE) {
    SQL_PROMISE = initSqlJs();
  }
  return await SQL_PROMISE;
}

// GET /api/qa/diagnostics — Run multi-dialect schema & integrity audits
qaRouter.get('/diagnostics', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const connId = req.query.connectionId ? String(req.query.connectionId) : undefined;

    const result = await runDiagnostics(projectId, connId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[qa/diagnostics] Error:', err);
    res.status(500).json({ error: `Failed to run diagnostics: ${err.message}` });
  }
});

// GET /api/qa/test-suites — List available test suites
qaRouter.get('/test-suites', localOrAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const suites = await listTestSuites();
    res.status(200).json({ suites });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list test suites: ${err.message}` });
  }
});

// POST /api/qa/run-tests — Execute live Vitest test runner
qaRouter.post('/run-tests', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetSuite, projectId } = req.body || {};
    const report: TestRunReport = await runTestSuites(targetSuite);

    // Log activity
    logActivity({
      action: 'Run Vitest Suites',
      projectId: projectId || 'monorepo',
      projectName: projectId || 'monorepo',
      status: report.summary.failedTests > 0 ? 'warning' : 'info',
      detail: `Executed ${report.summary.totalTests} tests across ${report.summary.totalSuites} suites (${report.summary.passRate} passed)`
    });

    res.status(200).json(report);
  } catch (err: any) {
    console.error('[qa/run-tests] Error:', err);
    res.status(500).json({ error: `Failed to run test suites: ${err.message}` });
  }
});

// GET /api/qa/ast-safety — Static AST query safety and code health
qaRouter.get('/ast-safety', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const report: AstSafetyReport = await runAstSafetyScan(projectId);
    res.status(200).json(report);
  } catch (err: any) {
    console.error('[qa/ast-safety] Error:', err);
    res.status(500).json({ error: `Failed to run AST safety scan: ${err.message}` });
  }
});

// POST /api/qa/apply-remediation — Apply DDL remediation statement directly
qaRouter.post('/apply-remediation', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      res.status(400).json({ error: 'Remediation SQL is required' });
      return;
    }

    const dbPath = path.resolve(process.cwd(), `.ai-manager/dbs/${projectId}.sqlite`);
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: `Database file for ${projectId} not found` });
      return;
    }

    const SQL = await getSqlInstance();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    db.run(sql);
    const updatedData = db.export();
    fs.writeFileSync(dbPath, Buffer.from(updatedData));
    db.close();

    logActivity({
      action: 'Apply QA Remediation',
      projectId: projectId,
      projectName: projectId,
      status: 'success',
      detail: `Applied SQL fix: ${sql.slice(0, 60)}...`
    });

    res.status(200).json({ success: true, message: 'Remediation applied successfully' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to apply remediation: ${err.message}` });
  }
});

// GET /api/qa/logs — Real system activity & query logs
qaRouter.get('/logs', localOrAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    let activities: any[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      try {
        activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
      } catch {}
    }

    const logLines = activities.map((act) => {
      const time = act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : '12:00:00';
      const level = act.status === 'warning' ? '[WARN]' : act.status === 'destructive' ? '[ERROR]' : '[INFO]';
      return `${level} ${time} [${act.projectName || 'system'}] — ${act.action}: ${act.detail}`;
    });

    if (logLines.length === 0) {
      logLines.push(`[INFO] ${new Date().toLocaleTimeString()} [system] — Express Server & sql.js WASM runtime operational`);
    }

    res.status(200).json({
      logs: logLines,
      total: logLines.length
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load logs: ${err.message}` });
  }
});

// GET /api/qa/logs/stream — Server-Sent Events (SSE) log stream
qaRouter.get('/logs/stream', localOrAuth, (req: AuthRequest, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('connected', { timestamp: new Date().toISOString(), status: 'Live QA telemetry stream open' });

  const interval = setInterval(() => {
    sendEvent('heartbeat', {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// GET /api/qa/export-report — Generate and download comprehensive Markdown QA audit report
qaRouter.get('/export-report', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const [diag, astReport, testReport] = await Promise.all([
      runDiagnostics(projectId),
      runAstSafetyScan(projectId),
      runTestSuites()
    ]);

    let md = `# Comprehensive QA & System Diagnostics Report\n\n`;
    md += `- **Project Workspace:** \`${projectId}\`\n`;
    md += `- **Generated At:** ${new Date().toISOString()}\n`;
    md += `- **Database Dialect:** \`${diag.dialect.toUpperCase()}\`\n`;
    md += `- **Schema Health Score:** **${diag.summary.healthScore}%**\n`;
    md += `- **AST Code Safety Score:** **${astReport.safetyScore}%**\n`;
    md += `- **Vitest Pass Rate:** **${testReport.summary.passRate}** (${testReport.summary.passedTests}/${testReport.summary.totalTests} passing)\n\n`;

    md += `## 1. System Runtime Status\n\n`;
    md += `- **sql.js WASM Engine:** ${diag.systemHealth.sqlJsRuntime}\n`;
    md += `- **Groq LLM Engine:** ${diag.systemHealth.groqApi}\n`;
    md += `- **Encryption Layer:** ${diag.systemHealth.encryptionLayer}\n`;
    md += `- **AST Parser Indexer:** ${diag.systemHealth.indexerEngine}\n\n`;

    md += `## 2. Schema & Data Integrity Audits\n\n`;
    md += `**Detected Issues:** ${diag.summary.critical} Critical, ${diag.summary.warning} Warning, ${diag.summary.minor} Minor (${diag.summary.total} total)\n\n`;

    if (diag.issues.length === 0) {
      md += `✓ *No schema diagnostic issues detected. All tables and collections meet integrity standards.*\n\n`;
    } else {
      diag.issues.forEach((issue, index) => {
        const severityBadge = issue.severity.toUpperCase();
        md += `### ${index + 1}. [${severityBadge}] ${issue.title}\n\n`;
        md += `- **Code:** \`${issue.code}\`\n`;
        if (issue.tableName) md += `- **Table / Collection:** \`${issue.tableName}\`\n`;
        if (issue.columnName) md += `- **Column / Key:** \`${issue.columnName}\`\n`;
        md += `- **Description:** ${issue.description}\n`;
        md += `- **Recommendation:** *${issue.suggestion}*\n`;
        if (issue.remediationSql) {
          md += `\n\`\`\`sql\n${issue.remediationSql}\n\`\`\`\n\n`;
        }
      });
    }

    md += `## 3. AST Query Safety & Code Health\n\n`;
    md += `- **Scanned Files:** ${astReport.scannedFilesCount}\n`;
    md += `- **Scanned Queries:** ${astReport.scannedQueriesCount}\n`;
    md += `- **Findings Total:** ${astReport.findings.length}\n\n`;

    if (astReport.findings.length === 0) {
      md += `✓ *No N+1 queries, unindexed filters, or SQL injection vectors detected in codebase.*\n\n`;
    } else {
      astReport.findings.forEach((finding, idx) => {
        md += `### ${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}\n\n`;
        md += `- **File:** \`${finding.filePath}:${finding.lineNumber}\`\n`;
        md += `- **Rule:** \`${finding.rule}\`\n`;
        md += `- **Snippet:** \`${finding.codeSnippet}\`\n`;
        md += `- **Remediation:** *${finding.recommendation}*\n\n`;
      });
    }

    md += `## 4. Live Vitest Test Suites Execution\n\n`;
    md += `| Test Suite | Package | Status | Passed | Total | Duration |\n`;
    md += `|---|---|---|---|---|---|\n`;
    testReport.suites.forEach((suite) => {
      md += `| \`${suite.name}\` | \`${suite.package}\` | **${suite.status}** | ${suite.passed} | ${suite.total} | ${suite.duration} |\n`;
    });

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="qa-report-${projectId}.md"`);
    res.send(md);
  } catch (err: any) {
    console.error('[qa/export-report] Error:', err);
    res.status(500).json({ error: `Failed to export QA report: ${err.message}` });
  }
});
