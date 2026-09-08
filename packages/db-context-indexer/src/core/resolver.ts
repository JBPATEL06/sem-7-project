import { SourceFile } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '../types.js';

export function resolveQueries(
  queries: DbQueryCall[],
  clients: DbClientDeclaration[],
  sourceFiles: SourceFile[]
): { queries: DbQueryCall[]; unresolved: DbQueryCall[] } {
  const fileMap = new Map<string, SourceFile>();
  for (const sf of sourceFiles) {
    const relPath = sf.getFilePath().replace(/\\/g, '/');
    fileMap.set(relPath, sf);
  }

  const updatedQueries: DbQueryCall[] = [];
  const unresolvedQueries: DbQueryCall[] = [];

  for (const query of queries) {
    const sf = fileMap.get(query.file);
    let matchedClient: DbClientDeclaration | null = null;

    if (sf) {
      // 1. Same-file client declaration check
      for (const client of clients) {
        if (client.file === query.file && client.dbType === query.dbType) {
          matchedClient = client;
          break;
        }
      }

      // 2. Cross-file import resolution via ts-morph AST imports
      if (!matchedClient) {
        const importDecls = sf.getImportDeclarations();
        for (const imp of importDecls) {
          const moduleSf = imp.getModuleSpecifierSourceFile();
          if (moduleSf) {
            const modPath = moduleSf.getFilePath().replace(/\\/g, '/');
            for (const client of clients) {
              if ((client.file.includes(modPath) || modPath.includes(client.file)) && client.dbType === query.dbType) {
                matchedClient = client;
                break;
              }
            }
          }
          if (matchedClient) break;
        }
      }
    }

    // 3. Fallback for global / cross-module registered clients matching dbType
    if (!matchedClient && clients.length > 0) {
      const typeMatch = clients.find((c) => c.dbType === query.dbType);
      if (typeMatch) {
        matchedClient = typeMatch;
      }
    }

    if (matchedClient) {
      const resolvedQuery: DbQueryCall = {
        ...query,
        clientRefId: matchedClient.id,
        resolved: query.resolved
      };
      updatedQueries.push(resolvedQuery);
      if (!resolvedQuery.resolved) {
        unresolvedQueries.push(resolvedQuery);
      }
    } else {
      const unresQuery: DbQueryCall = {
        ...query,
        clientRefId: null,
        resolved: false,
        unresolvedReason: query.unresolvedReason || 'unresolved-import-graph'
      };
      updatedQueries.push(unresQuery);
      unresolvedQueries.push(unresQuery);
    }
  }

  return { queries: updatedQueries, unresolved: unresolvedQueries };
}
