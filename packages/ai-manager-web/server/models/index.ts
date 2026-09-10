import mongoose from 'mongoose';

// -------------------------------------------------------------
// 1. User Model
// -------------------------------------------------------------
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  lastLogin: { type: String, default: () => new Date().toISOString() }
});

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// -------------------------------------------------------------
// 2. Project Model (User-Owned)
// -------------------------------------------------------------
const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true }, // Ownership reference to User id
  name: { type: String, required: true },
  projectName: { type: String },
  description: { type: String, default: '' },
  rootDir: { type: String, default: '' },
  githubRepo: { type: String, default: null },
  githubBranch: { type: String, default: 'main' },
  status: { type: String, default: 'Not indexed' },
  statusVariant: { type: String, default: 'secondary' },
  filesCount: { type: Number, default: null },
  files: { type: String, default: '—' },
  dbSize: { type: String, default: '—' },
  lastModified: { type: String, default: () => new Date().toISOString() },
  lastSynced: { type: String, default: 'Never synced' },
  metrics: { type: String, default: 'Not indexed' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const ProjectModel = mongoose.models.Project || mongoose.model('Project', projectSchema);

// -------------------------------------------------------------
// 3. Module Model (User-Owned / Project Scoped)
// -------------------------------------------------------------
const moduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  schemaCount: { type: Number, default: 0 },
  flowCount: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const ModuleModel = mongoose.models.Module || mongoose.model('Module', moduleSchema);

// -------------------------------------------------------------
// 4. Diagram Model (User-Owned Excalidraw Canvas Specs)
// -------------------------------------------------------------
const diagramSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['architecture', 'er_diagram', 'activity_flow', 'scratchpad'], default: 'architecture' },
  elements: { type: mongoose.Schema.Types.Mixed, default: [] },
  appState: { type: mongoose.Schema.Types.Mixed, default: {} },
  files: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const DiagramModel = mongoose.models.Diagram || mongoose.model('Diagram', diagramSchema);

// -------------------------------------------------------------
// 5. BranchFlag Model (User-Owned Git Branch Flags)
// -------------------------------------------------------------
const branchFlagSchema = new mongoose.Schema({
  branch: { type: String, required: true, index: true },
  projectId: { type: String, default: 'acme-api', index: true },
  userId: { type: String, required: true, index: true },
  flag: { type: String, enum: ['green', 'red', 'problem', 'neutral'], default: 'neutral' },
  note: { type: String, default: '' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  updatedBy: { type: String, default: 'user' }
});

export const BranchFlagModel = mongoose.models.BranchFlag || mongoose.model('BranchFlag', branchFlagSchema);

// -------------------------------------------------------------
// 6. ActivityLog Model (User-Owned Activity Stream)
// -------------------------------------------------------------
const activityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, default: 'global' },
  projectName: { type: String, default: 'System' },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  detail: { type: String, default: '' },
  status: { type: String, enum: ['success', 'warning', 'info', 'error'], default: 'info' },
  timestamp: { type: String, default: () => new Date().toISOString() }
});

export const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);

// -------------------------------------------------------------
// 7. Setting Model (System Key-Value Configurations)
// -------------------------------------------------------------
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const SettingModel = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

// -------------------------------------------------------------
// 8. DbConnection Model (User-Owned DB Configurations)
// -------------------------------------------------------------
const dbConnectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // 'mongodb' | 'postgresql' | 'mysql' | 'sqlite'
  uri: { type: String, required: true },
  isConnected: { type: Boolean, default: false },
  tablesCount: { type: Number, default: 0 },
  collectionsCount: { type: Number, default: 0 },
  lastTested: { type: String, default: () => new Date().toISOString() },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

export const DbConnectionModel = mongoose.models.DbConnection || mongoose.model('DbConnection', dbConnectionSchema);

// -------------------------------------------------------------
// 9. Screen Model (User-Owned Layout Specs)
// -------------------------------------------------------------
const screenSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  layout: { type: mongoose.Schema.Types.Mixed, default: {} },
  components: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const ScreenModel = mongoose.models.Screen || mongoose.model('Screen', screenSchema);
