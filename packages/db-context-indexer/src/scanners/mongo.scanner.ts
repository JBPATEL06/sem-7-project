import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration, DbQueryCall } from '../types.js';
import {
  getRelativeFilePath,
  getEnclosingFunction,
  getEnclosingClass,
  extractLiteralValue,
  determineConfigSource
} from './scannerUtils.js';

const MONGO_OPERATIONS = new Set([
  'find',
  'findOne',
  'findById',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'findOneAndUpdate',
  'findOneAndDelete',
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'aggregate',
  'countDocuments',
  'count',
  'bulkWrite'
]);

const JS_BUILTIN_CLASSES = new Set([
  'Math',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Promise',
  'JSON',
  'Console',
  'Date',
  'Reflect',
  'Rx',
  'Observable'
]);

function isMongooseModelCandidate(callerObj: Node, sourceFile: SourceFile): { candidate: boolean; target: string | null } {
  const filePath = sourceFile.getFilePath().replace(/\\/g, '/');

  // Skip frontend UI components/services unless Mongoose is imported
  const isFrontendFile = filePath.includes('/src/app/') || filePath.includes('/client/') || filePath.includes('/frontend/');
  const fileText = sourceFile.getText();
  const hasMongooseImport =
    sourceFile.getImportDeclarations().some((imp) => imp.getModuleSpecifierValue().includes('mongoose')) ||
    fileText.includes("require('mongoose')") ||
    fileText.includes('require("mongoose")');

  if (isFrontendFile && !hasMongooseImport) {
    return { candidate: false, target: null };
  }

  // 1. Direct collection call: db.collection('users')
  if (Node.isCallExpression(callerObj)) {
    const innerExpr = callerObj.getExpression();
    if (Node.isPropertyAccessExpression(innerExpr) && innerExpr.getName() === 'collection') {
      const args = callerObj.getArguments();
      if (args.length > 0) {
        const target = extractLiteralValue(args[0]);
        return { candidate: true, target: target || 'unknown' };
      }
    }
  }

  // 2. PascalCase Identifier: Mongoose Model convention
  if (Node.isIdentifier(callerObj)) {
    const text = callerObj.getText();
    if (/^[A-Z][a-zA-Z0-9_]*$/.test(text) && !JS_BUILTIN_CLASSES.has(text)) {
      return { candidate: true, target: text };
    }
  }

  // 3. Property access on Mongoose models or db instance (e.g. mongoose.models.User)
  if (Node.isPropertyAccessExpression(callerObj)) {
    const propName = callerObj.getName();
    if (/^[A-Z][a-zA-Z0-9_]*$/.test(propName) && !JS_BUILTIN_CLASSES.has(propName)) {
      return { candidate: true, target: propName };
    }
    const exprText = callerObj.getText();
    if (exprText.includes('collection(') || exprText.startsWith('db.') || exprText.startsWith('mongoose.')) {
      return { candidate: true, target: 'unknown' };
    }
  }

  return { candidate: false, target: null };
}

export function scanMongo(sourceFile: SourceFile): {
  clients: DbClientDeclaration[];
  queries: DbQueryCall[];
} {
  const clients: DbClientDeclaration[] = [];
  const queries: DbQueryCall[] = [];
  const file = getRelativeFilePath(sourceFile);

  // 1. Detect Client Init
  sourceFile.forEachDescendant((node) => {
    if (Node.isNewExpression(node)) {
      const exprText = node.getExpression().getText();
      if (exprText === 'MongoClient') {
        const line = node.getStartLineNumber();
        const start = node.getStart();
        const parent = node.getParent();
        let varName = 'mongoClient';
        if (Node.isVariableDeclaration(parent)) {
          varName = parent.getName();
        }
        const args = node.getArguments();
        const configSource = args.length > 0 ? determineConfigSource(args[0]) : 'unknown';

        clients.push({
          id: `mongodb:client:${file}:${line}:${start}:${varName}`,
          file,
          line,
          variableName: varName,
          dbType: 'mongodb',
          initExpression: node.getText(),
          exportedAs: null,
          configSource
        });
      }
    } else if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      const exprText = expr.getText();
      if (exprText === 'mongoose.connect' || exprText === 'MongoClient.connect') {
        const line = node.getStartLineNumber();
        const start = node.getStart();
        const parent = node.getParent();
        let varName = 'mongooseConnection';
        if (Node.isVariableDeclaration(parent)) {
          varName = parent.getName();
        }
        const args = node.getArguments();
        const configSource = args.length > 0 ? determineConfigSource(args[0]) : 'unknown';

        clients.push({
          id: `mongodb:client:${file}:${line}:${start}:${varName}`,
          file,
          line,
          variableName: varName,
          dbType: 'mongodb',
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
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (MONGO_OPERATIONS.has(propName)) {
          const callerObj = expr.getExpression();
          const { candidate, target } = isMongooseModelCandidate(callerObj, sourceFile);

          if (candidate) {
            const line = node.getStartLineNumber();
            const start = node.getStart();
            const resolved = target !== null && target !== 'unknown';

            queries.push({
              id: `mongodb:query:${file}:${line}:${start}:${propName}`,
              file,
              line,
              enclosingFunction: getEnclosingFunction(node),
              enclosingClass: getEnclosingClass(node),
              dbType: 'mongodb',
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
