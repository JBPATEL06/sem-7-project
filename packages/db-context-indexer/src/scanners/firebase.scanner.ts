import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '../types.js';
import {
  getRelativeFilePath,
  getEnclosingFunction,
  getEnclosingClass,
  extractLiteralValue,
  determineConfigSource
} from './scannerUtils.js';

const FIREBASE_OPERATIONS = new Set([
  'collection',
  'doc',
  'get',
  'set',
  'add',
  'update',
  'delete',
  'where',
  'onSnapshot'
]);

function isFirebaseCandidate(expr: Node): boolean {
  const text = expr.getText();
  if (
    text.includes('firestore') ||
    text.includes('collection(') ||
    text.includes('doc(') ||
    text.startsWith('db.') ||
    text.startsWith('admin.') ||
    text.startsWith('firestore.')
  ) {
    return true;
  }
  return false;
}

export function scanFirebase(sourceFile: SourceFile): {
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
      if (
        exprText === 'initializeApp' ||
        exprText === 'getFirestore' ||
        exprText === 'admin.firestore' ||
        exprText === 'firebase.initializeApp' ||
        exprText === 'firebase.firestore'
      ) {
        const line = node.getStartLineNumber();
        const start = node.getStart();
        const parent = node.getParent();
        let varName = 'firestoreDb';
        if (Node.isVariableDeclaration(parent)) {
          varName = parent.getName();
        }
        const args = node.getArguments();
        const configSource = args.length > 0 ? determineConfigSource(args[0]) : 'unknown';

        clients.push({
          id: `firebase:client:${file}:${line}:${start}:${varName}`,
          file,
          line,
          variableName: varName,
          dbType: 'firebase',
          initExpression: node.getText(),
          exportedAs: null,
          configSource
        });
      }
    }
  });

  // 2. Detect Queries
  sourceFile.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      let propName: string | null = null;

      if (Node.isPropertyAccessExpression(expr)) {
        propName = expr.getName();
      }

      if (propName && FIREBASE_OPERATIONS.has(propName)) {
        if (isFirebaseCandidate(expr)) {
          const line = node.getStartLineNumber();
          const start = node.getStart();
          let target: string | null = null;
          let resolved = false;

          const args = node.getArguments();
          if (propName === 'collection' || propName === 'doc') {
            if (args.length > 0) {
              target = extractLiteralValue(args[0]);
              if (target) resolved = true;
            }
          } else {
            let parentExpr = expr;
            while (Node.isPropertyAccessExpression(parentExpr)) {
              const innerExpr = parentExpr.getExpression();
              if (Node.isCallExpression(innerExpr)) {
                const innerCallExpr = innerExpr.getExpression();
                if (Node.isPropertyAccessExpression(innerCallExpr)) {
                  const innerPropName = innerCallExpr.getName();
                  if (innerPropName === 'collection' || innerPropName === 'doc') {
                    const innerArgs = innerExpr.getArguments();
                    if (innerArgs.length > 0) {
                      target = extractLiteralValue(innerArgs[0]);
                      if (target) resolved = true;
                    }
                    break;
                  }
                }
                parentExpr = innerCallExpr;
              } else {
                break;
              }
            }
          }

          queries.push({
            id: `firebase:query:${file}:${line}:${start}:${propName}`,
            file,
            line,
            enclosingFunction: getEnclosingFunction(node),
            enclosingClass: getEnclosingClass(node),
            dbType: 'firebase',
            operation: propName,
            target,
            clientRefId: null,
            resolved,
            unresolvedReason: resolved ? undefined : 'dynamic-target-expression'
          });
        }
      }
    }
  });

  return { clients, queries };
}
