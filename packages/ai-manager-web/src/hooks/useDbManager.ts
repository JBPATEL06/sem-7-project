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

export interface SchemaResponse {
  indexed: boolean;
  projectId: string;
  dbPath?: string | null;
  tables: TableSchema[];
  totalTables?: number;
  message?: string;
}

export interface QueryResult {
  success: boolean;
  query?: string;
  columns?: string[];
  rows?: any[];
  rowCount?: number;
  affectedRows?: number;
  executionTimeMs?: number;
  error?: string;
}

export function useDbManager(projectId: string = 'acme-api') {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/schema?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch schema (HTTP ${res.status})`);
      }
      const data: SchemaResponse = await res.json();
      setSchema(data);

      if (data.tables && data.tables.length > 0) {
        const firstTable = data.tables[0].name;
        setActiveTable((prev) => (prev && data.tables.some((t) => t.name === prev) ? prev : firstTable));
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
  }, [projectId]);

  const loadTableData = useCallback(async (tableName: string) => {
    setActiveTable(tableName);
    setIsQueryRunning(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          query: `SELECT * FROM "${tableName}" LIMIT 50;`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTableColumns(data.columns || []);
        setTableRows(data.rows || []);
      } else {
        setTableRows([]);
        setTableColumns([]);
      }
    } catch (err: any) {
      console.error('[useDbManager] Load table data error:', err);
    } finally {
      setIsQueryRunning(false);
    }
  }, [projectId]);

  const runQuery = async (queryText: string): Promise<QueryResult> => {
    setIsQueryRunning(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          query: queryText
        })
      });

      const data = await res.json();
      setQueryResult(data);

      if (data.success && data.columns && data.columns.length > 0) {
        setTableColumns(data.columns);
        setTableRows(data.rows || []);
      }

      // If mutation query, refresh schema tree
      if (!/^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(queryText)) {
        await fetchSchema();
      }

      return data;
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

  const createTable = async (tableName: string, columns: { name: string; type: string; isPk?: boolean; notNull?: boolean }[]) => {
    try {
      const res = await fetch('/api/db/create-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tableName,
          columns
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSchema();
        await loadTableData(tableName);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to create table' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create table' };
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  useEffect(() => {
    if (activeTable) {
      loadTableData(activeTable);
    }
  }, [activeTable, loadTableData]);

  return {
    schema,
    activeTable,
    tableRows,
    tableColumns,
    isLoading,
    isQueryRunning,
    queryResult,
    error,
    refetchSchema: fetchSchema,
    loadTableData,
    runQuery,
    createTable
  };
}
