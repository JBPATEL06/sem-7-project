import { SourceFile, Node } from 'ts-morph';
import { DbQueryCall, FunctionNode, CallGraphEdge } from '@ai-manager/core';

export function buildCallGraph(
  sourceFiles: SourceFile[],
  queries: DbQueryCall[]
): { functions: FunctionNode[]; edges: CallGraphEdge[] } {
  const functionsMap = new Map<string, FunctionNode>();
  const funcNodeMapByNode = new Map<Node, FunctionNode>();
  const edges: CallGraphEdge[] = [];

  // 1. Collect Function Nodes
  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      let isFunc = false;
      let funcName = '<anonymous>';
      let className: string | null = null;

      if (Node.isFunctionDeclaration(node)) {
        isFunc = true;
        funcName = node.getName() || '<anonymous>';
      } else if (Node.isMethodDeclaration(node)) {
        isFunc = true;
        funcName = node.getName();
        const parentClass = node.getParent();
        if (Node.isClassDeclaration(parentClass)) {
          className = parentClass.getName() || null;
        }
      } else if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
        const parent = node.getParent();
        if (Node.isVariableDeclaration(parent)) {
          isFunc = true;
          funcName = parent.getName();
        } else if (Node.isPropertyAssignment(parent)) {
          isFunc = true;
          funcName = parent.getName();
        }
      }

      if (isFunc) {
        const line = node.getStartLineNumber();
        const endLine = node.getEndLineNumber();
        const start = node.getStart();
        const id = `${file}:${line}:${start}:${funcName}`;

        const funcNode: FunctionNode = {
          id,
          name: funcName,
          file,
          line,
          endLine,
          className,
          touchesDb: [],
          transitiveTouchesDb: []
        };

        functionsMap.set(id, funcNode);
        funcNodeMapByNode.set(node, funcNode);
      }
    });
  }

  // 2. Map Direct DB Touches to Functions
  for (const query of queries) {
    if (query.enclosingFunction) {
      for (const funcNode of functionsMap.values()) {
        if (funcNode.file === query.file && funcNode.name === query.enclosingFunction) {
          if (!funcNode.touchesDb.includes(query.dbType)) {
            funcNode.touchesDb.push(query.dbType);
          }
        }
      }
    }
  }

  // 3. Build Call Graph Edges (Caller -> Callee)
  const calleeToCallers = new Map<string, Set<string>>();

  for (const [node, callerFuncNode] of funcNodeMapByNode.entries()) {
    node.forEachDescendant((child) => {
      if (Node.isCallExpression(child)) {
        const expr = child.getExpression();
        const calleeName = expr.getText();

        for (const targetFunc of functionsMap.values()) {
          if (targetFunc.name === calleeName || calleeName.endsWith(`.${targetFunc.name}`)) {
            const edge: CallGraphEdge = {
              callerId: callerFuncNode.id,
              calleeId: targetFunc.id,
              file: callerFuncNode.file,
              line: child.getStartLineNumber()
            };
            edges.push(edge);

            if (!calleeToCallers.has(targetFunc.id)) {
              calleeToCallers.set(targetFunc.id, new Set());
            }
            calleeToCallers.get(targetFunc.id)!.add(callerFuncNode.id);
          }
        }
      }
    });
  }

  // 4. Transitive DB Touch Propagation via BFS
  for (const funcNode of functionsMap.values()) {
    if (funcNode.touchesDb.length > 0) {
      const queue: Array<{ id: string; depth: number }> = [{ id: funcNode.id, depth: 0 }];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const { id: currId, depth } = queue.shift()!;
        if (visited.has(currId)) continue;
        visited.add(currId);

        if (depth > 10) {
          console.warn(`[dbci] Warning: Call graph transitive propagation depth cap (10) reached for function ${currId}`);
          continue;
        }

        const currNode = functionsMap.get(currId);
        if (currNode) {
          for (const dbType of funcNode.touchesDb) {
            if (!currNode.transitiveTouchesDb.includes(dbType)) {
              currNode.transitiveTouchesDb.push(dbType);
            }
          }
        }

        const callers = calleeToCallers.get(currId);
        if (callers) {
          for (const callerId of callers) {
            if (!visited.has(callerId)) {
              queue.push({ id: callerId, depth: depth + 1 });
            }
          }
        }
      }
    }
  }

  return {
    functions: Array.from(functionsMap.values()),
    edges
  };
}
