import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '../types.js';
import {
  getRelativeFilePath,
  getEnclosingFunction,
  getEnclosingClass,
  extractLiteralValue,
  determineConfigSource
} from './scannerUtils.js';

export function extractSqlTables(sql: string): string[] {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const tables = new Set<string>();

  const regex = /(?:FROM|JOIN|INTO|UPDATE)\s+[`"']?([a-zA-Z0-9_]+)[`"']?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    if (match[1]) {
      tables.add(match[1]);
    }
  }

  return Array.from(tables);
}

export function scanMysql(sourceFile: SourceFile): {
  clients: DbClientDeclaration[];
  queries: DbQueryCall[];
} {
  const clients: DbClientDeclaration[] = [];
  const queries: DbQueryCall[] = [];
  const file = getRelativeFilePath(sourceFile);

  // 1. Detect Client Init
  sourceFile.forEachDescendant((node) => {
    let isClientInit = false;
    let initExpr = '';

    if (Node.isNewExpression(node)) {
      const exprText = node.getExpression().getText();
      if (exprText === 'Pool' || exprText === 'Client' || exprText === 'pg.Pool' || exprText === 'pg.Client') {
        isClientInit = true;
        initExpr = node.getText();
      }
    } else if (Node.isCallExpression(node)) {
      const exprText = node.getExpression().getText();
      if (
        exprText === 'createConnection' ||
        exprText === 'createPool' ||
        exprText === 'mysql.createConnection' ||
        exprText === 'mysql.createPool' ||
        exprText === 'mysql2.createConnection' ||
        exprText === 'mysql2.createPool'
      ) {
        isClientInit = true;
        initExpr = node.getText();
      }
    }

    if (isClientInit) {
      const line = node.getStartLineNumber();
      const start = node.getStart();
      const parent = node.getParent();
      let varName = 'dbPool';
      if (Node.isVariableDeclaration(parent)) {
        varName = parent.getName();
      }

      const text = node.getText();
      const isLocalXampp = text.includes('localhost') || text.includes('127.0.0.1');

      clients.push({
        id: `mysql:client:${file}:${line}:${start}:${varName}`,
        file,
        line,
        variableName: varName,
        dbType: 'mysql',
        initExpression: initExpr,
        exportedAs: null,
        configSource: determineConfigSource(node),
        metadata: {
          'local-xampp-likely': isLocalXampp
        }
      });
    }
  });

  // 2. Detect Queries
  sourceFile.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (propName === 'query' || propName === 'execute') {
          const line = node.getStartLineNumber();
          const start = node.getStart();
          const args = node.getArguments();
          let target: string | null = null;
          let resolved = false;
          let unresolvedReason: string | undefined;

          if (args.length > 0) {
            const firstArg = args[0];
            const sqlLiteral = extractLiteralValue(firstArg);
            if (sqlLiteral) {
              const tables = extractSqlTables(sqlLiteral);
              if (tables.length > 0) {
                target = tables.join(',');
                resolved = true;
              } else {
                unresolvedReason = 'unparsed-sql-structure';
              }
            } else if (Node.isTemplateExpression(firstArg)) {
              unresolvedReason = 'template-literal-with-interpolation';
            } else {
              unresolvedReason = 'dynamic-target-expression';
            }
          } else {
            unresolvedReason = 'missing-query-argument';
          }

          queries.push({
            id: `mysql:query:${file}:${line}:${start}:${propName}`,
            file,
            line,
            enclosingFunction: getEnclosingFunction(node),
            enclosingClass: getEnclosingClass(node),
            dbType: 'mysql',
            operation: propName,
            target,
            clientRefId: null,
            resolved,
            unresolvedReason: resolved ? undefined : unresolvedReason
          });
        }
      }
    }
  });

  return { clients, queries };
}
