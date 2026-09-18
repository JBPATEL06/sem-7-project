import { describe, it, expect } from 'vitest';
import { runDiagnostics } from '../server/qa/qaDiagnosticsService.js';
import { listTestSuites, runTestSuites } from '../server/qa/qaTestRunnerService.js';
import { runAstSafetyScan } from '../server/qa/qaAstSafetyService.js';

describe('QA & Diagnostics System', () => {
  it('runs schema diagnostics and returns health score & issues', async () => {
    const result = await runDiagnostics('acme-api');
    expect(result).toBeDefined();
    expect(result.projectId).toBe('acme-api');
    expect(typeof result.summary.healthScore).toBe('number');
    expect(result.summary.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.healthScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.tables)).toBe(true);
    expect(result.systemHealth).toBeDefined();
  });

  it('lists available test suites across monorepo packages', async () => {
    const suites = await listTestSuites();
    expect(Array.isArray(suites)).toBe(true);
    expect(suites.length).toBeGreaterThan(0);
    const first = suites[0];
    expect(first.name).toBeDefined();
    expect(first.package).toBeDefined();
    expect(first.total).toBeGreaterThan(0);
  });

  it('executes test runner and parses summary pass rate and duration', async () => {
    const report = await runTestSuites('packages/ai-manager-web/tests/auth.test.ts');
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.summary.totalSuites).toBeGreaterThanOrEqual(1);
    expect(report.summary.totalTests).toBeGreaterThanOrEqual(1);
    expect(report.summary.passRate).toContain('%');
    expect(Array.isArray(report.suites)).toBe(true);
  });

  it('runs AST query safety analysis across codebase', async () => {
    const astReport = await runAstSafetyScan('acme-api');
    expect(astReport).toBeDefined();
    expect(astReport.projectId).toBe('acme-api');
    expect(typeof astReport.safetyScore).toBe('number');
    expect(astReport.safetyScore).toBeGreaterThan(0);
    expect(astReport.scannedFilesCount).toBeGreaterThan(0);
    expect(Array.isArray(astReport.findings)).toBe(true);
  });
});
