import { SourceFile, Node } from 'ts-morph';
import { ReferenceNode } from '@ai-manager/core';

export function buildReferences(sourceFiles: SourceFile[]): ReferenceNode[] {
  const references: ReferenceNode[] = [];
  const declMap = new Map<string, { id: string; name: string }>();

  // 1. Map Declarations
  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      let declName = '';
      if (Node.isFunctionDeclaration(node) || Node.isClassDeclaration(node)) {
        declName = node.getName() || '';
      } else if (Node.isMethodDeclaration(node)) {
        declName = node.getName();
      } else if (Node.isVariableDeclaration(node)) {
        declName = node.getName();
      }

      if (declName) {
        const declLine = node.getStartLineNumber();
        const declStart = node.getStart();
        const declId = `${file}:${declLine}:${declStart}:${declName}`;
        declMap.set(declName, { id: declId, name: declName });
      }
    });
  }

  // 2. Map Reference Usages Across Files
  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      if (Node.isIdentifier(node)) {
        const text = node.getText();
        const decl = declMap.get(text);

        if (decl) {
          const line = node.getStartLineNumber();
          const start = node.getStart();

          // Don't count declaration site itself as a reference
          if (decl.id.startsWith(`${file}:${line}:${start}:`)) {
            return;
          }

          let refType: 'import' | 'call' | 'read' | 'write' = 'read';
          const parent = node.getParent();

          if (Node.isImportSpecifier(parent) || Node.isImportClause(parent) || Node.isImportEqualsDeclaration(parent)) {
            refType = 'import';
          } else if (Node.isCallExpression(parent) && parent.getExpression() === node) {
            refType = 'call';
          } else if (Node.isBinaryExpression(parent) && parent.getLeft() === node && parent.getOperatorToken().getText().includes('=')) {
            refType = 'write';
          }

          references.push({
            id: `${file}:${line}:${start}:${text}`,
            declarationId: decl.id,
            file,
            line,
            refType
          });
        }
      }
    });
  }

  return references;
}
