import { Node, SourceFile, CallExpression } from 'ts-morph';
import path from 'path';

export function getRelativeFilePath(sourceFile: SourceFile): string {
  const filePath = sourceFile.getFilePath();
  // Normalize windows backslashes
  return filePath.replace(/\\/g, '/');
}

export function getEnclosingFunction(node: Node): string | null {
  let curr: Node | undefined = node.getParent();
  while (curr) {
    if (Node.isFunctionDeclaration(curr) || Node.isFunctionExpression(curr) || Node.isMethodDeclaration(curr)) {
      const name = curr.getName?.();
      return name || '<anonymous>';
    }
    if (Node.isArrowFunction(curr)) {
      const parent = curr.getParent();
      if (Node.isVariableDeclaration(parent)) {
        return parent.getName();
      }
      if (Node.isPropertyAssignment(parent)) {
        return parent.getName();
      }
      return '<anonymous>';
    }
    curr = curr.getParent();
  }
  return null;
}

export function getEnclosingClass(node: Node): string | null {
  const classDecl = node.getAncestors().find((anc) => Node.isClassDeclaration(anc));
  if (classDecl && Node.isClassDeclaration(classDecl)) {
    return classDecl.getName() || null;
  }
  return null;
}

export function extractLiteralValue(node: Node | undefined): string | null {
  if (!node) return null;
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralValue();
  }
  return null;
}

export function determineConfigSource(node: Node): 'env' | 'literal' | 'unknown' {
  const text = node.getText();
  if (text.includes('process.env') || text.includes('import.meta.env')) {
    return 'env';
  }
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return 'literal';
  }
  return 'unknown';
}
