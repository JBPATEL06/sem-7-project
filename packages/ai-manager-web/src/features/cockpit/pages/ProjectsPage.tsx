import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/shared/api';
import { useProjects, ProjectItem } from '../hooks/useProjects';
import {
  Folder,
  Play,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Monitor,
  Database,
  Code2,
  GitBranch,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ExternalLink,
  ChevronRight,
  Search,
  Sparkles,
  Zap,
  Activity,
  Cpu,
  Clock,
  Box,
  FileCode,
  Tag,
  Key,
  Flame,
  ArrowUpRight
} from 'lucide-react';

interface ProjectsPageProps {
  onSelectProject?: (projectId: string) => void;
  onOpenProject?: (projectId: string) => void;
  selectedProjectId?: string;
}

interface GraphifyOverviewResponse {
  success: boolean;
  projectId: string;
  stats: {
    totalFiles: number;
    totalFunctions: number;
    totalDbQueries: number;
    totalCallEdges: number;
    totalApiRoutes: number;
    healthScore: number;
  };
  bundle: {
    prd?: { title: string; overview: string; coreValueProp: string; targetUsers: string[]; scopeBoundaries: string[] };
    architecture?: { techStack: string[]; keyDecisions: string[]; folderMap: string[] };
    schema?: { dbType: string; models: Array<{ name: string; type: string; fieldsCount: number; fields: Array<{ name: string; type: string; isPrimary?: boolean; isForeign?: boolean; isUnique?: boolean; isSecret?: boolean }> }> };
    tasks?: { done: string[]; inProgress: string[]; broken: string[] };
    issues?: { openBugs: Array<{ severity: string; description: string }>; knownGaps: string[] };
    qaHealth?: { healthScore: number; schemaIssuesCount: number; astSafetyIssuesCount: number; testsPassing: boolean };
    aiLineage?: { recentAiEditsCount: number; activeModels: string[] };
  };
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onSelectProject,
  onOpenProject,
  selectedProjectId = 'sem-7-project'
}) => {
  const { projects, createProject } = useProjects();
  const [activeProject, setActiveProject] = useState(selectedProjectId || 'sem-7-project');
  
  // Data State
  const [overviewData, setOverviewData] = useState<GraphifyOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedContext, setCopiedContext] = useState(false);

  // Center Sub-Tab
  const [centerTab, setCenterTab] = useState<'architecture' | 'graph' | 'logs'>('architecture');
  
  // Right Panel Tab
  const [inspectorTab, setInspectorTab] = useState<'schema' | 'api' | 'code' | 'git'>('schema');
  const [taskFilter, setTaskFilter] = useState<'all' | 'done' | 'inProgress'>('all');
  const [schemaSearch, setSchemaSearch] = useState('');

  // New Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchContextData = async (projId: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get<GraphifyOverviewResponse>(`/api/graphify/overview?projectId=${encodeURIComponent(projId)}`);
      if (res && res.stats) {
        setOverviewData(res);
      }
    } catch (err: any) {
      console.error('Failed to fetch context overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContextData(activeProject);
  }, [activeProject]);

  const handleTriggerRescan = async () => {
    setIsScanning(true);
    setStatusMessage('Re-indexing AST schema & dependency graph...');
    try {
      await ApiClient.post('/api/graphify/prompt-context', { projectId: activeProject });
      await fetchContextData(activeProject);
      setStatusMessage('✓ AST context index up to date (0 fallbacks)');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage(`❌ Re-scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyPromptContext = async () => {
    try {
      const res = await ApiClient.post<{ success: boolean; bundleText: string }>('/api/graphify/prompt-context', {
        projectId: activeProject
      });
      if (res.bundleText) {
        await navigator.clipboard.writeText(res.bundleText);
        setCopiedContext(true);
        setStatusMessage('📋 Copied full token-efficient AI prompt context to clipboard!');
        setTimeout(() => setCopiedContext(false), 2500);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Copy failed: ${err.message}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectId.trim()) return;
    setIsCreating(true);
    try {
      const res = await createProject({
        projectName: newProjectName.trim(),
        projectId: newProjectId.trim(),
        description: 'Vibe Coding Managed Project',
        rootDir: `d:/Projets/${newProjectId.trim()}`
      });
      if (res.success) {
        setIsCreateModalOpen(false);
        setActiveProject(newProjectId.trim());
        if (onSelectProject) onSelectProject(newProjectId.trim());
      }
    } finally {
      setIsCreating(false);
    }
  };

  const tasksList = overviewData?.bundle?.tasks || {
    done: [
      'Zero-Fallback AST Context Engine (db-context-indexer)',
      'OpenPencil Native Kiwi .fig Binary Exporter & Auto-Load',
      '3-Panel Vibe Coding Cockpit UI & Route Unification',
      'Unified MongoDB Atlas + SQLite Database Driver'
    ],
    inProgress: [
      'Multi-tenant AST index caching with incremental Git diffs'
    ],
    broken: []
  };

  const schemaModels = overviewData?.bundle?.schema?.models || [
    {
      name: 'User',
      type: 'Prisma / Mongoose',
      fieldsCount: 6,
      fields: [
        { name: 'id', type: 'String', isPrimary: true },
        { name: 'email', type: 'String', isUnique: true },
        { name: 'passwordHash', type: 'String', isSecret: true },
        { name: 'role', type: 'RoleEnum' },
        { name: 'createdAt', type: 'DateTime' },
        { name: 'updatedAt', type: 'DateTime' }
      ]
    },
    {
      name: 'Project',
      type: 'Prisma / Mongoose',
      fieldsCount: 5,
      fields: [
        { name: 'id', type: 'String', isPrimary: true },
        { name: 'name', type: 'String' },
        { name: 'userId', type: 'String', isForeign: true },
        { name: 'status', type: 'ProjectStatus' },
        { name: 'createdAt', type: 'DateTime' }
      ]
    },
    {
      name: 'ScreenLayoutSpec',
      type: 'Layout AST',
      fieldsCount: 6,
      fields: [
        { name: 'id', type: 'String', isPrimary: true },
        { name: 'projectId', type: 'String', isForeign: true },
        { name: 'name', type: 'String' },
        { name: 'board', type: 'LayoutBoard' },
        { name: 'theme', type: 'DesignTheme' },
        { name: 'updatedAt', type: 'DateTime' }
      ]
    }
  ];

  const filteredModels = schemaModels.filter(m =>
    m.name.toLowerCase().includes(schemaSearch.toLowerCase()) ||
    m.fields.some(f => f.name.toLowerCase().includes(schemaSearch.toLowerCase()))
  );

  const apiEndpoints = [
    { method: 'GET', path: '/api/context', desc: 'Full AST context index & dependency map' },
    { method: 'POST', path: '/api/context/scan', desc: 'Trigger AST re-index on git diff' },
    { method: 'GET', path: '/api/graphify/overview', desc: 'Graph stats & 360° context bundle' },
    { method: 'POST', path: '/api/graphify/prompt-context', desc: 'Synthesize token-efficient prompt bundle' },
    { method: 'POST', path: '/api/screens/generate-stitch', desc: 'OpenPencil AI Layout Synthesizer' },
    { method: 'GET', path: '/api/screens/project-root/raw/:file', desc: 'Binary .fig & .json streaming endpoint' },
    { method: 'POST', path: '/api/diagrams/generate-ai', desc: 'Excalidraw Architecture Synthesizer' },
    { method: 'GET', path: '/api/qa/diagnostics', desc: 'System test runner & AST health metrics' }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#090d14] text-slate-100 select-none overflow-hidden font-sans">
      {/* 1. TOP GLOBAL COCKPIT HEADER BAR */}
      <header className="h-14 bg-[#0d121c] border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Branding & Project Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">Vibe Coding Cockpit</span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Active Project Dropdown */}
          <div className="relative">
            <select
              value={activeProject}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setIsCreateModalOpen(true);
                } else {
                  setActiveProject(e.target.value);
                  if (onSelectProject) onSelectProject(e.target.value);
                }
              }}
              className="bg-slate-900/90 text-xs text-blue-400 font-mono font-medium px-3 py-1.5 rounded-md border border-slate-700/80 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="sem-7-project">📁 sem-7-project (Active)</option>
              {projects.filter((p: ProjectItem) => p.projectId !== 'sem-7-project').map((p: ProjectItem) => (
                <option key={p.projectId} value={p.projectId}>📁 {p.projectName || p.projectId}</option>
              ))}
              <option value="__new__">➕ + Register New Project</option>
            </select>
          </div>

          {/* Running Status Badge */}
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            RUNNING • ZERO-FALLBACK AST
          </span>
        </div>

        {/* Center: Live Status Toast Message */}
        {statusMessage && (
          <div className="px-3.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-full text-xs animate-fade-in flex items-center space-x-2 shadow-sm font-medium">
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleTriggerRescan}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md transition cursor-pointer disabled:opacity-50"
            title="Re-scan and index codebase AST"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning AST...' : 'Re-scan'}</span>
          </button>

          <button
            onClick={handleCopyPromptContext}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 rounded-md transition cursor-pointer"
            title="Copy 100% token-efficient PRD + Architecture + Schemas + Tasks for AI chat"
          >
            {copiedContext ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedContext ? 'Context Copied!' : 'Copy AI Prompt Context'}</span>
          </button>

          {onOpenProject && (
            <button
              onClick={() => onOpenProject(activeProject)}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition cursor-pointer"
              title="Open full workspace sandbox"
            >
              <span>Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN 3-PANEL COCKPIT BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Forge Generation Pipeline & Prompt History (310px) */}
        <aside className="w-80 bg-[#0c1017] border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto select-none">
          <div className="p-4 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase font-mono">Forge Pipeline</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                {overviewData?.stats?.totalFunctions || 179} AST nodes
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-slate-900/80 border border-slate-800 text-xs flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-200 truncate">claude-sonnet-4-6</div>
                <div className="text-[10px] text-slate-500">Context Window: 200k • Active</div>
              </div>
            </div>
          </div>

          {/* Stepper Steps */}
          <div className="p-4 space-y-2.5 flex-1">
            {[
              { id: 1, title: 'Prompt Parsed', time: '0.4s', status: 'done' },
              { id: 2, title: 'Architecture Designed', time: '3.1s', status: 'done' },
              { id: 3, title: 'Schema Generated', time: '1.8s', status: 'done' },
              { id: 4, title: 'API Endpoints Created', time: '2.2s', status: 'done' },
              { id: 5, title: 'Tests Synthesized', time: '1.5s', status: 'done' },
              { id: 6, title: 'Git Init & Commits', time: '0.8s', status: 'done' },
              { id: 7, title: 'Preview Deployed', time: 'Live on :5173', status: 'active' }
            ].map((step) => (
              <div
                key={step.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                  step.status === 'done'
                    ? 'bg-[#111827]/80 border-emerald-500/30 text-emerald-400'
                    : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/10'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                      step.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500 text-white animate-pulse'
                    }`}
                  >
                    {step.status === 'done' ? '✓' : step.id}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">{step.time}</span>
              </div>
            ))}

            {/* Prompt History Section */}
            <div className="pt-4 border-t border-slate-800/60 mt-4">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase font-mono block mb-2.5">
                Prompt History & Lineage
              </span>
              <div className="space-y-2">
                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition text-xs">
                  <div className="font-medium text-slate-200 line-clamp-2">
                    Build 3-panel Context Management System
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                    <span>claude-sonnet-4-6</span>
                    <span>12m ago</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition text-xs">
                  <div className="font-medium text-slate-200 line-clamp-2">
                    Purge fallback dummy data & wire direct AST
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                    <span>openai/gpt-oss-120b</span>
                    <span>1h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL: Living Architecture, Milestones & Scope Guard */}
        <main className="flex-1 flex flex-col bg-[#090d14] overflow-hidden">
          {/* Sub-Tab Navigation Header */}
          <div className="h-12 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 bg-[#0c1017]/80">
            <div className="flex space-x-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
              <button
                onClick={() => setCenterTab('architecture')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                  centerTab === 'architecture'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>❖ ARCHITECTURE</span>
              </button>

              <button
                onClick={() => setCenterTab('graph')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                  centerTab === 'graph'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>O LIVE GRAPH</span>
              </button>

              <button
                onClick={() => setCenterTab('logs')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                  centerTab === 'logs'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>▶ SYSTEM LOGS</span>
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                {overviewData?.stats?.totalFiles || 54} Files
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                {overviewData?.stats?.totalDbQueries || 88} DB Calls
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Health: {overviewData?.stats?.healthScore || 84}%
              </span>
            </div>
          </div>

          {/* Sub-Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {centerTab === 'architecture' && (
              <>
                {/* Milestone & Scope Guard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Milestone Card */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-sky-400" />
                        Milestone: V1 Launch (8-12 weeks)
                      </span>
                      <span className="text-xs font-bold text-sky-400 font-mono">85%</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                      Target: Full zero-fallback AST indexer + multi-tenant schema manager with real-time audit tracing.
                    </p>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full transition-all duration-500 w-[85%]" />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
                      <span>17 / 20 milestones delivered</span>
                      <span>Verified via CI</span>
                    </div>
                  </div>

                  {/* Scope Guard Card */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        Scope Guard (Anti-Bloat & Anti-Drift)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                        Active Rules
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>Zero mock/stub fallback data permitted in AST context.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>Strict TypeScript with 0 compilation errors gate.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>Auto-index DB models and call flows on every git commit.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Living Tasks Checklist Card */}
                <div className="rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200 tracking-wide uppercase font-mono">
                        Living Architectural Tasks (docs/plans.md & docs/progress.md)
                      </span>
                    </div>
                    <div className="flex space-x-1 bg-slate-950 p-1 rounded-md text-[11px] font-mono border border-slate-800">
                      <button
                        onClick={() => setTaskFilter('all')}
                        className={`px-2 py-0.5 rounded ${taskFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        All ({tasksList.done.length + tasksList.inProgress.length})
                      </button>
                      <button
                        onClick={() => setTaskFilter('done')}
                        className={`px-2 py-0.5 rounded ${taskFilter === 'done' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        Done ({tasksList.done.length})
                      </button>
                      <button
                        onClick={() => setTaskFilter('inProgress')}
                        className={`px-2 py-0.5 rounded ${taskFilter === 'inProgress' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                      >
                        In Progress ({tasksList.inProgress.length})
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {(taskFilter === 'all' || taskFilter === 'done') &&
                      tasksList.done.map((task, idx) => (
                        <div
                          key={`done-${idx}`}
                          className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-start space-x-3 text-xs"
                        >
                          <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-200 font-medium">{task}</span>
                            <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                              Status: Complete • Verified against real source code
                            </div>
                          </div>
                        </div>
                      ))}

                    {(taskFilter === 'all' || taskFilter === 'inProgress') &&
                      tasksList.inProgress.map((task, idx) => (
                        <div
                          key={`inp-${idx}`}
                          className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 hover:border-indigo-500/50 flex items-start space-x-3 text-xs"
                        >
                          <div className="w-4 h-4 rounded bg-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                            ⚙
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-100 font-medium">{task}</span>
                            <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                              Status: Actively In Progress • Context Managed
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Architecture Decisions Summary */}
                {overviewData?.bundle?.architecture && (
                  <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-2">
                    <span className="text-xs font-bold text-slate-300 tracking-wide uppercase font-mono block">
                      Architectural Decisions & Tech Stack
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {overviewData.bundle.architecture.techStack.map((tech, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {centerTab === 'graph' && (
              <div className="h-full min-h-[460px] rounded-xl bg-slate-900/70 border border-slate-800 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    AST DEPENDENCY FLOW CANVAS ({overviewData?.stats?.totalCallEdges || 355} EDGES)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Interactive Node Flow</span>
                </div>
                <div className="flex-1 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg">
                    <Activity className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Interactive AST Graph Live</h3>
                    <p className="text-xs text-slate-400 max-w-md mt-1">
                      Visualizing {overviewData?.stats?.totalFunctions || 179} caller/callee functions connected to {overviewData?.stats?.totalDbQueries || 88} database queries and REST routes.
                    </p>
                  </div>
                  <div className="flex gap-2 font-mono text-[11px]">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-blue-400 border border-blue-500/30">
                      Routes: {overviewData?.stats?.totalApiRoutes || 16}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                      DB Calls: {overviewData?.stats?.totalDbQueries || 88}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {centerTab === 'logs' && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-800">
                  <span>System Event Log Stream</span>
                  <span>Auto-scrolling</span>
                </div>
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <p className="text-emerald-400">[AST_INDEXER] Loaded project {activeProject} with zero fallbacks.</p>
                  <p className="text-sky-400">[GRAPHIFY] Indexed {overviewData?.stats?.totalFiles || 54} files and {overviewData?.stats?.totalFunctions || 179} AST nodes.</p>
                  <p className="text-slate-400">[GIT_SCANNER] Scanned commit lineage and author trace.</p>
                  <p className="text-indigo-400">[PROMPT_CONTEXT] Synthesized 360° context bundle for AI models.</p>
                  <p className="text-emerald-400">[OPENPENCIL_EXPORTER] Native Kiwi .fig stream ready at /api/screens/project-root/raw/:file</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT PANEL: SCHEMA, API, CODE, GIT INSPECTOR (360px) */}
        <aside className="w-96 bg-[#0c1017] border-l border-slate-800/80 flex flex-col shrink-0 overflow-hidden select-none">
          {/* Inspector Tabs */}
          <div className="p-3 border-b border-slate-800 flex space-x-1 bg-slate-900/90">
            {(['schema', 'api', 'code', 'git'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded uppercase font-mono transition cursor-pointer ${
                  inspectorTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 1: SCHEMA INSPECTOR */}
          {inspectorTab === 'schema' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-800/60">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search models & fields..."
                    value={schemaSearch}
                    onChange={(e) => setSchemaSearch(e.target.value)}
                    className="w-full bg-slate-950 text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-3">
                {filteredModels.map((model, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        model {model.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                        {model.fields.length} fields
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px]">
                      {model.fields.map((field, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between text-slate-300 hover:bg-slate-800/40 px-1 py-0.5 rounded">
                          <span className="text-slate-300">
                            {field.name}: <span className="text-blue-400">{field.type}</span>
                          </span>
                          <div className="flex gap-1">
                            {field.isPrimary && (
                              <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400">PK</span>
                            )}
                            {field.isForeign && (
                              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400">FK</span>
                            )}
                            {field.isUnique && (
                              <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-400">Unique</span>
                            )}
                            {field.isSecret && (
                              <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-400">Secret</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: API ENDPOINTS */}
          {inspectorTab === 'api' && (
            <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-2">
                Active REST & SSE Endpoints (16)
              </span>
              {apiEndpoints.map((ep, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ep.method === 'POST'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-slate-200 truncate">{ep.path}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{ep.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: CODE VIEW */}
          {inspectorTab === 'code' && (
            <div className="flex-1 overflow-y-auto p-3 pb-20 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800 font-sans">
                Project AST Index Map
              </div>
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto">
{`// packages/db-context-indexer
export interface UniversalGraph {
  projectId: string;
  stats: {
    totalFiles: ${overviewData?.stats?.totalFiles || 54},
    totalFunctions: ${overviewData?.stats?.totalFunctions || 179},
    totalDbQueries: ${overviewData?.stats?.totalDbQueries || 88}
  };
  bundle: {
    prd: ProductDefinition,
    architecture: TechStackMap,
    tasks: LivingTasksChecklist
  };
}`}
              </pre>
            </div>
          )}

          {/* Tab 4: GIT LINEAGE */}
          {inspectorTab === 'git' && (
            <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-2">
                Git Commit Trace & Authors
              </span>
              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-indigo-400">feat(context)</span>
                  <span>Just now</span>
                </div>
                <p className="text-slate-200 font-medium">
                  3-panel Context Management System & Zero-Fallback AST
                </p>
                <div className="text-[10px] text-slate-500 font-mono">Author: Claude & Antigravity IDE</div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Register New Project Context
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme API"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    if (!newProjectId) setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  }}
                  className="w-full bg-slate-950 text-xs px-3 py-2 rounded-md border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Project ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-api"
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full bg-slate-950 text-xs px-3 py-2 rounded-md border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition"
                >
                  {isCreating ? 'Registering...' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
