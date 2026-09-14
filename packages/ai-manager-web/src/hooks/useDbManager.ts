import { useState, useEffect, useCallback } from 'react';

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  dfltValue: any;
  pk: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface MongoCollectionSchema {
  name: string;
  count: number;
  sizeBytes: number;
  indexes: string[];
  fields: Array<{ name: string; type: string; sampleValue?: any }>;
}

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number;
  valuePreview: string;
}

export interface DbConnection {
  id: string;
  projectId: string;
  name: string;
  type: 'sqlite' | 'postgresql' | 'supabase' | 'mongodb' | 'redis';
  uri: string;
  isDefault?: boolean;
  isConnected: boolean;
  lastTested?: string;
}

export interface SchemaResponse {
  indexed: boolean;
  projectId: string;
  dbType: 'sqlite' | 'postgresql' | 'mongodb' | 'redis';
  connectionName?: string;
  dbPath?: string | null;
  tables?: TableSchema[];
  collections?: MongoCollectionSchema[];
  keys?: RedisKeyInfo[];
  totalTables?: number;
  totalCollections?: number;
  totalKeys?: number;
  message?: string;
}

export interface QueryResult {
  success: boolean;
  dbType?: string;
  query?: string;
  command?: string;
  operation?: string;
  columns?: string[];
  rows?: any[];
  rowCount?: number;
  affectedRows?: number;
  executionTimeMs?: number;
  error?: string;
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  dbType?: string;
  rowCount?: number;
  executionTimeMs?: number;
  success: boolean;
  timestamp: string;
  connectionId: string;
}

async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const token = localStorage.getItem('ai_manager_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as any || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, status: res.status, error: data.error || `HTTP Error ${res.status}` };
      }
      return { ok: true, status: res.status, data };
    } else {
      const text = await res.text();
      return { ok: false, status: res.status, error: res.ok ? 'Non-JSON response' : `Server error (${res.status}): ${text.slice(0, 100)}` };
    }
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || 'Network request failed' };
  }
}

export function useDbManager(projectId: string = 'acme-api') {
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(`ai_manager_qh_${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // G4: Persist query history to localStorage (capped at 20 per project)
  const appendQueryHistory = (entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>) => {
    setQueryHistory(prev => {
      const newEntry: QueryHistoryEntry = {
        ...entry,
        id: `qh_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      const updated = [newEntry, ...prev].slice(0, 20);
      try {
        localStorage.setItem(`ai_manager_qh_${projectId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 1. Fetch configured connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; connections: DbConnection[] }>(
        `/api/db/connections?projectId=${encodeURIComponent(projectId)}`
      );
      if (res.ok && res.data?.connections) {
        setConnections(res.data.connections);
      }
    } catch (err) {
      console.error('[useDbManager] Connections fetch error:', err);
    }
  }, [projectId]);

  // 2. Fetch schema for active connection
  const fetchSchema = useCallback(async (connId?: string) => {
    setIsLoading(true);
    setError(null);
    const targetConnId = connId || activeConnectionId;
    try {
      const res = await apiFetch<SchemaResponse>(
        `/api/db/schema?projectId=${encodeURIComponent(projectId)}&connectionId=${encodeURIComponent(targetConnId)}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || `Failed to fetch schema (HTTP ${res.status})`);
      }
      const data = res.data;
      setSchema(data);

      if (data.tables && data.tables.length > 0) {
        const firstTable = data.tables[0].name;
        setActiveTable((prev) => (prev && data.tables!.some((t) => t.name === prev) ? prev : firstTable));
      } else if (data.collections && data.collections.length > 0) {
        const firstCol = data.collections[0].name;
        setActiveTable((prev) => (prev && data.collections!.some((c) => c.name === prev) ? prev : firstCol));
      } else {
        setActiveTable(null);
        setTableRows([]);
        setTableColumns([]);
      }
    } catch (err: any) {
      console.error('[useDbManager] Fetch error:', err);
      setError(err.message || 'Failed to inspect schema');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeConnectionId]);

  // 3. Load data for active table or collection
  const loadTableData = useCallback(async (tableName: string) => {
    setActiveTable(tableName);
    setIsQueryRunning(true);
    try {
      const activeConn = connections.find(c => c.id === activeConnectionId);
      const isMongo = activeConn?.type === 'mongodb' || schema?.dbType === 'mongodb';
      const isRedis = activeConn?.type === 'redis' || schema?.dbType === 'redis';

      let payload: any = {
        projectId,
        connectionId: activeConnectionId
      };

      if (isMongo) {
        payload.collectionName = tableName;
        payload.operation = 'find';
        payload.query = '{}';
      } else if (isRedis) {
        payload.query = 'KEYS *';
      } else {
        payload.query = `SELECT * FROM "${tableName}" LIMIT 50;`;
      }

      const res = await apiFetch<QueryResult>('/api/db/query', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data) {
        const data = res.data;
        setQueryResult(data);
        if (data.success && data.columns && data.columns.length > 0) {
          setTableColumns(data.columns);
          setTableRows(data.rows || []);
        }
      } else {
        const errRes: QueryResult = {
          success: false,
          error: res.error || 'Query failed',
          executionTimeMs: 0
        };
        setQueryResult(errRes);
      }
    } catch (err: any) {
      const errRes: QueryResult = {
        success: false,
        error: err.message || 'Query network error',
        executionTimeMs: 0
      };
      setQueryResult(errRes);
    } finally {
      setIsQueryRunning(false);
    }
  }, [projectId, activeConnectionId, connections, schema]);

  // 4. Run custom query
  const runQuery = async (queryText: string, operation?: string) => {
    setIsQueryRunning(true);
    try {
      const activeConn = connections.find(c => c.id === activeConnectionId);
      const isMongo = activeConn?.type === 'mongodb' || schema?.dbType === 'mongodb';

      const payload: any = {
        projectId,
        connectionId: activeConnectionId,
        query: queryText
      };

      if (isMongo && activeTable) {
        payload.collectionName = activeTable;
        payload.operation = operation || 'find';
      }

      const res = await apiFetch<QueryResult>('/api/db/query', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data) {
        const data = res.data;
        setQueryResult(data);

        if (data.success && data.columns && data.columns.length > 0) {
          setTableColumns(data.columns);
          setTableRows(data.rows || []);
        }

        // G4: Record to query history
        appendQueryHistory({
          query: queryText,
          dbType: data.dbType,
          rowCount: data.rowCount,
          executionTimeMs: data.executionTimeMs,
          success: data.success,
          connectionId: activeConnectionId
        });

        // If mutation query, refresh schema tree
        if (queryText && !/^\s*(SELECT|PRAGMA|EXPLAIN|KEYS|GET|find)/i.test(queryText)) {
          await fetchSchema();
        }

        return data;
      } else {
        const errRes: QueryResult = {
          success: false,
          error: res.error || 'Query failed',
          executionTimeMs: 0
        };
        setQueryResult(errRes);
        return errRes;
      }
    } catch (err: any) {
      const errRes: QueryResult = {
        success: false,
        error: err.message || 'Query execution network error',
        executionTimeMs: 0
      };
      setQueryResult(errRes);
      return errRes;
    } finally {
      setIsQueryRunning(false);
    }
  };

  // 5. Connect new database
  const connectDatabase = async (connData: { name: string; type: string; uri: string }) => {
    try {
      const res = await apiFetch<{ success: boolean; connection: DbConnection; latencyMs: number; error?: string }>(
        '/api/db/connect',
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            ...connData
          })
        }
      );

      if (res.ok && res.data?.success) {
        const newId = res.data.connection.id;
        try {
          localStorage.setItem(`ai_manager_active_conn_${projectId}`, newId);
        } catch {}
        await fetchConnections();
        setActiveConnectionId(newId);
        await fetchSchema(newId);
        return { success: true, latencyMs: res.data.latencyMs };
      }
      return { success: false, error: res.data?.error || res.error || 'Connection failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  // 6. Disconnect database
  const disconnectDatabase = async (id: string) => {
    try {
      const res = await apiFetch(`/api/db/connections/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const fallbackId = `conn_sqlite_${projectId}`;
        try {
          localStorage.setItem(`ai_manager_active_conn_${projectId}`, fallbackId);
        } catch {}
        await fetchConnections();
        setActiveConnectionId(fallbackId);
        await fetchSchema(fallbackId);
        return { success: true };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  };

  // 7. Sync ER diagram to Excalidraw file on disk
  const syncErDiagram = async () => {
    try {
      const res = await apiFetch<{ success: boolean; filePath: string; error?: string }>('/api/db/sync-er-diagram', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          connectionId: activeConnectionId
        })
      });
      if (res.ok && res.data?.success) {
        setSyncMessage(`Synced ER diagram to ${res.data.filePath}`);
        setTimeout(() => setSyncMessage(null), 3000);
        return { success: true, filePath: res.data.filePath };
      }
      return { success: false, error: res.data?.error || res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 8. Create table action
  const createTable = async (tableName: string, columns: { name: string; type: string; isPk?: boolean; notNull?: boolean }[]) => {
    try {
      const res = await apiFetch<{ success: boolean; error?: string }>('/api/db/create-table', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          tableName,
          columns
        })
      });

      if (res.ok && res.data?.success) {
        await fetchSchema();
        await loadTableData(tableName);
        return { success: true };
      }
      return { success: false, error: res.data?.error || res.error || 'Failed to create table' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create table' };
    }
  };

  // 9. Create collection action for MongoDB
  const createCollection = async (collectionName: string, initialDocument?: any) => {
    try {
      const res = await apiFetch<{ success: boolean; error?: string }>('/api/db/create-collection', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          connectionId: activeConnectionId,
          collectionName,
          initialDocument
        })
      });

      if (res.ok && res.data?.success) {
        await fetchSchema();
        await loadTableData(collectionName);
        return { success: true };
      }
      return { success: false, error: res.data?.error || res.error || 'Failed to create collection' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create collection' };
    }
  };

  // Initial load: fetch available connections and auto-select active/default connection
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const res = await apiFetch<{ success: boolean; connections: DbConnection[] }>(
          `/api/db/connections?projectId=${encodeURIComponent(projectId)}`
        );
        if (res.ok && res.data?.connections && isMounted) {
          const conns = res.data.connections;
          setConnections(conns);

          const savedConnId = localStorage.getItem(`ai_manager_active_conn_${projectId}`);
          const targetConn = conns.find(c => c.id === savedConnId) || conns.find(c => c.isDefault) || conns[0];
          if (targetConn) {
            setActiveConnectionId(targetConn.id);
            fetchSchema(targetConn.id);
          }
        }
      } catch (err) {
        console.error('[useDbManager] Connection fetch error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [projectId, fetchSchema]);

  // Reload table data on table change
  useEffect(() => {
    if (activeTable) {
      loadTableData(activeTable);
    }
  }, [activeTable, loadTableData]);

  const switchConnection = async (connId: string) => {
    setActiveConnectionId(connId);
    setActiveTable(null);
    setQueryResult(null);
    setTableRows([]);
    setTableColumns([]);
    try {
      localStorage.setItem(`ai_manager_active_conn_${projectId}`, connId);
    } catch {}
    await fetchSchema(connId);
  };

  // G5: Download query results as CSV or JSON
  const downloadResults = (format: 'csv' | 'json', rows: any[], columns: string[], filename = 'query_results') => {
    if (!rows || rows.length === 0) return;
    let content = '';
    let mimeType = '';
    if (format === 'json') {
      content = JSON.stringify(rows, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      const header = columns.join(',');
      const body = rows.map(row =>
        columns.map(col => {
          const val = row[col] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ).join('\n');
      content = `${header}\n${body}`;
      mimeType = 'text/csv';
      filename += '.csv';
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 10. Export schema (SQL DDL or JSON)
  const exportSchema = async (format: 'sql' | 'json' = 'sql') => {
    try {
      const res = await apiFetch<{ success: boolean; format: string; ddl?: string; fileName?: string; schema?: any; error?: string }>(
        `/api/db/export?projectId=${encodeURIComponent(projectId)}&connectionId=${encodeURIComponent(activeConnectionId || '')}&format=${format}`
      );
      if (res.ok && res.data?.success) {
        let content = '';
        let filename = res.data.fileName || `${projectId}_schema.${format}`;
        let mimeType = format === 'json' ? 'application/json' : 'text/plain';

        if (format === 'json') {
          content = JSON.stringify(res.data.schema || res.data, null, 2);
        } else {
          content = res.data.ddl || '';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, fileName: filename };
      }
      return { success: false, error: res.data?.error || res.error || 'Failed to export schema' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 11. Import schema (SQL script or JSON)
  const importSchema = async (content: string, format: 'sql' | 'json' = 'sql') => {
    try {
      const res = await apiFetch<{ success: boolean; message?: string; statementsExecuted?: number; error?: string }>(
        '/api/db/import',
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            connectionId: activeConnectionId,
            format,
            content
          })
        }
      );
      if (res.ok && res.data?.success) {
        await fetchSchema();
        return { success: true, message: res.data.message };
      }
      return { success: false, error: res.data?.error || res.error || 'Failed to import schema' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Import error' };
    }
  };

  return {
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
    refetchSchema: () => fetchSchema(activeConnectionId),
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
  };
}

