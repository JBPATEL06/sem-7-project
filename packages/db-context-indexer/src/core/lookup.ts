import { SourceFile, Node } from 'ts-morph';
import { DeclarationLookup, DbQueryCall, IndexResult } from '../types.js';

export function findDeclarations(
  targetName: string,
  sourceFiles: SourceFile[],
  indexResult: IndexResult
): { matches: DeclarationLookup[]; warning?: string } {
  const allDeclarations: DeclarationLookup[] = [];

  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      let name = '';
      let kind: 'function' | 'class' | 'variable' | 'method' | null = null;
      let className: string | null = null;

      if (Node.isFunctionDeclaration(node)) {
        name = node.getName() || '';
        kind = 'function';
      } else if (Node.isClassDeclaration(node)) {
        name = node.getName() || '';
        kind = 'class';
      } else if (Node.isMethodDeclaration(node)) {
        name = node.getName();
        kind = 'method';
        const parentClass = node.getParent();
        if (Node.isClassDeclaration(parentClass)) {
          className = parentClass.getName() || null;
        }
      } else if (Node.isVariableDeclaration(node)) {
        name = node.getName();
        kind = 'variable';
      }

      if (kind && name) {
        const startLine = node.getStartLineNumber();
        const endLine = node.getEndLineNumber();

        // Linked queries matching enclosingFunction or enclosingClass
        const linkedQueries = indexResult.queries.filter(
          (q) => q.file === file && (q.enclosingFunction === name || (className && q.enclosingClass === className))
        );

        allDeclarations.push({
          name,
          kind,
          file,
          startLine,
          endLine,
          className,
          linkedQueries
        });
      }
    });
  }

  // 1. Exact case-sensitive match
  const exactMatches = allDeclarations.filter((d) => d.name === targetName);
  if (exactMatches.length > 0) {
    return { matches: exactMatches };
  }

  // 2. Fuzzy case-insensitive match
  const lowerTarget = targetName.toLowerCase();
  const fuzzyMatches = allDeclarations.filter((d) => d.name.toLowerCase().includes(lowerTarget));

  if (fuzzyMatches.length > 0) {
    const candidates = Array.from(new Set(fuzzyMatches.map((m) => m.name)));
    return {
      matches: fuzzyMatches,
      warning: `[dbci] Warning: No exact match for '${targetName}'. Showing fuzzy matches for candidates: ${candidates.join(', ')}`
    };
  }

  return { matches: [] };
}

export function getAllDeclarations(
  sourceFiles: SourceFile[],
  indexResult: IndexResult
): DeclarationLookup[] {
  const allDeclarations: DeclarationLookup[] = [];

  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      let name = '';
      let kind: 'function' | 'class' | 'variable' | 'method' | null = null;
      let className: string | null = null;

      if (Node.isFunctionDeclaration(node)) {
        name = node.getName() || '';
        kind = 'function';
      } else if (Node.isClassDeclaration(node)) {
        name = node.getName() || '';
        kind = 'class';
      } else if (Node.isMethodDeclaration(node)) {
        name = node.getName();
        kind = 'method';
        const parentClass = node.getParent();
        if (Node.isClassDeclaration(parentClass)) {
          className = parentClass.getName() || null;
        }
      } else if (Node.isVariableDeclaration(node)) {
        name = node.getName();
        kind = 'variable';
      }

      if (kind && name) {
        const startLine = node.getStartLineNumber();
        const endLine = node.getEndLineNumber();

        // Linked queries matching enclosingFunction or enclosingClass
        const linkedQueries = indexResult.queries.filter(
          (q) => q.file === file && (q.enclosingFunction === name || (className && q.enclosingClass === className))
        );

        allDeclarations.push({
          name,
          kind,
          file,
          startLine,
          endLine,
          className,
          linkedQueries
        });
      }
    });
  }

  return allDeclarations;
}

export interface PackageUsage {
  name: string;
  count: number;
}

export function detectPackages(sourceFiles: SourceFile[]): PackageUsage[] {
  const usageCountMap = new Map<string, number>();

  for (const sf of sourceFiles) {
    const importedModules = new Set<string>();

    // 1. ES Import Declarations
    for (const imp of sf.getImportDeclarations()) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/') && !moduleSpecifier.startsWith('~')) {
        importedModules.add(moduleSpecifier);
      }
    }

    // 2. require() / import() calls
    sf.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        const exprText = expr.getText();
        if (exprText === 'require' || exprText === 'import') {
          const args = node.getArguments();
          if (args.length > 0) {
            const firstArg = args[0];
            if (Node.isStringLiteral(firstArg) || Node.isNoSubstitutionTemplateLiteral(firstArg)) {
              const moduleSpecifier = firstArg.getLiteralValue();
              if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/') && !moduleSpecifier.startsWith('~')) {
                importedModules.add(moduleSpecifier);
              }
            }
          }
        }
      }
    });

    // Increment counts for all imported modules in this file
    for (const mod of importedModules) {
      usageCountMap.set(mod, (usageCountMap.get(mod) || 0) + 1);
    }
  }

  return Array.from(usageCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

