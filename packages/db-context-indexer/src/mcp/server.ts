import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { loadIndexFromSqlite, generateInstructionDoc } from '@ai-manager/core';

import { buildIndex } from '../core/indexBuilder.js';

export interface McpServerOptions {
  rootDir?: string;
  dbPath?: string;
  autoRescan?: boolean;
}

export function getGitMetadata(rootDir: string, filePath?: string) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const commitSha = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    let isDirty = false;
    if (filePath) {
      const relPath = path.relative(rootDir, path.resolve(rootDir, filePath));
      const status = execSync(`git status --porcelain "${relPath}"`, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      isDirty = status.length > 0;
    } else {
      const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      isDirty = status.length > 0;
    }
    return { branch: branch || 'local', commitSha, isDirty };
  } catch {
    return { branch: 'local', commitSha: undefined, isDirty: false };
  }
}

export function readRawSource(rootDir: string, filePath: string, startLine: number, endLine?: number): string {
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
    if (!fs.existsSync(absPath)) return '';
    const lines = fs.readFileSync(absPath, 'utf8').split('\n');
    const start = Math.max(0, startLine - 1);
    const end = endLine ? Math.min(lines.length, endLine) : Math.min(lines.length, start + 35);
    return lines.slice(start, end).join('\n');
  } catch {
    return '';
  }
}

export function readSurroundingSnippet(rootDir: string, filePath: string, targetLine: number, radius = 3): string {
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
    if (!fs.existsSync(absPath)) return '';
    const lines = fs.readFileSync(absPath, 'utf8').split('\n');
    const start = Math.max(0, targetLine - 1 - radius);
    const end = Math.min(lines.length, targetLine + radius);
    return lines.slice(start, end).join('\n');
  } catch {
    return '';
  }
}

export async function getOrBuildIndex(options: McpServerOptions = {}) {
  const rootDir = path.resolve(options.rootDir || '.');
  const dbPath = path.resolve(options.dbPath || path.join(rootDir, '.dbci', 'index.sqlite'));

  if (!fs.existsSync(dbPath) && options.autoRescan !== false) {
    await buildIndex({ rootDir, outputPath: dbPath, full: true });
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Index file not found at ${dbPath}. Run dbci scan first.`);
  }

  const index = await loadIndexFromSqlite(dbPath);
  return { index, rootDir, dbPath };
}

export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'db-context-indexer',
    version: '0.2.0'
  });

  // Tool 1: dbci_summary
  server.tool(
    'dbci_summary',
    'Get high-level static AST index summary, function counts, DB query counts, and project health score.',
    {},
    async () => {
      try {
        const { index, rootDir, dbPath } = await getOrBuildIndex(options);
        const queriesCount = index.queries ? index.queries.length : 0;
        const unresolvedCount = index.unresolved ? index.unresolved.length : 0;
        const healthPercent = Math.round(((queriesCount - unresolvedCount) / Math.max(1, queriesCount)) * 100);

        const summary = {
          mode: 'MCP_NATIVE',
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
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_summary error: ${err.message}` }]
        };
      }
    }
  );

  // Tool 2: dbci_query
  server.tool(
    'dbci_query',
    'Query indexed database calls by database type (mongodb, firebase, supabase, mysql), collection/table target, or enclosing function name.',
    {
      db: z.enum(['mongodb', 'firebase', 'supabase', 'mysql', 'unknown']).optional().describe('Filter by database type'),
      table: z.string().optional().describe('Filter by collection or table target name'),
      functionName: z.string().optional().describe('Filter by enclosing function name')
    },
    async ({ db, table, functionName }) => {
      try {
        const { index } = await getOrBuildIndex(options);
        let queries = index.queries || [];

        if (db) {
          queries = queries.filter(q => q.dbType === db);
        }
        if (table) {
          const targetLower = table.toLowerCase();
          queries = queries.filter(q => q.target && q.target.toLowerCase().includes(targetLower));
        }
        if (functionName) {
          const fnLower = functionName.toLowerCase();
          queries = queries.filter(q => q.enclosingFunction && q.enclosingFunction.toLowerCase().includes(fnLower));
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: queries.length, queries }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_query error: ${err.message}` }]
        };
      }
    }
  );

  // Tool 3: dbci_trace
  server.tool(
    'dbci_trace',
    'Trace direct and transitive database calls for a function symbol, including caller chain with surrounding snippets, callees, and declaration metadata.',
    {
      functionName: z.string().describe('Target function symbol name to trace'),
      maxDepth: z.number().optional().describe('Maximum recursion depth cap (default 10)')
    },
    async ({ functionName, maxDepth }) => {
      try {
        const { index, rootDir } = await getOrBuildIndex(options);
        const depthCap = maxDepth || 10;
        const fnNameLower = functionName.toLowerCase();

        const fn = (index.functions || []).find(
          f => f.name.toLowerCase() === fnNameLower || f.id.toLowerCase() === fnNameLower
        );

        if (!fn) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Function '${functionName}' not found in index.` }, null, 2)
              }
            ]
          };
        }

        const directQueries = (index.queries || []).filter(
          q => q.enclosingFunction === fn.name || (fn.id && q.enclosingFunction === fn.id)
        );

        const callers: any[] = [];
        const visited = new Set<string>();

        function walkCallers(targetFnName: string, currentDepth: number) {
          if (currentDepth >= depthCap || visited.has(targetFnName)) return;
          visited.add(targetFnName);

          const incomingEdges = (index.edges || []).filter(
            e => e.calleeId.toLowerCase() === targetFnName.toLowerCase() || e.calleeId.split(':').pop()?.toLowerCase() === targetFnName.toLowerCase()
          );

          for (const edge of incomingEdges) {
            callers.push({
              callerId: edge.callerId,
              file: edge.file,
              line: edge.line,
              depth: currentDepth + 1,
              surroundingSnippet: readSurroundingSnippet(rootDir, edge.file, edge.line, 3)
            });
            const callerName = edge.callerId.split(':').pop() || edge.callerId;
            walkCallers(callerName, currentDepth + 1);
          }
        }

        walkCallers(fn.name, 0);

        const gitMeta = getGitMetadata(rootDir, fn.file);
        const rawSource = readRawSource(rootDir, fn.file, fn.line);

        const declaration = {
          file: fn.file,
          line: fn.line,
          className: fn.className || null,
          rawSource,
          branch: gitMeta.branch,
          commitSha: gitMeta.commitSha,
          isDirty: gitMeta.isDirty
        };

        const result = {
          function: fn,
          declaration,
          directTouchesDb: fn.touchesDb,
          transitiveTouchesDb: fn.transitiveTouchesDb,
          directQueriesCount: directQueries.length,
          directQueries,
          callerAncestorsCount: callers.length,
          callers
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_trace error: ${err.message}` }]
        };
      }
    }
  );

  // Tool 4: dbci_functions
  server.tool(
    'dbci_functions',
    'List or filter indexed function symbols with raw source code, declaration metadata (branch, commitSha, isDirty), and database touch metadata.',
    {
      search: z.string().optional().describe('Search substring for function name'),
      db: z.enum(['mongodb', 'firebase', 'supabase', 'mysql']).optional().describe('Filter functions that touch a specific database type'),
      file: z.string().optional().describe('Filter functions contained within a specific file path')
    },
    async ({ search, db, file }) => {
      try {
        const { index, rootDir } = await getOrBuildIndex(options);
        let functions = index.functions || [];

        if (search) {
          const searchLower = search.toLowerCase();
          functions = functions.filter(f => f.name.toLowerCase().includes(searchLower) || f.id.toLowerCase().includes(searchLower));
        }
        if (db) {
          functions = functions.filter(
            f => (f.touchesDb && f.touchesDb.includes(db as any)) || (f.transitiveTouchesDb && f.transitiveTouchesDb.includes(db as any))
          );
        }
        if (file) {
          const fileLower = file.toLowerCase();
          functions = functions.filter(f => f.file.toLowerCase().includes(fileLower));
        }

        const enrichedFunctions = functions.map(fn => {
          const gitMeta = getGitMetadata(rootDir, fn.file);
          const rawSource = readRawSource(rootDir, fn.file, fn.line);

          return {
            ...fn,
            declaration: {
              file: fn.file,
              line: fn.line,
              className: fn.className || null,
              rawSource,
              branch: gitMeta.branch,
              commitSha: gitMeta.commitSha,
              isDirty: gitMeta.isDirty
            }
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: enrichedFunctions.length, functions: enrichedFunctions }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_functions error: ${err.message}` }]
        };
      }
    }
  );

  // Tool 5: dbci_proposals (Read-only for IDE agents — approval/rejection is strictly human-only)
  server.tool(
    'dbci_proposals',
    'List proposals in the human-approval queue (read-only for AI agents; approval/rejection requires human CLI interactive action).',
    {
      status: z.enum(['pending', 'approved', 'rejected']).optional().describe('Filter proposals by status (default pending)'),
      type: z.enum(['code', 'discussion', 'decision', 'plan', 'issue']).optional().describe('Filter proposals by type')
    },
    async ({ status, type }) => {
      try {
        const { index } = await getOrBuildIndex(options);
        let proposals = index.proposals || [];

        const targetStatus = status || 'pending';
        proposals = proposals.filter(p => p.status === targetStatus);

        if (type) {
          proposals = proposals.filter(p => p.type === type);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                note: 'Read-only proposal review tool for AI agents. Approvals must be performed interactively by human operator.',
                count: proposals.length,
                proposals
              }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_proposals error: ${err.message}` }]
        };
      }
    }
  );

  // Tool 6: dbci_instructions (Auto-generated AST-grounded system instruction context payload)
  server.tool(
    'dbci_instructions',
    'Retrieve the latest AST-grounded system instruction document compiled from project index summary, active plans, ADRs, and rules.',
    {
      format: z.enum(['agents', 'cursor', 'claude']).optional().describe('Target instruction format (default agents)')
    },
    async ({ format }) => {
      try {
        const { dbPath, rootDir } = await getOrBuildIndex(options);
        const doc = await generateInstructionDoc(dbPath, { format: format || 'agents', rootDir });

        return {
          content: [
            {
              type: 'text',
              text: doc
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `dbci_instructions error: ${err.message}` }]
        };
      }
    }
  );

  return server;
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
