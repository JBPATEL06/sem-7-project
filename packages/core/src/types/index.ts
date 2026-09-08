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
