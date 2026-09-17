export type DbType = 'mongodb' | 'firebase' | 'supabase' | 'mysql' | 'emitter' | 'promise' | 'unknown';

export interface DbClientDeclaration {
  id: string;
  file: string;
  line: number;
  variableName: string;
  dbType: DbType;
  initExpression: string;
  exportedAs: string | null;
  configSource: 'env' | 'literal' | 'unknown';
  metadata?: Record<string, unknown>;
}

export interface DbQueryCall {
  id: string;
  file: string;
  line: number;
  enclosingFunction: string | null;
  enclosingClass: string | null;
  dbType: DbType;
  operation: string;
  target: string | null;
  clientRefId: string | null;
  resolved: boolean;
  unresolvedReason?: string;
}

export interface CallGraphEdge {
  callerId: string;
  calleeId: string;
  file: string;
  line: number;
}

export interface FunctionNode {
  id: string;
  name: string;
  file: string;
  line: number;
  endLine: number;
  className: string | null;
  touchesDb: DbType[];
  transitiveTouchesDb: DbType[];
}

export interface ReferenceNode {
  id: string;
  declarationId: string;
  file: string;
  line: number;
  refType: 'import' | 'call' | 'read' | 'write';
}

export interface DeclarationLookup {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'method';
  file: string;
  startLine: number;
  endLine: number;
  className: string | null;
  linkedQueries: DbQueryCall[];
}

export interface FileHashEntry {
  file: string;
  contentHash: string;
  lastScanned: string;
}

export interface DiscussionThread {
  id: string;
  targetType: 'file' | 'function' | 'class' | 'query' | 'project';
  targetId: string;
  title: string;
  createdAt: string;
  createdBy: 'user' | 'ai' | string;
}

export interface DiscussionEntry {
  id: string;
  threadId: string;
  author: 'user' | 'ai';
  body: string;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  targetType: 'file' | 'function' | 'class' | 'query' | 'project';
  targetId: string;
  summary: string;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
  supersedes?: string | null;
}

export interface PlanRecord {
  id: string;
  projectId: string;
  title: string;
  goal: string;
  status: 'draft' | 'in_progress' | 'completed' | 'blocked';
  createdBy: string;
  createdAt: string;
  sourceThreadId?: string | null;
  relatedDecisionId?: string | null;
}

export interface PlanProgressLogEntry {
  id: string;
  planId: string;
  stepIndex: number;
  description: string;
  status: 'done' | 'failed' | 'in_progress';
  evidence?: string | null;
  timestamp: string;
}

export interface ProposalRecord {
  id: string;
  type: 'discussion' | 'decision' | 'plan' | 'issue' | 'code';
  targetType: 'file' | 'function' | 'class' | 'query' | 'project';
  targetId: string;
  title: string;
  payload: string; // JSON string containing proposed content / code diff
  proposedBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

export interface IndexResult {
  clients: DbClientDeclaration[];
  queries: DbQueryCall[];
  functions: FunctionNode[];
  edges: CallGraphEdge[];
  references: ReferenceNode[];
  fileHashes: FileHashEntry[];
  unresolved: DbQueryCall[];
  threads?: DiscussionThread[];
  entries?: DiscussionEntry[];
  decisions?: DecisionRecord[];
  plans?: PlanRecord[];
  planLogs?: PlanProgressLogEntry[];
  proposals?: ProposalRecord[];
}

export type StorageMode = 'local' | 'drive' | 'git';

export interface PlatformConfig {
  version: string;
  projectId: string;
  projectName: string;
  storageMode: StorageMode;
  driveFolderName?: string;
  activeModules: string[];
}

export interface AuthCredentials {
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  user_email?: string;
  user_id?: string;
  web_token?: string;
  paired_device_id?: string;
  paired_at?: string;
}

export interface SyncedProjectInfo {
  id: string;
  name: string;
  folderId: string;
  fileId?: string;
  lastModified?: string;
}

// --------------------------------------------------------------------------
// Universal Graphify Context System Types
// --------------------------------------------------------------------------

export type GraphNodeType =
  | 'file'          // Source code / config file
  | 'function'      // Function, method, class method
  | 'route'         // Express / Next.js / Fastify API route
  | 'table'         // Database table, collection, schema
  | 'prd_spec'      // Product spec / PRD value prop (product.md)
  | 'doc_section'   // Architecture & tech decision (architecture.md)
  | 'plan_item'     // Roadmap item & milestone (plans.md)
  | 'progress_item' // Shipped, in-progress, or broken feature (progress.md)
  | 'issue'         // Open bug, gap, or tech debt (issues.md)
  | 'audit_finding' // QA schema violation, N+1 query flag, safety risk
  | 'test_suite'    // Vitest / Jest test file and test cases
  | 'ai_trace';     // AI Assistant edit history, model used, prompt log

export type GraphEdgeType =
  | 'IMPORTS'            // File imports module/file
  | 'CALLS'              // Function calls function
  | 'TOUCHES_DB'          // Function executes query on table/collection
  | 'HANDLES_ROUTE'       // Route is handled by function/controller
  | 'IMPLEMENTS_SPEC'    // Code implements PRD spec
  | 'DOCUMENTED_IN'      // Symbol documented in docs
  | 'HAS_ISSUE'          // Symbol / file has open issue
  | 'PLANNED_BY'         // File/feature scheduled in plan
  | 'STATUS_OF'          // Progress status tracking a plan/feature
  | 'AUDITED_BY'         // Symbol flagged by QA audit
  | 'VERIFIED_BY'        // Symbol tested by test suite
  | 'MODIFIED_BY_AI'     // Node modified by AI model
  | 'AUTHORED_BY_USER';  // Node authored by human user

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  file?: string;
  line?: number;
  endLine?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  metadata?: Record<string, any>;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<GraphNodeType, number>;
  edgesByType: Record<GraphEdgeType, number>;
  dbTouchCount: number;
  openIssuesCount: number;
  auditFindingsCount: number;
  aiTracesCount: number;
  healthScore: number;
}

export interface ImpactAnalysis {
  targetNodeId: string;
  targetLabel: string;
  targetType: GraphNodeType;
  directCallers: GraphNode[];
  transitiveCallers: GraphNode[];
  affectedRoutes: GraphNode[];
  affectedTables: GraphNode[];
  affectedTests: GraphNode[];
  linkedIssues: GraphNode[];
  blastRadiusScore: number; // 0 - 100
}

export interface ProjectContextBundle {
  projectId: string;
  timestamp: string;
  prd: {
    overview: string;
    valueProps: string[];
    targetUsers: string[];
    scopeBoundaries: string[];
  };
  architecture: {
    techStack: string[];
    keyDecisions: string[];
    folderStructure: string[];
  };
  plans: {
    nextUp: string[];
    roadmap: string[];
  };
  progress: {
    done: string[];
    inProgress: string[];
    broken: string[];
  };
  issues: {
    openBugs: Array<{ severity: string; description: string }>;
    knownGaps: string[];
  };
  qaHealth: {
    healthScore: number;
    schemaIssuesCount: number;
    astSafetyIssuesCount: number;
    testsPassing: boolean;
  };
  aiLineage: {
    recentAiEditsCount: number;
    activeModels: string[];
  };
}

export interface FileContextReport {
  file: string;
  functions: GraphNode[];
  routes: GraphNode[];
  dbTouches: GraphNode[];
  linkedIssues: GraphNode[];
  linkedPlans: GraphNode[];
  qaFindings: GraphNode[];
  verifiedByTests: GraphNode[];
  aiHistory: Array<{
    timestamp: string;
    model: string;
    provider: string;
    promptPreview?: string;
  }>;
}

