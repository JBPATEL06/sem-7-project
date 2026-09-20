import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge
} from '@/shared/ui';
import { useDbManager } from '../hooks/useDbManager';
import { ConnectDbModal } from '../components/ConnectDbModal';
import {
  Lock,
  Search,
  Download,
  Database,
  Play,
  Plus,
  Loader2,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Code2,
  Key,
  Server,
  Zap,
  Trash2,
  Maximize2,
  RefreshCw,
  Share2,
  FolderPlus,
  Sparkles,
  Upload,
  FileCode
} from 'lucide-react';

interface DbManagerPageProps {
  projectId?: string;
}

export const DbManagerPage: React.FC<DbManagerPageProps> = ({ projectId = 'acme-api' }) => {
  const {
    connections,
    activeConnectionId,
    schema,
    activeTable,
    tableRows,
    tableColumns,
    isLoading,
    isQueryRunning,
    queryResult,
    error,
    syncMessage,
    queryHistory,
    switchConnection,
    refetchSchema,
    loadTableData,
    runQuery,
    connectDatabase,
    disconnectDatabase,
    syncErDiagram,
    createTable,
    createCollection,
    downloadResults,
    exportSchema,
    importSchema
  } = useDbManager(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [customQuery, setCustomQuery] = useState<string>('SELECT * FROM sqlite_master;');
  const [mongoOperation, setMongoOperation] = useState<'find' | 'count' | 'stats'>('find');
  const [mongoFilter, setMongoFilter] = useState<string>('{}');
  const [currentPage, setCurrentPage] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const pageSize = 12;

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Export / Import state
  const [isExporting, setIsExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'sql' | 'json'>('sql');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Create Table Form
  const [newTableName, setNewTableName] = useState('');
  const [colsList, setColsList] = useState<Array<{ name: string; type: string; isPk: boolean; notNull: boolean }>>([
    { name: 'id', type: 'INTEGER', isPk: true, notNull: true },
    { name: 'name', type: 'TEXT', isPk: false, notNull: true }
  ]);
  const [createTableError, setCreateTableError] = useState<string | null>(null);

  // Create Collection Form (MongoDB)
  const [newCollectionName, setNewCollectionName] = useState('');
  const [initialDocText, setInitialDocText] = useState('{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "role": "admin"\n}');
  const [createCollectionError, setCreateCollectionError] = useState<string | null>(null);

  const [isSyncingEr, setIsSyncingEr] = useState(false);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const dbType = schema?.dbType || activeConnection?.type || 'sqlite';

  const handleExportSchema = async (format: 'sql' | 'json' = 'sql') => {
    setIsExporting(true);
    try {
      await exportSchema(format);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      setImportError('Please provide SQL script or JSON schema to import.');
      return;
    }
    setImportError(null);
    setIsImporting(true);
    try {
      const res = await importSchema(importText, importFormat);
      if (res.success) {
        setIsImportModalOpen(false);
        setImportText('');
      } else {
        setImportError(res.error || 'Import failed.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Auto-sync default console query text when database engine or active table changes
  React.useEffect(() => {
    if (dbType === 'mongodb') {
      setCustomQuery('{}');
    } else if (dbType === 'redis') {
      setCustomQuery('KEYS *');
    } else if (dbType === 'postgresql' || dbType === 'supabase') {
      if (activeTable) {
        setCustomQuery(`SELECT * FROM "${activeTable}" LIMIT 50;`);
      } else {
        setCustomQuery(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
      }
    } else {
      if (activeTable) {
        setCustomQuery(`SELECT * FROM "${activeTable}" LIMIT 50;`);
      } else {
        setCustomQuery(`SELECT * FROM sqlite_master;`);
      }
    }
  }, [dbType, activeTable, activeConnectionId]);

  const totalCollections = schema?.collections?.length || 0;
  const totalTables = schema?.tables?.length || 0;
  const totalKeys = schema?.keys?.length || 0;

  const isIndexed = totalTables > 0 || totalCollections > 0 || totalKeys > 0;

  const filteredTables = (schema?.tables || []).filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = tableFilter === 'all' || t.name.toLowerCase().includes(tableFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const filteredCollections = (schema?.collections || []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKeys = (schema?.keys || []).filter((k) =>
    k.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTableSchema = (schema?.tables || []).find((t) => t.name === activeTable);
  const activeColSchema = (schema?.collections || []).find((c) => c.name === activeTable);

  const handleRunQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (dbType === 'mongodb') {
      await runQuery(mongoFilter, mongoOperation);
    } else {
      if (!customQuery.trim()) return;
      await runQuery(customQuery);
    }
  };

  const handleAddColumnField = () => {
    setColsList((prev) => [...prev, { name: '', type: 'TEXT', isPk: false, notNull: false }]);
  };

  const handleCreateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      setCreateTableError('Table name is required.');
      return;
    }
    const validCols = colsList.filter((c) => c.name.trim() !== '');
    if (validCols.length === 0) {
      setCreateTableError('At least one column is required.');
      return;
    }

    setCreateTableError(null);
    const res = await createTable(newTableName.trim(), validCols);
    if (res.success) {
      setIsCreateTableOpen(false);
      setNewTableName('');
      setColsList([
        { name: 'id', type: 'INTEGER', isPk: true, notNull: true },
        { name: 'name', type: 'TEXT', isPk: false, notNull: true }
      ]);
    } else {
      setCreateTableError(res.error || 'Failed to create table');
    }
  };

  const handleCreateCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      setCreateCollectionError('Collection name is required.');
      return;
    }

    let parsedDoc: any = null;
    if (initialDocText.trim()) {
      try {
        parsedDoc = JSON.parse(initialDocText);
      } catch (err: any) {
        setCreateCollectionError('Invalid JSON in Initial Document: ' + err.message);
        return;
      }
    }

    setCreateCollectionError(null);
    const res = await createCollection(newCollectionName.trim(), parsedDoc);
    if (res.success) {
      setIsCreateCollectionOpen(false);
      setNewCollectionName('');
    } else {
      setCreateCollectionError(res.error || 'Failed to create collection');
    }
  };

  const handleSyncEr = async () => {
    setIsSyncingEr(true);
    await syncErDiagram();
    setIsSyncingEr(false);
  };

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const paginatedRows = tableRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="p-6 md:p-8 flex-1 overflow-y-auto bg-background">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Top Header Bar & Multi-Database Connection Switcher */}
        <div className="flex justify-between items-start flex-wrap gap-4 bg-card/80 p-4 rounded-xl border border-border backdrop-blur-md shadow-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
                <Database className="size-6 text-primary" />
                Database Control Plane
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {projectId}
              </Badge>
              <Badge
                className={`text-[10px] font-mono uppercase font-bold ${
                  dbType === 'postgresql'
                    ? 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                    : dbType === 'mongodb'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : dbType === 'redis'
                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                }`}
              >
                {dbType}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Live schema explorer, multi-dialect query console & automated ER diagram sync
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Database Connection Switcher */}
            <Select value={activeConnectionId} onValueChange={(val) => switchConnection(val)}>
              <SelectTrigger className="w-56 h-9 text-xs font-medium">
                <SelectValue placeholder="Select Database">
                  {activeConnection ? `${activeConnection.name}` : 'Select Database'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[10px] uppercase text-muted-foreground font-mono">[{c.type}]</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Disconnect custom DB if not default SQLite */}
            {activeConnection && !activeConnection.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Disconnect database '${activeConnection.name}'?`)) {
                    disconnectDatabase(activeConnection.id);
                  }
                }}
                className="h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-border cursor-pointer"
                title="Disconnect Database"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}

            {/* Sync ER Diagram Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncEr}
              disabled={isSyncingEr}
              className="gap-1.5 h-9 text-xs border-border hover:bg-muted cursor-pointer font-medium"
              title="Generate Excalidraw ER diagram file in diagrams/ folder"
            >
              {isSyncingEr ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5 text-primary" />}
              Sync ER Diagram
            </Button>

            {/* Export Schema Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportSchema('sql')}
              disabled={isExporting}
              className="gap-1.5 h-9 text-xs border-border hover:bg-muted cursor-pointer font-medium"
              title="Export Schema as SQL DDL (.sql)"
            >
              {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 text-sky-400" />}
              Export DDL
            </Button>

            {/* Import Schema Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="gap-1.5 h-9 text-xs border-border hover:bg-muted cursor-pointer font-medium"
              title="Import SQL DDL or JSON schema"
            >
              <Upload className="size-3.5 text-amber-400" />
              Import Schema
            </Button>

            {/* Create Collection Modal trigger for MongoDB */}
            {dbType === 'mongodb' ? (
              <Button
                size="sm"
                onClick={() => setIsCreateCollectionOpen(true)}
                className="gap-1.5 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                <FolderPlus className="size-3.5" />
                + Create Collection
              </Button>
            ) : (
              (dbType === 'sqlite' || dbType === 'postgresql') && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateTableOpen(true)}
                  className="gap-1.5 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  + Create Table
                </Button>
              )
            )}

            {/* Connect External DB Modal trigger */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConnectModalOpen(true)}
              className="gap-1.5 h-9 text-xs font-medium border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Server className="size-3.5" />
              + Connect DB
            </Button>
          </div>
        </div>

        {/* Live Notification Feedback */}
        {syncMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-500 flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <span className="font-mono text-[11px] underline">Open in /diagrams</span>
          </div>
        )}

        {/* Interactive Query Runner Console */}
        <Card className="p-4 bg-card border-border shadow-xs">
          <form onSubmit={handleRunQuery} className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Code2 className="size-4 text-primary" />
                {dbType === 'mongodb'
                  ? `MongoDB Query Console (${activeTable ? `Collection: ${activeTable}` : 'Select a collection'})`
                  : dbType === 'redis'
                  ? 'Redis Command Runner'
                  : 'SQL Query Console'}
              </span>
              {queryResult && (
                <span className="text-xs font-mono text-muted-foreground">
                  {queryResult.executionTimeMs} ms • {queryResult.rowCount ?? queryResult.affectedRows ?? 0} rows
                </span>
              )}
            </div>

            {dbType === 'mongodb' ? (
              <div className="flex gap-2">
                <Select value={mongoOperation} onValueChange={(val: any) => setMongoOperation(val)}>
                  <SelectTrigger className="w-32 h-9 text-xs font-mono font-bold">
                    <SelectValue placeholder="find" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="find">find()</SelectItem>
                    <SelectItem value="count">count()</SelectItem>
                    <SelectItem value="stats">stats()</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  value={mongoFilter}
                  onChange={(e) => setMongoFilter(e.target.value)}
                  placeholder='JSON Filter (e.g. { "status": "active" } or {})'
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  disabled={isQueryRunning || !activeTable}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {isQueryRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Execute
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder={
                    dbType === 'redis'
                      ? 'Enter Redis command (e.g. KEYS *, GET user:1, HGETALL stats)'
                      : 'Enter SQL query (e.g. SELECT * FROM users LIMIT 10;)'
                  }
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  disabled={isQueryRunning}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {isQueryRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Run Query
                </Button>
              </div>
            )}

            {queryResult?.error && (
              <div className="p-2.5 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span className="font-mono">{queryResult.error}</span>
              </div>
            )}
          </form>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 border border-border border-dashed rounded-xl bg-card/30">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">
              Introspecting {dbType.toUpperCase()} schema for {activeConnection?.name || projectId}...
            </p>
          </div>
        ) : (
          /* Main Workspace Grid */
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
            {/* Left Column: Schema Tree (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TableIcon className="size-4 text-primary" />
                    {dbType === 'mongodb'
                      ? `Collections (${filteredCollections.length})`
                      : dbType === 'redis'
                      ? `Keys (${filteredKeys.length})`
                      : `Tables (${filteredTables.length})`}
                  </CardTitle>

                  {dbType === 'mongodb' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCreateCollectionOpen(true)}
                      className="h-7 px-2 text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      title="Add Collection"
                    >
                      <Plus className="size-3.5 mr-1" /> Add
                    </Button>
                  ) : (
                    (dbType === 'sqlite' || dbType === 'postgresql') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsCreateTableOpen(true)}
                        className="h-7 px-2 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                        title="Add Table"
                      >
                        <Plus className="size-3.5 mr-1" /> Add
                      </Button>
                    )
                  )}
                </CardHeader>

                <CardContent className="p-2 flex flex-col gap-1 max-h-[480px] overflow-y-auto">                  {/* Empty collections / tables prompt in sidebar */}
                  {!isIndexed && (
                    <div className="p-4 text-center flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {dbType === 'mongodb' ? 'No collections found.' : 'No tables found.'}
                      </p>
                      {dbType === 'mongodb' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCreateCollectionOpen(true)}
                          className="text-xs gap-1.5 h-8 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <Plus className="size-3" />
                          + Create Collection
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCreateTableOpen(true)}
                          className="text-xs gap-1.5 h-8 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <Plus className="size-3" />
                          + Create Table
                        </Button>
                      )}
                    </div>
                  )}

                  {/* SQL Tables */}
                  {dbType !== 'mongodb' &&
                    dbType !== 'redis' &&
                    filteredTables.map((table) => {
                      const isActive = activeTable === table.name;
                      return (
                        <div key={table.name} className="flex flex-col">
                          <button
                            onClick={() => loadTableData(table.name)}
                            className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                              isActive
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <span className="font-mono flex items-center gap-2 truncate">
                              <TableIcon className="size-3.5 opacity-70" />
                              {table.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {table.rowCount} rows
                            </span>
                          </button>

                          {/* Column details if active */}
                          {isActive && (
                            <div className="pl-6 pr-2 py-2 flex flex-col gap-1 border-l-2 border-primary/40 ml-4 my-1 bg-muted/20 rounded-r">
                              {table.columns.map((col) => (
                                <div
                                  key={col.name}
                                  className="flex items-center justify-between text-[11px] text-muted-foreground font-mono"
                                >
                                  <span className="flex items-center gap-1.5">
                                    {col.pk && <Key className="size-3 text-amber-500" />}
                                    <span className={col.pk ? 'font-semibold text-foreground' : ''}>
                                      {col.name}
                                    </span>
                                  </span>
                                  <span className="text-[10px] uppercase opacity-75">{col.type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* MongoDB Collections */}
                  {dbType === 'mongodb' &&
                    filteredCollections.map((col) => {
                      const isActive = activeTable === col.name;
                      return (
                        <div key={col.name} className="flex flex-col">
                          <button
                            onClick={() => loadTableData(col.name)}
                            className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold'
                                : 'hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <span className="font-mono flex items-center gap-2 truncate">
                              <Database className="size-3.5 opacity-70" />
                              {col.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {col.count} docs
                            </span>
                          </button>

                          {isActive && (
                            <div className="pl-6 pr-2 py-2 flex flex-col gap-1 border-l-2 border-emerald-500/40 ml-4 my-1 bg-muted/20 rounded-r">
                              {col.fields.map((f) => (
                                <div
                                  key={f.name}
                                  className="flex items-center justify-between text-[11px] text-muted-foreground font-mono"
                                >
                                  <span>{f.name}</span>
                                  <span className="text-[10px] text-emerald-500/80 font-semibold">{f.type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Redis Keys */}
                  {dbType === 'redis' &&
                    filteredKeys.map((k) => (
                      <div
                        key={k.key}
                        className="p-2.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-muted/60"
                      >
                        <span className="truncate">{k.key}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {k.type}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Data Grid / Empty State (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {!activeConnectionId ? (
                /* No Database Selected State */
                <Card className="border border-border p-12 bg-card/60 flex flex-col items-center justify-center text-center gap-4">
                  <div className="rounded-full bg-muted/60 p-4 text-muted-foreground border border-border">
                    <Database className="size-10 text-primary/70" />
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-md">
                    <h3 className="font-bold text-lg text-foreground">No Database Selected</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select a database service from the dropdown above to inspect schema, or link an external PostgreSQL, MongoDB, or Redis instance.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs font-semibold cursor-pointer mt-2"
                  >
                    <Plus className="size-3.5" />
                    + Connect Database
                  </Button>
                </Card>
              ) : !isIndexed ? (
                /* Empty State Helper Card */
                <Card className="border border-border p-12 bg-card/60 flex flex-col items-center justify-center text-center gap-4">
                  <div className="rounded-full bg-muted/60 p-4 text-muted-foreground border border-border">
                    <Database className="size-10 text-primary/70" />
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-md">
                    <h3 className="font-bold text-lg text-foreground">Database Connected</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connected to <span className="font-mono font-semibold text-foreground">"{activeConnection?.name || projectId}"</span>. No tables or collections exist yet.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {dbType === 'mongodb' ? (
                      <Button
                        onClick={() => setIsCreateCollectionOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        + Create Collection
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsCreateTableOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        + Create Table
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setIsConnectModalOpen(true)}
                      className="border-border hover:bg-muted text-xs font-medium cursor-pointer"
                    >
                      + Connect DB
                    </Button>
                  </div>
                </Card>
              ) : (
                /* Populated Data Grid */
                <Card className="bg-card border-border shadow-xs overflow-hidden">
                  <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-semibold font-mono flex items-center gap-2">
                        {activeTable || 'Select Table/Collection'}
                      </CardTitle>
                      {tableRows.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {tableRows.length} loaded
                        </Badge>
                      )}
                    </div>
                    {/* G5: Export buttons */}
                    {tableRows.length > 0 && tableColumns.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults('csv', tableRows, tableColumns, activeTable || 'export')}
                          className="h-7 px-2.5 text-[11px] gap-1.5 font-mono border-border hover:bg-muted cursor-pointer"
                          title="Export as CSV"
                        >
                          <Download className="size-3" /> CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults('json', tableRows, tableColumns, activeTable || 'export')}
                          className="h-7 px-2.5 text-[11px] gap-1.5 font-mono border-border hover:bg-muted cursor-pointer"
                          title="Export as JSON"
                        >
                          <Download className="size-3" /> JSON
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-0 overflow-x-auto">
                    {tableRows.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                        <TableIcon className="size-8 opacity-40" />
                        <span>No records found in this table/collection.</span>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground font-mono text-[11px]">
                            {tableColumns.map((col) => (
                              <th key={col} className="p-3 font-semibold truncate max-w-[200px]">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {paginatedRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors font-mono text-[11px]">
                              {tableColumns.map((col) => (
                                <td key={col} className="p-3 text-foreground truncate max-w-[240px]">
                                  {typeof row[col] === 'object' && row[col] !== null
                                    ? JSON.stringify(row[col])
                                    : String(row[col] ?? 'NULL')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>

                  {/* Pagination Footer */}
                  {tableRows.length > pageSize && (
                    <CardFooter className="p-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 px-3 text-xs"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-8 px-3 text-xs"
                        >
                          Next
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {/* G4: Query History Panel */}
        {queryHistory.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => setShowHistory(h => !h)}
            >
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Query History</span>
                <Badge variant="secondary" className="text-[10px] font-mono">{queryHistory.length}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{showHistory ? '▲ Collapse' : '▼ Expand'}</span>
            </div>
            {showHistory && (
              <div className="border-t border-border divide-y divide-border/60 max-h-60 overflow-y-auto">
                {queryHistory.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => setCustomQuery(entry.query)}
                    title="Click to load into query console"
                  >
                    <Badge
                      className={`text-[10px] font-mono shrink-0 mt-0.5 ${
                        entry.success
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-destructive/10 text-destructive border-destructive/30'
                      }`}
                    >
                      {entry.success ? 'OK' : 'ERR'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground truncate">{entry.query}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.rowCount ?? 0} rows · {entry.executionTimeMs ?? 0}ms · {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Connect External Database */}
        <ConnectDbModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnect={connectDatabase}
        />

        {/* Modal: Create MongoDB Collection */}
        {isCreateCollectionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FolderPlus className="size-4 text-emerald-500" />
                  Create MongoDB Collection
                </h3>
                <button
                  onClick={() => setIsCreateCollectionOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCollectionSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Collection Name</label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g. users, orders, logs"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Initial Document (JSON) <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={initialDocText}
                    onChange={(e) => setInitialDocText(e.target.value)}
                    rows={4}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {createCollectionError && (
                  <div className="p-2 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{createCollectionError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateCollectionOpen(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="text-xs h-8 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    Create Collection
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create SQL Table */}
        {isCreateTableOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  Create Table in {activeConnection?.name || 'Local Database'}
                </h3>
                <button
                  onClick={() => setIsCreateTableOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTableSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Table Name</label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="e.g. customers, products"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Columns</label>
                    <button
                      type="button"
                      onClick={handleAddColumnField}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      + Add Column
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {colsList.map((col, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColsList((prev) => prev.map((c, i) => (i === idx ? { ...c, name: val } : c)));
                          }}
                          placeholder="Column name"
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                        />
                        <select
                          value={col.type}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColsList((prev) => prev.map((c, i) => (i === idx ? { ...c, type: val } : c)));
                          }}
                          className="bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                        >
                          <option value="INTEGER">INTEGER</option>
                          <option value="TEXT">TEXT</option>
                          <option value="VARCHAR(255)">VARCHAR</option>
                          <option value="REAL">REAL</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                        </select>
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          <input
                            type="checkbox"
                            checked={col.isPk}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setColsList((prev) => prev.map((c, i) => (i === idx ? { ...c, isPk: val } : c)));
                            }}
                          />
                          PK
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {createTableError && (
                  <div className="p-2 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{createTableError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateTableOpen(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="text-xs h-8 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  >
                    Create Table
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal: Import Schema */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Upload className="size-4 text-amber-500" />
                  Import Schema into {activeConnection?.name || 'Local Database'}
                </h3>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError(null);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Schema Script / Payload</label>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setImportFormat('sql')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${importFormat === 'sql' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground'}`}
                    >
                      SQL DDL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportFormat('json')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${importFormat === 'json' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground'}`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={8}
                  placeholder={
                    importFormat === 'sql'
                      ? 'CREATE TABLE IF NOT EXISTS inventory (\n  id INTEGER PRIMARY KEY,\n  item_name TEXT NOT NULL,\n  qty INTEGER DEFAULT 0\n);'
                      : '{\n  "tables": [\n    {\n      "name": "inventory",\n      "columns": [{ "name": "id", "type": "INTEGER", "pk": true }, { "name": "item_name", "type": "TEXT" }]\n    }\n  ]\n}'
                  }
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                  required
                />

                {importError && (
                  <div className="p-2.5 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportError(null);
                    }}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isImporting}
                    className="text-xs h-8 font-semibold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer gap-1.5"
                  >
                    {isImporting ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Import Schema
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default DbManagerPage;

