import fs from 'fs';
import path from 'path';
import { loadProject } from './projectWalker.js';
import { scanMongo } from '../scanners/mongo.scanner.js';
import { scanFirebase } from '../scanners/firebase.scanner.js';
import { scanSupabase } from '../scanners/supabase.scanner.js';
import { scanMysql } from '../scanners/mysql.scanner.js';
import { scanAsyncAndEvents } from '../scanners/async.scanner.js';
import { ClientRegistry } from './clientRegistry.js';
import { resolveQueries } from './resolver.js';
import { buildCallGraph } from './callGraphBuilder.js';
import { buildReferences } from './referenceIndexer.js';
import {
  saveIndexToSqlite,
  loadIndexFromSqlite,
  cascadeDeleteFileFromIndex,
  SqliteDriverType,
  SCHEMA_SQL,
  IndexResult,
  DbClientDeclaration,
  DbQueryCall,
  FileHashEntry,
  ReferenceNode
} from '@ai-manager/core';
import { diffFileHashes, computeFileHash } from './incrementalScanner.js';

export interface BuildIndexOptions {
  rootDir: string;
  ignorePatterns?: string[];
  outputPath?: string;
  driver?: SqliteDriverType;
  full?: boolean;
}

export function ensureGitignoreDbci(rootDir: string): void {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const entry = '.dbci/';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.dbci')) {
      const updated = content.endsWith('\n') ? `${content}${entry}\n` : `${content}\n${entry}\n`;
      fs.writeFileSync(gitignorePath, updated, 'utf8');
    }
  } else {
    fs.writeFileSync(gitignorePath, `${entry}\n`, 'utf8');
  }
}

export async function buildIndex(options: BuildIndexOptions): Promise<IndexResult> {
  const rootDir = path.resolve(options.rootDir);
  const dbPath = options.outputPath || path.join(rootDir, '.dbci', 'index.sqlite');

  let existingIndex: IndexResult | null = null;
  if (!options.full && fs.existsSync(dbPath)) {
    try {
      existingIndex = await loadIndexFromSqlite(dbPath, { driver: options.driver });
    } catch {
      existingIndex = null;
    }
  }

  const { project, sourceFiles } = loadProject({ rootDir, ignorePatterns: options.ignorePatterns });
  const allCurrentFiles = sourceFiles.map((sf) => sf.getFilePath());

  const existingHashes = existingIndex?.fileHashes || [];
  const diff = diffFileHashes(allCurrentFiles, existingHashes);

  if (!options.full && existingIndex && diff.changed.length === 0 && diff.newFiles.length === 0 && diff.deleted.length === 0) {
    console.log(`[dbci] Incremental Scan: Unchanged: ${diff.unchanged.length} files | Changed: 0 | New: 0 | Deleted: 0`);
    return existingIndex;
  }

  console.log(
    `[dbci] Incremental Scan: Unchanged: ${diff.unchanged.length} files | Changed: ${diff.changed.length} | New: ${diff.newFiles.length} | Deleted: ${diff.deleted.length}`
  );

  if (fs.existsSync(dbPath)) {
    for (const delFile of [...diff.deleted, ...diff.changed]) {
      await cascadeDeleteFileFromIndex(dbPath, delFile, { driver: options.driver });
    }
  }

  const filesToParseSet = new Set([...diff.changed, ...diff.newFiles]);
  const filesToParse = options.full || !existingIndex
    ? sourceFiles
    : sourceFiles.filter((sf) => filesToParseSet.has(sf.getFilePath().replace(/\\/g, '/')));

  const rawClients: DbClientDeclaration[] = [];
  const rawQueries: DbQueryCall[] = [];

  for (const sf of filesToParse) {
    const m = scanMongo(sf);
    const f = scanFirebase(sf);
    const s = scanSupabase(sf);
    const my = scanMysql(sf);
    const ae = scanAsyncAndEvents(sf);

    rawClients.push(...m.clients, ...f.clients, ...s.clients, ...my.clients, ...ae.clients);
    rawQueries.push(...m.queries, ...f.queries, ...s.queries, ...my.queries, ...ae.queries);
  }

  const registry = new ClientRegistry();
  const registeredClients = registry.registerClients(rawClients, filesToParse);
  const { queries: resolvedQueries, unresolved } = resolveQueries(rawQueries, registeredClients, filesToParse);
  const { functions, edges } = buildCallGraph(filesToParse, resolvedQueries);
  const newReferences = buildReferences(filesToParse);

  const newHashes: FileHashEntry[] = allCurrentFiles.map((absPath) => {
    const relFile = absPath.replace(/\\/g, '/');
    return {
      file: relFile,
      contentHash: computeFileHash(absPath),
      lastScanned: new Date().toISOString()
    };
  });

  let finalClients = registeredClients;
  let finalQueries = resolvedQueries;
  let finalFunctions = functions;
  let finalEdges = edges;
  let finalReferences = newReferences;
  let finalUnresolved = unresolved;

  if (!options.full && existingIndex) {
    const unchangedSet = new Set(diff.unchanged);

    const retainedClients = existingIndex.clients.filter((c) => unchangedSet.has(c.file));
    const retainedQueries = existingIndex.queries.filter((q) => unchangedSet.has(q.file));
    const retainedFunctions = existingIndex.functions.filter((f) => unchangedSet.has(f.file));
    const retainedEdges = existingIndex.edges.filter((e) => unchangedSet.has(e.file));
    const retainedReferences = (existingIndex.references || []).filter((r) => unchangedSet.has(r.file));
    const retainedUnresolved = existingIndex.unresolved.filter((u) => unchangedSet.has(u.file));

    finalClients = [...retainedClients, ...registeredClients];
    finalQueries = [...retainedQueries, ...resolvedQueries];
    finalFunctions = [...retainedFunctions, ...functions];
    finalEdges = [...retainedEdges, ...edges];
    finalReferences = [...retainedReferences, ...newReferences];
    finalUnresolved = [...retainedUnresolved, ...unresolved];
  }

  const indexResult: IndexResult = {
    clients: finalClients,
    queries: finalQueries,
    functions: finalFunctions,
    edges: finalEdges,
    references: finalReferences,
    fileHashes: newHashes,
    unresolved: finalUnresolved
  };

  const queryIds = new Set<string>();
  for (const q of finalQueries) {
    if (queryIds.has(q.id)) {
      console.error(`[dbci] Error: Duplicate query ID detected: ${q.id}`);
      const matching = finalQueries.filter(fq => fq.id === q.id);
      console.error(JSON.stringify(matching, null, 2));
    }
    queryIds.add(q.id);
  }

  ensureGitignoreDbci(rootDir);
  await saveIndexToSqlite(dbPath, SCHEMA_SQL, indexResult, { driver: options.driver });

  return indexResult;
}
