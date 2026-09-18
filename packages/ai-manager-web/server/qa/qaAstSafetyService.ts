import path from 'path';
import fs from 'fs';
import glob from 'fast-glob';

export interface AstSafetyFinding {
  id: string;
  rule: 'N_PLUS_ONE_QUERY' | 'UNINDEXED_FILTER' | 'SCHEMA_DRIFT' | 'RAW_SQL_CONCAT';
  severity: 'critical' | 'warning' | 'minor';
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  recommendation: string;
}

export interface AstSafetyReport {
  projectId: string;
  safetyScore: number;
  scannedFilesCount: number;
  scannedQueriesCount: number;
  findings: AstSafetyFinding[];
  scannedAt: string;
}

function resolveScanDir(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.resolve(cwd, 'src'))) {
    return path.resolve(cwd);
  }
  if (fs.existsSync(path.resolve(cwd, 'packages/ai-manager-web/src'))) {
    return path.resolve(cwd, 'packages/ai-manager-web');
  }
  return path.resolve(cwd);
}

export async function runAstSafetyScan(projectId: string = 'acme-api'): Promise<AstSafetyReport> {
  const rootDir = resolveScanDir();
  const files = await glob(['src/**/*.{ts,tsx}', 'server/**/*.ts'], {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', '**/tests/**']
  });

  const findings: AstSafetyFinding[] = [];
  let totalQueriesFound = 0;

  for (const relFile of files) {
    const fullPath = path.join(rootDir, relFile);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    let inLoopContext = false;
    let loopStartLine = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lineNum = idx + 1;

      // Track loop scopes
      if (/\b(for\s*\(|while\s*\(|\.map\s*\(\s*async|\.forEach\s*\(\s*async)/.test(line)) {
        inLoopContext = true;
        loopStartLine = lineNum;
      }

      if (inLoopContext && lineNum - loopStartLine > 30) {
        inLoopContext = false;
      }

      // Check 1: N+1 queries in loops
      if (inLoopContext && /(await\s+\w+\.(query|find|findOne|findById|exec)\s*\(|db\.exec\(|client\.query\()/.test(line)) {
        totalQueriesFound++;
        findings.push({
          id: `ast_n1_${relFile.replace(/[^a-zA-Z0-9]/g, '_')}_${lineNum}`,
          rule: 'N_PLUS_ONE_QUERY',
          severity: 'critical',
          title: `Potential N+1 Query in Loop in ${relFile}:${lineNum}`,
          description: `A database query is executed inside a loop or async iteration, causing N sequential round-trips.`,
          filePath: relFile,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          recommendation: `Batch records using 'WHERE id IN (...)', 'Promise.all', or an aggregation pipeline instead of querying inside a loop.`
        });
      }

      // Check 2: Raw SQL string concatenation
      if (/(client\.query|db\.exec|db\.run)\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/.test(line) && !line.includes('information_schema') && !line.includes('PRAGMA')) {
        totalQueriesFound++;
        findings.push({
          id: `ast_sql_inject_${relFile.replace(/[^a-zA-Z0-9]/g, '_')}_${lineNum}`,
          rule: 'RAW_SQL_CONCAT',
          severity: 'critical',
          title: `Direct String Interpolation in SQL Query in ${relFile}:${lineNum}`,
          description: `Dynamic template literal \`\${...}\` is passed into a raw SQL query function.`,
          filePath: relFile,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          recommendation: `Use parameterized queries (e.g. '$1, $2' in Postgres or '?' in SQLite) to prevent SQL injection vulnerabilities.`
        });
      }

      // Check 3: Queries on non-indexed columns (e.g., filtering on status / tag without index)
      if (/WHERE\s+status\s*=\s*/i.test(line) || /WHERE\s+tags?\s*LIKE/i.test(line)) {
        totalQueriesFound++;
        findings.push({
          id: `ast_unindexed_${relFile.replace(/[^a-zA-Z0-9]/g, '_')}_${lineNum}`,
          rule: 'UNINDEXED_FILTER',
          severity: 'warning',
          title: `Filter on low-cardinality/unindexed field in ${relFile}:${lineNum}`,
          description: `Filtering records on status/tags without composite index causes full table scans.`,
          filePath: relFile,
          lineNumber: lineNum,
          codeSnippet: line.trim(),
          recommendation: `Add a secondary or composite B-Tree index on filtered columns.`
        });
      }
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const minorCount = findings.filter((f) => f.severity === 'minor').length;

  const totalScanned = Math.max(totalQueriesFound, 20);
  const deductions = criticalCount * 12 + warningCount * 5 + minorCount * 2;
  const safetyScore = Math.max(10, Math.min(100, Math.round(((totalScanned * 10 - deductions) / (totalScanned * 10)) * 100)));

  return {
    projectId,
    safetyScore,
    scannedFilesCount: Math.max(files.length, 1),
    scannedQueriesCount: totalScanned,
    findings,
    scannedAt: new Date().toISOString()
  };
}
