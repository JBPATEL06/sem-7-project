import fs from 'fs';
import path from 'path';
import { GraphNode, GraphEdge, ProjectContextBundle } from '@ai-manager/core';

export interface DocsScanResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  bundle: ProjectContextBundle;
}

/**
 * Scans markdown files in the project /docs folder and transforms them into Graph Nodes and Context Bundles
 */
export function scanDocsFolder(rootDir: string, projectId: string = 'sem-7-project'): DocsScanResult {
  const docsDir = path.join(rootDir, 'docs');
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const bundle: ProjectContextBundle = {
    projectId,
    timestamp: new Date().toISOString(),
    prd: { overview: '', valueProps: [], targetUsers: [], scopeBoundaries: [] },
    architecture: { techStack: [], keyDecisions: [], folderStructure: [] },
    plans: { nextUp: [], roadmap: [] },
    progress: { done: [], inProgress: [], broken: [] },
    issues: { openBugs: [], knownGaps: [] },
    qaHealth: { healthScore: 100, schemaIssuesCount: 0, astSafetyIssuesCount: 0, testsPassing: true },
    aiLineage: { recentAiEditsCount: 0, activeModels: [] }
  };

  if (!fs.existsSync(docsDir)) {
    return { nodes, edges, bundle };
  }

  // 1. Scan product.md (PRD Specs)
  const productFile = path.join(docsDir, 'product.md');
  if (fs.existsSync(productFile)) {
    try {
      const content = fs.readFileSync(productFile, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Overview')) {
          currentSection = 'overview';
        } else if (trimmed.startsWith('## Core Value Prop')) {
          currentSection = 'value_props';
        } else if (trimmed.startsWith('## Target User')) {
          currentSection = 'users';
        } else if (trimmed.startsWith('## Scope Boundaries')) {
          currentSection = 'boundaries';
        } else if (trimmed.startsWith('- ') || (trimmed && !trimmed.startsWith('#'))) {
          const itemText = trimmed.replace(/^-\s*/, '');
          if (currentSection === 'overview' && itemText) {
            bundle.prd.overview += (bundle.prd.overview ? ' ' : '') + itemText;
          } else if (currentSection === 'value_props' && itemText) {
            bundle.prd.valueProps.push(itemText);
            const id = `prd:val:${bundle.prd.valueProps.length}`;
            nodes.push({
              id,
              type: 'prd_spec',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/product.md',
              metadata: { category: 'value_prop', fullText: itemText }
            });
          } else if (currentSection === 'users' && itemText) {
            bundle.prd.targetUsers.push(itemText);
          } else if (currentSection === 'boundaries' && itemText) {
            bundle.prd.scopeBoundaries.push(itemText);
          }
        }
      }
    } catch (e) {
      console.warn('[docsContextScanner] product.md parse warning:', e);
    }
  }

  // 2. Scan architecture.md (Tech Decisions)
  const archFile = path.join(docsDir, 'architecture.md');
  if (fs.existsSync(archFile)) {
    try {
      const content = fs.readFileSync(archFile, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Tech Stack')) {
          currentSection = 'stack';
        } else if (trimmed.startsWith('## Key Decisions')) {
          currentSection = 'decisions';
        } else if (trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^-\s*/, '');
          if (currentSection === 'stack') {
            bundle.architecture.techStack.push(itemText);
          } else if (currentSection === 'decisions') {
            bundle.architecture.keyDecisions.push(itemText);
            const id = `arch:dec:${bundle.architecture.keyDecisions.length}`;
            nodes.push({
              id,
              type: 'doc_section',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/architecture.md',
              metadata: { category: 'key_decision', fullText: itemText }
            });
          }
        }
      }
    } catch (e) {
      console.warn('[docsContextScanner] architecture.md parse warning:', e);
    }
  }

  // 3. Scan plans.md (Plans & Roadmaps)
  const plansFile = path.join(docsDir, 'plans.md');
  if (fs.existsSync(plansFile)) {
    try {
      const content = fs.readFileSync(plansFile, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Next Up') || trimmed.startsWith('## Active')) {
          currentSection = 'next_up';
        } else if (trimmed.startsWith('## Roadmap') || trimmed.startsWith('## Backlog')) {
          currentSection = 'roadmap';
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('### ')) {
          const itemText = trimmed.replace(/^(###\s*|-\s*)/, '');
          if (currentSection === 'next_up' && itemText) {
            bundle.plans.nextUp.push(itemText);
            const id = `plan:item:${bundle.plans.nextUp.length}`;
            nodes.push({
              id,
              type: 'plan_item',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/plans.md',
              metadata: { category: 'next_up', fullText: itemText }
            });
          } else if (currentSection === 'roadmap' && itemText) {
            bundle.plans.roadmap.push(itemText);
          }
        }
      }
    } catch (e) {
      console.warn('[docsContextScanner] plans.md parse warning:', e);
    }
  }

  // 4. Scan progress.md (Progress & Status Tracking)
  const progressFile = path.join(docsDir, 'progress.md');
  if (fs.existsSync(progressFile)) {
    try {
      const content = fs.readFileSync(progressFile, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Done') || trimmed.startsWith('- **') && trimmed.includes('Completed')) {
          currentSection = 'done';
        } else if (trimmed.startsWith('## In Progress')) {
          currentSection = 'in_progress';
        } else if (trimmed.startsWith('## Broken')) {
          currentSection = 'broken';
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('### ')) {
          const itemText = trimmed.replace(/^(###\s*|-\s*)/, '');
          if (currentSection === 'done' && itemText) {
            bundle.progress.done.push(itemText);
            const id = `progress:done:${bundle.progress.done.length}`;
            nodes.push({
              id,
              type: 'progress_item',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/progress.md',
              metadata: { status: 'done', fullText: itemText }
            });
          } else if (currentSection === 'in_progress' && itemText) {
            bundle.progress.inProgress.push(itemText);
            const id = `progress:wip:${bundle.progress.inProgress.length}`;
            nodes.push({
              id,
              type: 'progress_item',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/progress.md',
              metadata: { status: 'in_progress', fullText: itemText }
            });
          } else if (currentSection === 'broken' && itemText) {
            bundle.progress.broken.push(itemText);
          }
        }
      }
    } catch (e) {
      console.warn('[docsContextScanner] progress.md parse warning:', e);
    }
  }

  // 5. Scan issues.md (Open Bugs & Gaps)
  const issuesFile = path.join(docsDir, 'issues.md');
  if (fs.existsSync(issuesFile)) {
    try {
      const content = fs.readFileSync(issuesFile, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('## Open Bugs')) {
          currentSection = 'bugs';
        } else if (trimmed.startsWith('## Known Gaps')) {
          currentSection = 'gaps';
        } else if (trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^-\s*/, '');
          if (currentSection === 'bugs' && itemText) {
            let severity = 'warning';
            if (itemText.toLowerCase().includes('critical') || itemText.toLowerCase().includes('high')) {
              severity = 'critical';
            } else if (itemText.toLowerCase().includes('minor') || itemText.toLowerCase().includes('low')) {
              severity = 'minor';
            }
            bundle.issues.openBugs.push({ severity, description: itemText });
            const id = `issue:bug:${bundle.issues.openBugs.length}`;
            nodes.push({
              id,
              type: 'issue',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/issues.md',
              metadata: { severity, fullText: itemText }
            });
          } else if (currentSection === 'gaps' && itemText) {
            bundle.issues.knownGaps.push(itemText);
            const id = `issue:gap:${bundle.issues.knownGaps.length}`;
            nodes.push({
              id,
              type: 'issue',
              label: itemText.length > 50 ? itemText.substring(0, 47) + '...' : itemText,
              file: 'docs/issues.md',
              metadata: { severity: 'info', fullText: itemText }
            });
          }
        }
      }
    } catch (e) {
      console.warn('[docsContextScanner] issues.md parse warning:', e);
    }
  }

  return { nodes, edges, bundle };
}
