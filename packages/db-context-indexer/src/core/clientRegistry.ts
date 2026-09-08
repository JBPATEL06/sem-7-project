import { SourceFile, Node } from 'ts-morph';
import { DbClientDeclaration } from '../types.js';

export class ClientRegistry {
  private declarations: Map<string, DbClientDeclaration> = new Map();

  public registerClients(clients: DbClientDeclaration[], sourceFiles: SourceFile[]): DbClientDeclaration[] {
    const fileMap = new Map<string, SourceFile>();
    for (const sf of sourceFiles) {
      const relPath = sf.getFilePath().replace(/\\/g, '/');
      fileMap.set(relPath, sf);
    }

    const processedClients: DbClientDeclaration[] = [];

    for (const client of clients) {
      const sf = fileMap.get(client.file);
      let exportedAs: string | null = null;

      if (sf) {
        // Check named exports
        const exportSymbols = sf.getExportSymbols();
        for (const sym of exportSymbols) {
          const name = sym.getName();
          const decls = sym.getDeclarations();
          for (const d of decls) {
            if (d.getText().includes(client.variableName)) {
              exportedAs = name;
              break;
            }
          }
          if (exportedAs) break;
        }

        // Check CJS module.exports
        if (!exportedAs) {
          sf.forEachDescendant((node) => {
            if (Node.isBinaryExpression(node)) {
              const leftText = node.getLeft().getText();
              if (leftText.startsWith('module.exports') || leftText.startsWith('exports.')) {
                const rightText = node.getRight().getText();
                if (rightText.includes(client.variableName)) {
                  exportedAs = leftText;
                }
              }
            }
          });
        }
      }

      const updatedClient: DbClientDeclaration = {
        ...client,
        exportedAs
      };

      this.declarations.set(updatedClient.id, updatedClient);
      processedClients.push(updatedClient);
    }

    return processedClients;
  }

  public get(id: string): DbClientDeclaration | undefined {
    return this.declarations.get(id);
  }

  public getAll(): DbClientDeclaration[] {
    return Array.from(this.declarations.values());
  }
}
