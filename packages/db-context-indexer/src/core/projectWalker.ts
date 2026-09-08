import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { Project, SourceFile, ScriptTarget, ModuleKind } from 'ts-morph';

export interface WalkOptions {
  rootDir: string;
  ignorePatterns?: string[];
}

export function loadProject(options: WalkOptions): { project: Project; sourceFiles: SourceFile[] } {
  const rootDir = path.resolve(options.rootDir);

  const defaultExcludes = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.git/**'
  ];

  let gitignoreExcludes: string[] = [];
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      gitignoreExcludes = gitignoreContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => (line.startsWith('/') ? line.slice(1) : line))
        .map((line) => (line.endsWith('/') ? `**/${line}**` : `**/${line}`));
    } catch {
      // Ignore gitignore read errors
    }
  }

  const ignore = [...defaultExcludes, ...gitignoreExcludes, ...(options.ignorePatterns || [])];

  const files = fg.sync('**/*.{js,jsx,ts,tsx}', {
    cwd: rootDir,
    absolute: true,
    ignore,
    dot: false
  });

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext
    },
    skipAddingFilesFromTsConfig: true
  });

  for (const file of files) {
    project.addSourceFileAtPath(file);
  }

  const sourceFiles = project.getSourceFiles();
  return { project, sourceFiles };
}
