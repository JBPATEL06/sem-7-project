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
  const [activeConnectionId, setActiveConnectionId] = useState<string>(`conn_sqlite_${projectId}`);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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
        await fetchConnections();
        setActiveConnectionId(res.data.connection.id);
        await fetchSchema(res.data.connection.id);
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
        await fetchConnections();
        setActiveConnectionId(`conn_sqlite_${projectId}`);
        await fetchSchema(`conn_sqlite_${projectId}`);
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

  // Initial load
  useEffect(() => {
    fetchConnections();
    fetchSchema(`conn_sqlite_${projectId}`);
  }, [fetchConnections, fetchSchema, projectId]);

  // Reload table data on table change
  useEffect(() => {
    if (activeTable) {
      loadTableData(activeTable);
    }
  }, [activeTable, loadTableData]);

  const switchConnection = async (connId: string) => {
    setActiveConnectionId(connId);
    await fetchSchema(connId);
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
    switchConnection,
    refetchSchema: () => fetchSchema(activeConnectionId),
    loadTableData,
    runQuery,
    connectDatabase,
    disconnectDatabase,
    syncErDiagram,
    createTable,
    createCollection
  };
}
