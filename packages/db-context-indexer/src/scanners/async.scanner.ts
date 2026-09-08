import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '@ai-manager/core';
import {
  getRelativeFilePath,
  getEnclosingFunction,
  getEnclosingClass,
  extractLiteralValue
} from './scannerUtils.js';

export function scanAsyncAndEvents(sourceFile: SourceFile): {
  clients: DbClientDeclaration[];
  queries: DbQueryCall[];
} {
  const clients: DbClientDeclaration[] = [];
  const queries: DbQueryCall[] = [];
  const file = getRelativeFilePath(sourceFile);

  sourceFile.forEachDescendant((node) => {
    // 0. Detect Event Emitters instantiation (new EventEmitter(), new events.EventEmitter(), or class name ending with Emitter)
    if (Node.isNewExpression(node)) {
      const exprText = node.getExpression().getText();
      if (exprText === 'EventEmitter' || exprText === 'events.EventEmitter' || exprText.endsWith('Emitter')) {
        const line = node.getStartLineNumber();
        const start = node.getStart();
        const parent = node.getParent();
        let varName = 'emitter';
        if (Node.isVariableDeclaration(parent)) {
          varName = parent.getName();
        } else if (Node.isPropertyAssignment(parent)) {
          varName = parent.getName();
        } else if (Node.isPropertyDeclaration(parent)) {
          varName = parent.getName();
        }

        clients.push({
          id: `emitter:client:${file}:${line}:${start}:${varName}`,
          file,
          line,
          variableName: varName,
          dbType: 'emitter',
          initExpression: node.getText(),
          exportedAs: null,
          configSource: 'literal'
        });
      }
    }

    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      const line = node.getStartLineNumber();
      const start = node.getStart();

      // 1. Detect Event Emitters (.on, .once, .emit, .addListener, .removeListener)
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (['on', 'once', 'emit', 'addListener', 'removeListener'].includes(propName)) {
          const args = node.getArguments();
          let eventName: string | null = null;
          let resolved = false;

          if (args.length > 0) {
            eventName = extractLiteralValue(args[0]);
            if (eventName) resolved = true;
          }

          const propStart = expr.getNameNode().getStart();

          queries.push({
            id: `emitter:call:${file}:${line}:${propStart}:${propName}`,
            file,
            line,
            enclosingFunction: getEnclosingFunction(node),
            enclosingClass: getEnclosingClass(node),
            dbType: 'emitter',
            operation: propName,
            target: eventName || 'dynamic-event',
            clientRefId: null,
            resolved,
            unresolvedReason: resolved ? undefined : 'dynamic-event-name'
          });
          return;
        }

        // 2. Detect Promise methods (.then, .catch, .finally)
        if (['then', 'catch', 'finally'].includes(propName)) {
          const propStart = expr.getNameNode().getStart();
          queries.push({
            id: `promise:call:${file}:${line}:${propStart}:${propName}`,
            file,
            line,
            enclosingFunction: getEnclosingFunction(node),
            enclosingClass: getEnclosingClass(node),
            dbType: 'promise',
            operation: propName,
            target: 'PromiseChain',
            clientRefId: null,
            resolved: true
          });
          return;
        }
      }

      // 3. Detect Promise static calls (Promise.all, Promise.race, etc.)
      const exprText = expr.getText();
      if (['Promise.all', 'Promise.allSettled', 'Promise.any', 'Promise.race'].includes(exprText)) {
        const op = exprText.split('.')[1];
        queries.push({
          id: `promise:static:${file}:${line}:${start}:${op}`,
          file,
          line,
          enclosingFunction: getEnclosingFunction(node),
          enclosingClass: getEnclosingClass(node),
          dbType: 'promise',
          operation: op,
          target: 'PromiseStatic',
          clientRefId: null,
          resolved: true
        });
      }
    }
  });

  return { clients, queries };
}
