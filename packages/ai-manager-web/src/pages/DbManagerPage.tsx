import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { useDbManager } from '../hooks/useDbManager';
import {
  Lock,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Database,
  Play,
  Plus,
  Loader2,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Code2,
  Key
} from 'lucide-react';

interface DbManagerPageProps {
  projectId?: string;
}

export const DbManagerPage: React.FC<DbManagerPageProps> = ({ projectId = 'acme-api' }) => {
  const {
    schema,
    activeTable,
    tableRows,
    tableColumns,
    isLoading,
    isQueryRunning,
    queryResult,
    error,
    loadTableData,
    runQuery,
    createTable
  } = useDbManager(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [customQuery, setCustomQuery] = useState<string>('SELECT * FROM sqlite_master;');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Create Table Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [colsList, setColsList] = useState<Array<{ name: string; type: string; isPk: boolean; notNull: boolean }>>([
    { name: 'id', type: 'INTEGER', isPk: true, notNull: true },
    { name: 'name', type: 'TEXT', isPk: false, notNull: true }
  ]);
  const [createError, setCreateError] = useState<string | null>(null);

  const isIndexed = Boolean(schema?.indexed && schema?.tables && schema.tables.length > 0);

  const filteredTables = (schema?.tables || []).filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = tableFilter === 'all' || t.name.toLowerCase().includes(tableFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const activeTableSchema = (schema?.tables || []).find((t) => t.name === activeTable);

  const handleRunCustomQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customQuery.trim()) return;
    await runQuery(customQuery);
  };

  const handleAddColumnField = () => {
    setColsList((prev) => [...prev, { name: '', type: 'TEXT', isPk: false, notNull: false }]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      setCreateError('Table name is required.');
      return;
    }
    const validCols = colsList.filter((c) => c.name.trim() !== '');
    if (validCols.length === 0) {
      setCreateError('At least one column is required.');
      return;
    }

    setCreateError(null);
    const res = await createTable(newTableName.trim(), validCols);
    if (res.success) {
      setIsCreateModalOpen(false);
      setNewTableName('');
      setColsList([
        { name: 'id', type: 'INTEGER', isPk: true, notNull: true },
        { name: 'name', type: 'TEXT', isPk: false, notNull: true }
      ]);
    } else {
      setCreateError(res.error || 'Failed to create table');
    }
  };

  // Pagination on current loaded rows
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const paginatedRows = tableRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header & Status */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl tracking-tight text-foreground">DB Manager</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {projectId}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              sql.js (WASM SQLite) — schema inspector & interactive query console
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border bg-card flex py-2 px-3 items-center gap-2 shadow-sm">
              <Lock className="text-muted-foreground size-4" />
              <span className={`rounded-full size-2 ${isIndexed ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
              <span className="font-mono text-muted-foreground text-xs font-medium">
                {isIndexed ? 'SQLite Database Connected' : 'Not Indexed'}
              </span>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-xs font-medium cursor-pointer"
            >
              <Plus className="size-3.5" />
              Create Table
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 border border-border border-dashed rounded-xl bg-card/30">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-mono">Loading SQLite schema for {projectId}...</p>
          </div>
        ) : !isIndexed ? (
          /* Empty / Unindexed State (Screen 10) */
          <div className="flex flex-col gap-6">
            <Card className="border border-border/70 p-12 bg-card/60 flex flex-col items-center justify-center text-center gap-4">
              <div className="rounded-full bg-muted/60 p-4 text-muted-foreground border border-border">
                <Database className="size-10" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-md">
                <h3 className="font-bold text-lg text-foreground">No Database Index Found</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Project <span className="font-mono font-semibold text-foreground">"{projectId}"</span> has not been scanned or indexed into SQLite yet. You can create a table or execute queries interactively below.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Create Table
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomQuery('CREATE TABLE IF NOT EXISTS demo (id INTEGER PRIMARY KEY, name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
                  }}
                  className="text-xs border-border cursor-pointer"
                >
                  Load DDL Example
                </Button>
              </div>
            </Card>

            {/* Interactive Query Console even in Empty State */}
            <Card className="p-6 gap-4 bg-card border-border">
              <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2">
                  <Code2 className="size-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Interactive SQL Console</CardTitle>
                </div>
                {queryResult && (
                  <span className="text-xs font-mono text-muted-foreground">
                    Execution: {queryResult.executionTimeMs} ms
                  </span>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-0">
                <form onSubmit={handleRunCustomQuery} className="flex flex-col gap-3">
                  <textarea
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    rows={3}
                    placeholder="Enter SQL statement (e.g. CREATE TABLE, SELECT, INSERT)..."
                    className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Supported: standard SQLite / sql.js SQL syntax
                    </span>
                    <Button
                      type="submit"
                      disabled={isQueryRunning}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-8 text-xs font-semibold cursor-pointer"
                    >
                      {isQueryRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                      Run Query
                    </Button>
                  </div>
                </form>

                {queryResult?.error && (
                  <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="font-mono">{queryResult.error}</span>
                  </div>
                )}

                {queryResult?.success && queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                        <tr>
                          {queryResult.columns?.map((col) => (
                            <th key={col} className="p-2.5 font-semibold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {queryResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/20">
                            {queryResult.columns?.map((col) => (
                              <td key={col} className="p-2.5 text-foreground">{String(row[col] ?? 'NULL')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Populated State (Screen 4) */
          <div className="flex flex-col gap-6">
            {/* Toolbar Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="-translate-y-1/2 text-muted-foreground absolute top-1/2 left-3 size-4" />
                <Input
                  placeholder="Filter tables or columns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={tableFilter} onValueChange={setTableFilter} defaultValue="all">
                <SelectTrigger className="w-48 h-9 text-xs">
                  <SelectValue placeholder="All Tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables ({schema?.tables.length})</SelectItem>
                  {schema?.tables.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SQL Console Bar */}
            <Card className="p-4 bg-card border-border">
              <form onSubmit={handleRunCustomQuery} className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Code2 className="size-4 text-primary" />
                    SQL Query Runner
                  </span>
                  {queryResult && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {queryResult.executionTimeMs} ms • {queryResult.rowCount ?? queryResult.affectedRows ?? 0} results
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Enter SQL statement (e.g. SELECT * FROM context_queries LIMIT 10;)"
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
                {queryResult?.error && (
                  <div className="p-2.5 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="font-mono">{queryResult.error}</span>
                  </div>
                )}
              </form>
            </Card>

            {/* Two-Column Schema Tree & Table View */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
              {/* Left Column: Schema Tree (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className="bg-card">
                  <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TableIcon className="size-4 text-primary" />
                      Schema Tables ({filteredTables.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 flex flex-col gap-1 max-h-[500px] overflow-y-auto">
                    {filteredTables.map((table) => {
                      const isActive = activeTable === table.name;
                      return (
                        <div
                          key={table.name}
                          onClick={() => loadTableData(table.name)}
                          className={`rounded-lg p-3 cursor-pointer transition-all flex flex-col gap-1.5 ${
                            isActive
                              ? 'bg-primary/10 border border-primary/40 text-foreground'
                              : 'hover:bg-muted/40 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold truncate">
                              {table.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                              {table.rowCount} rows
                            </span>
                          </div>
                          {/* Column count info */}
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            <span>{table.columns.length} columns</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Table Column Definitions */}
                {activeTableSchema && (
                  <Card className="bg-card p-4">
                    <h4 className="text-xs font-bold text-foreground mb-3 font-mono">
                      {activeTableSchema.name} Columns
                    </h4>
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                      {activeTableSchema.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex justify-between items-center text-xs font-mono p-1.5 rounded bg-muted/30 border border-border/40"
                        >
                          <div className="flex items-center gap-1.5">
                            {col.pk && (
                              <span title="Primary Key">
                                <Key className="size-3 text-amber-400" />
                              </span>
                            )}
                            <span className="text-foreground">{col.name}</span>
                          </div>

                          <span className="text-[11px] text-muted-foreground uppercase">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column: Data Grid (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm font-bold text-foreground">
                        {activeTable || 'Table Data'}
                      </h3>
                      {activeTableSchema && (
                        <span className="text-xs font-mono text-muted-foreground">
                          ({tableRows.length} loaded)
                        </span>
                      )}
                    </div>
                    {isQueryRunning && <Loader2 className="size-4 animate-spin text-primary" />}
                  </CardHeader>

                  <CardContent className="p-0 overflow-x-auto">
                    {tableRows.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground font-mono">
                        No rows found in this table.
                      </div>
                    ) : (
                      <table className="w-full text-xs font-mono text-left">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground select-none">
                          <tr>
                            {tableColumns.map((col) => (
                              <th key={col} className="p-3 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                              {tableColumns.map((col) => (
                                <td key={col} className="p-3 text-foreground whitespace-nowrap max-w-xs truncate">
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
                  {tableRows.length > 0 && (
                    <CardFooter className="p-3 border-t border-border flex justify-between items-center text-xs font-mono text-muted-foreground">
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-7 text-xs px-2"
                        >
                          <ChevronLeft className="size-3.5 mr-1" /> Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-7 text-xs px-2"
                        >
                          Next <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Create Table Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <TableIcon className="size-5" />
                  </div>
                  <h2 className="font-bold text-base text-foreground">Create SQLite Table</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 flex flex-col gap-4">
                {createError && (
                  <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Table Name *</label>
                  <Input
                    placeholder="e.g. users, products, logs"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    required
                    className="text-xs font-mono h-9"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground">Columns</label>
                    <button
                      type="button"
                      onClick={handleAddColumnField}
                      className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                    >
                      + Add Column
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {colsList.map((col, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Column name"
                          value={col.name}
                          onChange={(e) => {
                            const updated = [...colsList];
                            updated[idx].name = e.target.value;
                            setColsList(updated);
                          }}
                          className="text-xs font-mono h-8 flex-1"
                        />
                        <select
                          value={col.type}
                          onChange={(e) => {
                            const updated = [...colsList];
                            updated[idx].type = e.target.value;
                            setColsList(updated);
                          }}
                          className="bg-background border border-border rounded text-xs px-2 h-8 font-mono text-foreground"
                        >
                          <option value="INTEGER">INTEGER</option>
                          <option value="TEXT">TEXT</option>
                          <option value="REAL">REAL</option>
                          <option value="BLOB">BLOB</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.isPk}
                            onChange={(e) => {
                              const updated = [...colsList];
                              updated[idx].isPk = e.target.checked;
                              setColsList(updated);
                            }}
                          />
                          PK
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-border mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs font-semibold cursor-pointer"
                  >
                    Create Table
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
