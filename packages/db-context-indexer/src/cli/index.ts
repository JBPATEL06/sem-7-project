#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { buildIndex } from '../core/indexBuilder.js';
import { loadProject } from '../core/projectWalker.js';
import { findDeclarations, getAllDeclarations, detectPackages } from '../core/lookup.js';
import {
  loadIndexFromSqlite,
  pushIndexToDrive,
  pullIndexFromDrive,
  fetchProjectFromDrive,
  addDiscussionEntry,
  addDecisionRecord,
  addProposalRecord,
  approveProposal,
  rejectProposal,
  generateInstructionDoc,
  loginPkce,
  logout as authLogout,
  whoami as authWhoami,
  pairDeviceWithWeb
} from '@ai-manager/core';
import { startLocalServer } from '../local-server/server.js';
import { startMcpServer } from '../mcp/server.js';


function loadOpenModule(): any {
  try {
    return require('open');
  } catch {
    return null;
  }
}

const program = new Command();

program
  .name('dbci')
  .description('DB Context Indexer — Zero-AI-API static-analysis scanner for MongoDB, Firebase, Supabase, and MySQL')
  .version('0.2.0');

program
  .command('ui')
  .description('Launch Local Mode offline web dashboard reading directly from .dbci/index.sqlite')
  .option('-p, --port <port>', 'Local server port', '4550')
  .option('-d, --dir <path>', 'Root directory containing .dbci/index.sqlite', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci ui] Error: No index found — run `dbci scan` first.'));
      process.exit(1);
    }

    const port = parseInt(options.port, 10) || 4550;
    console.log(chalk.blue(`[dbci ui] Starting Local Mode offline server on 127.0.0.1:${port}...`));

    try {
      const { url } = await startLocalServer({ port, rootDir, dbPath });
      console.log(chalk.green(`\n✔ [dbci ui] Local Mode server running at ${url}`));
      console.log(chalk.cyan(`  Reading index: ${dbPath}`));
      console.log(chalk.gray('  Press Ctrl+C to stop local server.\n'));

      const openModule = loadOpenModule();
      if (openModule) {
        const openFn = openModule.default || openModule;
        if (typeof openFn === 'function') {
          openFn(url);
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`[dbci ui] Failed to start local server: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start native Model Context Protocol (MCP) server over stdio for IDE AI agents (Cursor, Windsurf, Antigravity)')
  .option('-r, --root <dir>', 'Root directory of target codebase', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (options) => {
    try {
      await startMcpServer({ rootDir: options.root, dbPath: options.db });
    } catch (err: any) {
      console.error(chalk.red(`[dbci mcp] Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('propose')
  .description('Submit an AI-originated proposal (code change, discussion, decision, plan, issue) to the approval queue')
  .option('-t, --type <type>', 'Type of proposal (code|discussion|decision|plan|issue)', 'code')
  .option('-tt, --target-type <targetType>', 'Target type (file|function|class|query|project)', 'file')
  .option('-ti, --target-id <targetId>', 'Target identifier', 'root')
  .option('--title <title>', 'Short title of the proposal')
  .option('-p, --payload <json>', 'JSON string payload or file diff')
  .option('-r, --root <dir>', 'Root directory of project', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (options) => {
    try {
      const rootDir = path.resolve(options.root);
      const dbPath = path.resolve(options.db || path.join(rootDir, '.dbci', 'index.sqlite'));
      const title = options.title || `${options.type.toUpperCase()} proposal for ${options.targetId}`;
      const payload = options.payload || JSON.stringify({ message: 'No payload specified' });

      const proposal = await addProposalRecord(
        dbPath,
        options.type,
        options.targetType,
        options.targetId,
        title,
        payload,
        'ai_agent'
      );

      console.log(chalk.green(`\n✔ [dbci propose] Proposal submitted successfully!`));
      console.log(chalk.cyan(`  Proposal ID: ${proposal.id}`));
      console.log(chalk.cyan(`  Type: ${proposal.type}`));
      console.log(chalk.cyan(`  Status: ${proposal.status} (pending human approval via 'dbci approve <id>')\n`));
    } catch (err: any) {
      console.error(chalk.red(`[dbci propose] Failed to submit proposal: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('proposals')
  .description('List proposals in the approval queue')
  .option('-s, --status <status>', 'Filter proposals by status (pending|approved|rejected)', 'pending')
  .option('-r, --root <dir>', 'Root directory of project', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (options) => {
    try {
      const rootDir = path.resolve(options.root);
      const dbPath = path.resolve(options.db || path.join(rootDir, '.dbci', 'index.sqlite'));
      const index = await loadIndexFromSqlite(dbPath);
      let proposals = index.proposals || [];

      if (options.status) {
        proposals = proposals.filter(p => p.status === options.status);
      }

      console.log(chalk.blue(`\n--- DB Context Indexer Proposals (${proposals.length} found) ---`));
      for (const p of proposals) {
        const color = p.status === 'approved' ? chalk.green : p.status === 'rejected' ? chalk.red : chalk.yellow;
        console.log(`\n• ID: ${chalk.bold(p.id)} [${color(p.status.toUpperCase())}]`);
        console.log(`  Title: ${p.title}`);
        console.log(`  Type: ${p.type} | Target: ${p.targetType}:${p.targetId}`);
        console.log(`  Proposed By: ${p.proposedBy} at ${p.createdAt}`);
        if (p.rejectionReason) console.log(chalk.red(`  Rejection Reason: ${p.rejectionReason}`));
      }
      console.log('');
    } catch (err: any) {
      console.error(chalk.red(`[dbci proposals] Failed to list proposals: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('approve <proposalId>')
  .description('Approve a pending proposal and execute its write-back payload (Human interactive approval)')
  .option('-r, --root <dir>', 'Root directory of project', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (proposalId, options) => {
    try {
      const rootDir = path.resolve(options.root);
      const dbPath = path.resolve(options.db || path.join(rootDir, '.dbci', 'index.sqlite'));

      const result = await approveProposal(dbPath, proposalId, 'human_operator', { rootDir });
      if (result.success) {
        console.log(chalk.green(`\n✔ [dbci approve] Proposal '${proposalId}' APPROVED and executed!`));
      } else {
        console.error(chalk.red(`\n✖ [dbci approve] Proposal '${proposalId}' not found or already reviewed.`));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`[dbci approve] Error approving proposal: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('reject <proposalId>')
  .description('Reject a pending proposal with persistent audit logging (Human interactive rejection)')
  .option('--reason <reason>', 'Optional reason for rejection')
  .option('-r, --root <dir>', 'Root directory of project', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (proposalId, options) => {
    try {
      const rootDir = path.resolve(options.root);
      const dbPath = path.resolve(options.db || path.join(rootDir, '.dbci', 'index.sqlite'));

      const result = await rejectProposal(dbPath, proposalId, 'human_operator', options.reason);
      if (result.success) {
        console.log(chalk.yellow(`\n✔ [dbci reject] Proposal '${proposalId}' REJECTED and saved to audit history.`));
      } else {
        console.error(chalk.red(`\n✖ [dbci reject] Proposal '${proposalId}' not found or already reviewed.`));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`[dbci reject] Error rejecting proposal: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('instructions')
  .description('Auto-generate unified, AST-grounded IDE instruction files (AGENTS.md, .cursorrules, .clauderules)')
  .option('-t, --target <format>', 'Target format (agents|cursor|claude)', 'agents')
  .option('-o, --output <path>', 'Custom output file path')
  .option('--stdout', 'Print directly to terminal output')
  .option('--dry-run', 'Preview output without writing to disk')
  .option('-r, --root <dir>', 'Root directory of project', '.')
  .option('-d, --db <path>', 'Custom path to SQLite index file')
  .action(async (options) => {
    try {
      const rootDir = path.resolve(options.root);
      const dbPath = path.resolve(options.db || path.join(rootDir, '.dbci', 'index.sqlite'));
      const format = (options.target || 'agents') as 'agents' | 'cursor' | 'claude';

      const doc = await generateInstructionDoc(dbPath, { format, rootDir });

      if (options.stdout || options.dryRun) {
        console.log(chalk.cyan(`\n--- Auto-generated Instructions (${format.toUpperCase()}) ---`));
        console.log(doc);
        return;
      }

      let targetFileName = 'AGENTS.md';
      if (format === 'cursor') targetFileName = '.cursorrules';
      if (format === 'claude') targetFileName = '.clauderules';

      const outputPath = options.output ? path.resolve(options.output) : path.join(rootDir, targetFileName);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, doc, 'utf8');

      console.log(chalk.green(`\n✔ [dbci instructions] Successfully generated AST-grounded instruction file!`));
      console.log(chalk.cyan(`  Format: ${format.toUpperCase()}`));
      console.log(chalk.cyan(`  Output File: ${outputPath}\n`));
    } catch (err: any) {
      console.error(chalk.red(`[dbci instructions] Error generating instructions: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('pair <code>')
  .description('Pair this local CLI workstation with your AI Manager Web account using a pairing code')
  .option('-u, --url <url>', 'AI Manager Web App server URL', 'http://localhost:3000')
  .action(async (code, options) => {
    console.log(chalk.blue(`[dbci pair] Linking CLI with Web App account using code ${code}...`));
    const res = await pairDeviceWithWeb(code, options.url);
    if (res.success) {
      console.log(chalk.green(`\n✔ [dbci pair] ${res.message}`));
      if (res.userId) console.log(chalk.cyan(`  User ID: ${res.userId}`));
    } else {
      console.error(chalk.red(`\n✖ [dbci pair] ${res.message}`));
      process.exit(1);
    }
  });

program
  .command('login')
  .description('Authenticate with Google Drive via PKCE OAuth loopback flow')
  .action(async () => {
    console.log(chalk.blue('[dbci login] Starting PKCE OAuth authentication...'));
    const res = await loginPkce();
    if (res.success) {
      console.log(chalk.green(`[dbci login] ${res.message}`));
    } else {
      console.error(chalk.red(res.message));
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Remove stored credentials from ~/.ai-manager/credentials.json')
  .action(() => {
    authLogout();
    console.log(chalk.green('[dbci logout] Successfully logged out and removed stored credentials.'));
  });

program
  .command('whoami')
  .description('Display currently authenticated Google user profile or token status')
  .action(async () => {
    const status = await authWhoami();
    if (status.loggedIn) {
      console.log(chalk.green(`Logged in as: ${status.email}`));
      if (status.userId) console.log(chalk.cyan(`Canonical Web User ID: ${status.userId}`));
      if (status.pairedDeviceId) console.log(chalk.cyan(`Paired Device ID: ${status.pairedDeviceId}`));
      console.log(chalk.gray(`Credentials file: ${status.path}`));
    } else {
      console.log(chalk.yellow('Not logged in. Run `dbci pair <code>` or `dbci login` to authenticate.'));
    }
  });

program
  .command('scan')
  .description('Run incremental index build against project directory and store in .dbci/index.sqlite')
  .option('-d, --dir <path>', 'Root directory to scan', '.')
  .option('--full', 'Force full re-scan bypassing incremental file hash check')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    console.log(chalk.blue(`[dbci] Scanning project at ${rootDir}${options.full ? ' (Full Re-scan)' : ''}...`));
    const result = await buildIndex({ rootDir, full: options.full });

    const counts: Record<string, number> = {};
    for (const q of result.queries) {
      counts[q.dbType] = (counts[q.dbType] || 0) + 1;
    }

    console.log(chalk.green('\n[dbci] Scan Complete! Summary:'));
    console.table([
      { Metric: 'Clients Detected', Count: result.clients.length },
      { Metric: 'Queries Indexed', Count: result.queries.length },
      { Metric: 'Functions Mapped', Count: result.functions.length },
      { Metric: 'Call Edges', Count: result.edges.length },
      { Metric: 'Symbol References', Count: (result.references || []).length },
      { Metric: 'Unresolved Queries', Count: result.unresolved.length }
    ]);

    if (Object.keys(counts).length > 0) {
      console.log(chalk.cyan('\nQueries per Database Type:'));
      console.table(Object.entries(counts).map(([db, count]) => ({ 'DB Type': db, Queries: count })));
    }
  });

program
  .command('find <name>')
  .description('Look up symbol declarations, files, event emitters, or event listener registrations')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (name, options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }

    const index = await loadIndexFromSqlite(dbPath);
    const { sourceFiles } = loadProject({ rootDir });

    let foundSomething = false;

    // 1. Files
    const matchedFiles = sourceFiles
      .map(sf => sf.getFilePath().replace(/\\/g, '/'))
      .filter(f => path.basename(f).toLowerCase().includes(name.toLowerCase()));
    
    if (matchedFiles.length > 0) {
      foundSomething = true;
      console.log(chalk.green(`\nFound ${matchedFiles.length} file(s) matching '${name}':`));
      for (const f of matchedFiles) {
        console.log(chalk.cyan(`• ${f}`));
      }
    }

    // 2. Symbol Declarations (Functions, Classes, Variables, Methods)
    const { matches, warning } = findDeclarations(name, sourceFiles, index);
    if (warning) {
      console.log(chalk.yellow(warning));
    }
    if (matches.length > 0) {
      foundSomething = true;
      const matchType = warning ? 'Fuzzy' : 'Exact Case-Sensitive';
      console.log(chalk.green(`\nFound ${matches.length} symbol declaration(s) for '${name}' (Match Type: ${matchType}):`));
      for (const match of matches) {
        console.log(
          chalk.cyan(
            `\n• Kind: ${match.kind} | Name: ${match.name}${match.className ? ` (Class: ${match.className})` : ''}`
          )
        );
        console.log(`  Location: ${match.file}:${match.startLine}-${match.endLine}`);
        if (match.linkedQueries.length > 0) {
          console.log(chalk.yellow(`  Linked DB Queries (${match.linkedQueries.length}):`));
          console.table(
            match.linkedQueries.map((q) => ({
              DB: q.dbType,
              Operation: q.operation,
              Target: q.target || 'N/A',
              Line: q.line
            }))
          );
        } else {
          console.log(`  Linked DB Queries: None`);
        }
      }
    }

    // 3. Event Emitters (clients)
    const matchedEmitters = index.clients.filter(c => c.dbType === 'emitter' && c.variableName.toLowerCase().includes(name.toLowerCase()));
    if (matchedEmitters.length > 0) {
      foundSomething = true;
      console.log(chalk.green(`\nFound ${matchedEmitters.length} event emitter(s) matching '${name}':`));
      for (const c of matchedEmitters) {
        console.log(chalk.cyan(`\n• Variable: ${c.variableName} | Type: Emitter`));
        console.log(`  Location: ${c.file}:${c.line}`);
        console.log(`  Expression: ${c.initExpression}`);
      }
    }

    // 4. Events (target of emitter calls)
    const matchedEvents = index.queries.filter(
      q => q.dbType === 'emitter' && 
      q.target?.toLowerCase() === name.toLowerCase() && 
      ['on', 'once', 'addListener'].includes(q.operation)
    );
    if (matchedEvents.length > 0) {
      foundSomething = true;
      console.log(chalk.green(`\nFound ${matchedEvents.length} registration site(s) for event '${name}':`));
      for (const q of matchedEvents) {
        console.log(chalk.cyan(`\n• Event: ${q.target} | Listener: ${q.operation}`));
        console.log(`  Location: ${q.file}:${q.line}`);
        if (q.enclosingFunction) console.log(`  Enclosing function: ${q.enclosingFunction}`);
        if (q.enclosingClass) console.log(`  Enclosing class: ${q.enclosingClass}`);
      }
    }

    if (!foundSomething) {
      console.log(chalk.red(`No declarations, files, emitters, or events found matching '${name}'.`));
    }
  });

program
  .command('refs <name>')
  .description('List every reference site where a symbol, file, event emitter, or event name is imported, used, emitted, or listened to')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (name, options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }

    const index = await loadIndexFromSqlite(dbPath);
    let foundRefs = false;

    // 1. Symbol References (Functions, Classes, Variables, Emitters)
    const matchingRefs = (index.references || []).filter(
      (r) => r.declarationId.endsWith(`:${name}`) || r.id.endsWith(`:${name}`) || r.declarationId.includes(`:${name}:`)
    );

    if (matchingRefs.length > 0) {
      foundRefs = true;
      console.log(chalk.green(`\nFound ${matchingRefs.length} symbol reference site(s) for '${name}':`));
      console.table(
        matchingRefs.map((r) => ({
          File: r.file,
          Line: r.line,
          Type: r.refType,
          Declaration: r.declarationId
        }))
      );
    }

    // 2. Event Emitter References (calls on event names)
    const eventRefs = (index.queries || []).filter(
      (q) => q.dbType === 'emitter' && q.target?.toLowerCase() === name.toLowerCase()
    );

    if (eventRefs.length > 0) {
      foundRefs = true;
      console.log(chalk.green(`\nFound ${eventRefs.length} call site(s) emitting/listening to event '${name}':`));
      console.table(
        eventRefs.map((q) => ({
          File: q.file,
          Line: q.line,
          Operation: q.operation,
          Enclosing: q.enclosingFunction || q.enclosingClass || 'Global'
        }))
      );
    }

    // 3. File Import References
    const { sourceFiles } = loadProject({ rootDir });
    const fileImports: Array<{ File: string; Line: number; ImportPath: string }> = [];
    for (const sf of sourceFiles) {
      const filePath = sf.getFilePath().replace(/\\/g, '/');
      const imports = sf.getImportDeclarations();
      for (const imp of imports) {
        const val = imp.getModuleSpecifierValue();
        if (val.toLowerCase().includes(name.toLowerCase())) {
          fileImports.push({
            File: filePath,
            Line: imp.getStartLineNumber(),
            ImportPath: val
          });
        }
      }
    }
    if (fileImports.length > 0) {
      foundRefs = true;
      console.log(chalk.green(`\nFound ${fileImports.length} file import site(s) referencing path containing '${name}':`));
      console.table(fileImports);
    }

    if (!foundRefs) {
      console.log(chalk.yellow(`No references indexed for '${name}'.`));
    }
  });

const listCmd = program
  .command('list')
  .description('List files, symbols, emitters, events, or packages in the workspace');

listCmd
  .command('functions')
  .description('List all functions and methods in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    const index = fs.existsSync(dbPath) ? await loadIndexFromSqlite(dbPath) : { queries: [], clients: [], functions: [] } as any;
    const { sourceFiles } = loadProject({ rootDir });
    const decls = getAllDeclarations(sourceFiles, index).filter(d => d.kind === 'function' || d.kind === 'method');
    console.log(chalk.green(`\nFound ${decls.length} function(s):`));
    console.table(decls.map(d => ({ Name: d.name, Kind: d.kind, File: d.file, Line: `${d.startLine}-${d.endLine}` })));
  });

listCmd
  .command('classes')
  .description('List all classes in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    const index = fs.existsSync(dbPath) ? await loadIndexFromSqlite(dbPath) : { queries: [], clients: [], functions: [] } as any;
    const { sourceFiles } = loadProject({ rootDir });
    const decls = getAllDeclarations(sourceFiles, index).filter(d => d.kind === 'class');
    console.log(chalk.green(`\nFound ${decls.length} class(es):`));
    console.table(decls.map(d => ({ Name: d.name, File: d.file, Line: `${d.startLine}-${d.endLine}` })));
  });

listCmd
  .command('variables')
  .description('List all variable declarations in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    const index = fs.existsSync(dbPath) ? await loadIndexFromSqlite(dbPath) : { queries: [], clients: [], functions: [] } as any;
    const { sourceFiles } = loadProject({ rootDir });
    const decls = getAllDeclarations(sourceFiles, index).filter(d => d.kind === 'variable');
    console.log(chalk.green(`\nFound ${decls.length} variable(s):`));
    console.table(decls.map(d => ({ Name: d.name, File: d.file, Line: `${d.startLine}-${d.endLine}` })));
  });

listCmd
  .command('files')
  .description('List all parsed files in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const { sourceFiles } = loadProject({ rootDir });
    console.log(chalk.green(`\nFound ${sourceFiles.length} file(s):`));
    console.table(sourceFiles.map(sf => ({ File: sf.getFilePath().replace(/\\/g, '/') })));
  });

listCmd
  .command('emitters')
  .description('List all event emitters instantiated in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);
    const emitters = index.clients.filter(c => c.dbType === 'emitter');
    console.log(chalk.green(`\nFound ${emitters.length} event emitter(s):`));
    console.table(emitters.map(e => ({ Variable: e.variableName, File: e.file, Line: e.line, Init: e.initExpression })));
  });

listCmd
  .command('events')
  .description('List all unique event names used in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);
    const emitterQueries = index.queries.filter(q => q.dbType === 'emitter');
    const uniqueEvents = Array.from(new Set(emitterQueries.map(q => q.target).filter(t => t && t !== 'dynamic-event')));
    console.log(chalk.green(`\nFound ${uniqueEvents.length} unique event(s):`));
    console.table(uniqueEvents.map(e => ({ Event: e, Registrations: emitterQueries.filter(q => q.target === e && ['on', 'once', 'addListener'].includes(q.operation)).length, Emissions: emitterQueries.filter(q => q.target === e && q.operation === 'emit').length })));
  });

listCmd
  .command('packages')
  .description('List all external npm packages imported in the workspace')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const { sourceFiles } = loadProject({ rootDir });
    const pkgs = detectPackages(sourceFiles);
    console.log(chalk.green(`\nFound ${pkgs.length} external package(s):`));
    console.table(pkgs.map(p => ({ Package: p.name, 'Importing Files': p.count })));
  });

program
  .command('fetch [project]')
  .description('List or fetch synced project index.sqlite from Google Drive by project name or ID')
  .option('-d, --dir <path>', 'Destination directory', '.')
  .action(async (project, options) => {
    const rootDir = path.resolve(options.dir);
    const destDbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!project) {
      console.log(chalk.blue('[dbci fetch] Listing synced projects in Google Drive...'));
      const res = await fetchProjectFromDrive();
      if (res.success && res.projects) {
        console.log(chalk.green(res.message));
        console.table(
          res.projects.map((p) => ({
            'Project Name': p.name,
            'Project ID': p.id,
            'Last Modified': p.lastModified || 'N/A'
          }))
        );
        console.log(chalk.gray('\nRun `dbci fetch <project-name-or-id>` to download a project index locally.'));
      } else {
        console.log(chalk.yellow(res.message));
      }
    } else {
      console.log(chalk.blue(`[dbci fetch] Fetching index for project '${project}'...`));
      const res = await fetchProjectFromDrive(project, destDbPath);
      if (res.success) {
        console.log(chalk.green(res.message));
      } else {
        console.error(chalk.red(res.message));
        process.exit(1);
      }
    }
  });

program
  .command('discuss')
  .description('Open or append entries to a discussion thread for a function, file, class, or project')
  .requiredOption('-t, --target <name>', 'Target name (function, class, file, or project)')
  .option('--type <type>', 'Target type (file, function, class, query, project)', 'function')
  .option('--title <title>', 'Thread title', 'Discussion')
  .option('-b, --body <body>', 'Discussion entry content')
  .option('-a, --author <author>', 'Author type (user or ai)', 'user')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }

    if (!options.body) {
      // List existing thread entries for target
      const index = await loadIndexFromSqlite(dbPath);
      const threads = (index.threads || []).filter((t) => t.targetId === options.target || t.title.includes(options.target));

      if (threads.length === 0) {
        console.log(chalk.yellow(`No discussion threads found for target '${options.target}'. Pass --body <body> to add one.`));
        return;
      }

      console.log(chalk.green(`\nDiscussion Threads for '${options.target}':`));
      for (const t of threads) {
        console.log(chalk.cyan(`\nThread: ${t.title} [Target: ${t.targetType}:${t.targetId}]`));
        const entries = (index.entries || []).filter((e) => e.threadId === t.id);
        console.table(
          entries.map((e) => ({
            Author: e.author,
            Body: e.body,
            Date: e.createdAt
          }))
        );
      }
      return;
    }

    const res = await addDiscussionEntry(
      dbPath,
      options.type,
      options.target,
      options.title,
      options.body,
      options.author === 'ai' ? 'ai' : 'user'
    );
    console.log(chalk.green(`Successfully added discussion entry to thread '${res.threadId}'!`));
  });

program
  .command('decisions')
  .description('Record or view decision rationale history for a function, architecture, or project')
  .requiredOption('-t, --target <name>', 'Target name')
  .option('--type <type>', 'Target type (file, function, class, query, project)', 'function')
  .option('-s, --summary <summary>', 'Short decision summary')
  .option('-r, --rationale <rationale>', 'Detailed rationale for decision')
  .option('--by <decidedBy>', 'Decided by (user or ai)', 'user')
  .option('--supersedes <decisionId>', 'ID of decision superseded by this decision')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }

    if (options.summary && options.rationale) {
      const res = await addDecisionRecord(
        dbPath,
        options.type,
        options.target,
        options.summary,
        options.rationale,
        options.by,
        options.supersedes || null
      );
      console.log(chalk.green(`Successfully recorded decision '${res.decisionId}'!`));
      return;
    }

    const index = await loadIndexFromSqlite(dbPath);
    const decisions = (index.decisions || []).filter((d) => d.targetId === options.target || d.targetType === options.target);

    if (decisions.length === 0) {
      console.log(chalk.yellow(`No decision rationale recorded for '${options.target}'. Pass --summary and --rationale to add one.`));
      return;
    }

    console.log(chalk.green(`\nDecision Rationale History for '${options.target}':`));
    console.table(
      decisions.map((d) => ({
        ID: d.id,
        Summary: d.summary,
        Rationale: d.rationale,
        'Decided By': d.decidedBy,
        Date: d.decidedAt,
        Supersedes: d.supersedes || 'None (Initial)'
      }))
    );
  });

const syncCommand = program.command('sync').description('Manage Google Drive backup and restore of SQLite index');

syncCommand
  .command('push')
  .description('Upload local index.sqlite to visible Google Drive dbci/<projectId>/ folder')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    console.log(chalk.blue('[dbci sync] Pushing index to Google Drive...'));
    const result = await pushIndexToDrive({ dbPath, rootDir });
    if (result.success) {
      console.log(chalk.green(`[dbci sync] ${result.message}`));
    } else {
      console.error(chalk.red(result.message));
      process.exit(1);
    }
  });

syncCommand
  .command('pull')
  .description('Download index.sqlite from visible Google Drive dbci/<projectId>/ folder to local .dbci/index.sqlite')
  .option('-d, --dir <path>', 'Root directory', '.')
  .action(async (options) => {
    const rootDir = path.resolve(options.dir);
    const dbPath = path.join(rootDir, '.dbci', 'index.sqlite');
    console.log(chalk.blue('[dbci sync] Pulling index from Google Drive...'));
    const result = await pullIndexFromDrive({ dbPath, rootDir });
    if (result.success) {
      console.log(chalk.green(`[dbci sync] ${result.message}`));
    } else {
      console.error(chalk.red(result.message));
      process.exit(1);
    }
  });

program
  .command('query')
  .description('Query index for DB touches or table references')
  .option('--db <type>', 'Filter by DB type (mongo, mongodb, firebase, supabase, mysql)')
  .option('--table <name>', 'Filter by target collection or table name')
  .action(async (options) => {
    const dbPath = path.resolve('.dbci/index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found at .dbci/index.sqlite. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);

    if (options.db) {
      const targetDb = options.db.toLowerCase();
      const filtered = index.queries.filter((q) => {
        const dbType = q.dbType.toLowerCase();
        if (targetDb === 'mongo' || targetDb === 'mongodb') {
          return dbType === 'mongo' || dbType === 'mongodb';
        }
        return dbType === targetDb;
      });
      console.log(chalk.yellow(`\nFound ${filtered.length} queries for DB type '${options.db}':`));
      console.table(
        filtered.map((q) => ({
          File: q.file,
          Line: q.line,
          Operation: q.operation,
          Target: q.target || 'N/A',
          Function: q.enclosingFunction || '<top-level>'
        }))
      );
    } else if (options.table) {
      const targetTable = options.table.toLowerCase();
      const filtered = index.queries.filter((q) => q.target && q.target.toLowerCase().includes(targetTable));
      console.log(chalk.yellow(`\nFound ${filtered.length} queries targeting '${options.table}':`));
      console.table(
        filtered.map((q) => ({
          DB: q.dbType,
          File: q.file,
          Line: q.line,
          Operation: q.operation,
          Target: q.target,
          Function: q.enclosingFunction || '<top-level>'
        }))
      );
    } else {
      console.log(chalk.red('Please specify --db <type> or --table <name>'));
    }
  });

program
  .command('trace <functionName>')
  .description('Print DB touches and call chain for a function')
  .action(async (functionName) => {
    const dbPath = path.resolve('.dbci/index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);

    const fn = index.functions.find((f) => f.name === functionName);
    if (!fn) {
      console.log(chalk.red(`Function '${functionName}' not found in index.`));
      return;
    }

    console.log(chalk.cyan(`\nFunction Trace: ${fn.name} (${fn.file}:${fn.line}-${fn.endLine || fn.line})`));
    console.log(`Direct DB Touches: ${fn.touchesDb.length > 0 ? fn.touchesDb.join(', ') : 'None'}`);
    console.log(`Transitive DB Touches: ${fn.transitiveTouchesDb.length > 0 ? fn.transitiveTouchesDb.join(', ') : 'None'}`);

    const callChain = index.edges.filter((e) => e.callerId === fn.id);
    if (callChain.length > 0) {
      console.log(chalk.yellow('\nDirect Calls Made:'));
      console.table(callChain.map((e) => ({ Callee: e.calleeId, Location: `${e.file}:${e.line}` })));
    }
  });

program
  .command('unresolved')
  .description('List all queries and clients that could not be statically resolved')
  .action(async () => {
    const dbPath = path.resolve('.dbci/index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);

    console.log(chalk.yellow(`\nUnresolved Query Calls (${index.unresolved.length}):`));
    console.table(
      index.unresolved.map((u) => ({
        DB: u.dbType,
        File: u.file,
        Line: u.line,
        Operation: u.operation,
        Reason: u.unresolvedReason || 'Unknown'
      }))
    );
  });

program
  .command('export')
  .description('Export full IndexResult payload as JSON')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const dbPath = path.resolve('.dbci/index.sqlite');
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red('[dbci] Error: Index file not found. Run `dbci scan` first.'));
      process.exit(1);
    }
    const index = await loadIndexFromSqlite(dbPath);
    console.log(JSON.stringify(index, null, 2));
  });

program.parse(process.argv);
