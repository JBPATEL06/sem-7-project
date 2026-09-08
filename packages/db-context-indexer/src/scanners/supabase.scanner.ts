import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '../types.js';
import {
  getRelativeFilePath,
  getEnclosingFunction,
  getEnclosingClass,
  extractLiteralValue,
  determineConfigSource
} from './scannerUtils.js';

const SUPABASE_OPERATIONS = new Set([
  'select',
  'insert',
  'update',
  'delete',
  'upsert'
]);

function isSupabaseCandidate(expr: Node): boolean {
  const text = expr.getText();
  if (text.includes('.from(') || text.includes('supabase') || text.includes('createClient')) {
    return true;
  }
  return false;
}

export function scanSupabase(sourceFile: SourceFile): {
  clients: DbClientDeclaration[];
  queries: DbQueryCall[];
} {
  const clients: DbClientDeclaration[] = [];
  const queries: DbQueryCall[] = [];
  const file = getRelativeFilePath(sourceFile);

  // 1. Detect Client Init
  sourceFile.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      const exprText = node.getExpression().getText();
      if (exprText === 'createClient') {
        const line = node.getStartLineNumber();
        const start = node.getStart();
        const parent = node.getParent();
        let varName = 'supabaseClient';
        if (Node.isVariableDeclaration(parent)) {
          varName = parent.getName();
        }
        const args = node.getArguments();
        let configSource: 'env' | 'literal' | 'unknown' = 'unknown';
        if (args.length > 0) {
          configSource = determineConfigSource(args[0]);
        }

        clients.push({
          id: `supabase:client:${file}:${line}:${start}:${varName}`,
          file,
          line,
          variableName: varName,
          dbType: 'supabase',
          initExpression: node.getText(),
          exportedAs: null,
          configSource
        });
      }
    }
  });

  // 2. Detect Query Chain
  sourceFile.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (SUPABASE_OPERATIONS.has(propName)) {
          if (isSupabaseCandidate(expr)) {
            const line = node.getStartLineNumber();
            const start = node.getStart();
            let target: string | null = null;
            let resolved = false;

            let currExpr: Node = expr.getExpression();
            while (currExpr) {
              if (Node.isCallExpression(currExpr)) {
                const innerExpr = currExpr.getExpression();
                if (Node.isPropertyAccessExpression(innerExpr) && innerExpr.getName() === 'from') {
                  const fromArgs = currExpr.getArguments();
                  if (fromArgs.length > 0) {
                    target = extractLiteralValue(fromArgs[0]);
                    if (target) resolved = true;
                  }
                  break;
                }
                currExpr = innerExpr;
              } else if (Node.isPropertyAccessExpression(currExpr)) {
                currExpr = currExpr.getExpression();
              } else {
                break;
              }
            }

            queries.push({
              id: `supabase:query:${file}:${line}:${start}:${propName}`,
              file,
              line,
              enclosingFunction: getEnclosingFunction(node),
              enclosingClass: getEnclosingClass(node),
              dbType: 'supabase',
              operation: propName,
              target,
              clientRefId: null,
              resolved,
              unresolvedReason: resolved ? undefined : 'dynamic-target-expression'
            });
          }
        }
      }
    }
  });

  return { clients, queries };
}
