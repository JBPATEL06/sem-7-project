import mongoose from 'mongoose';

export interface MongoCollectionSchema {
  name: string;
  count: number;
  sizeBytes: number;
  indexes: string[];
  fields: Array<{ name: string; type: string; sampleValue?: any }>;
}

export class MongoDriver {
  private static connections: Map<string, mongoose.Connection> = new Map();

  public static async getConnection(uri: string): Promise<mongoose.Connection> {
    if (!this.connections.has(uri) || this.connections.get(uri)!.readyState !== 1) {
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000
      }).asPromise();
      this.connections.set(uri, conn);
    }
    return this.connections.get(uri)!;
  }

  public static async testConnection(uri: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const conn = await this.getConnection(uri);
      if (!conn.db) throw new Error('Mongo database object is undefined');
      const admin = conn.db.admin();
      await admin.ping();
      return { success: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  public static async getSchema(uri: string): Promise<MongoCollectionSchema[]> {
    const conn = await this.getConnection(uri);
    if (!conn.db) throw new Error('Mongo database object is undefined');
    const db = conn.db;
    const collections = await db.listCollections().toArray();

    const result: MongoCollectionSchema[] = [];

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const col = db.collection(colName);
      let count = 0;
      let sizeBytes = 0;
      let indexNames: string[] = [];

      try {
        count = await col.estimatedDocumentCount();
        const indexes = await col.indexes();
        indexNames = indexes.map(idx => idx.name || '').filter((n): n is string => Boolean(n));
      } catch {
        count = 0;
      }

      // Sample first 5 documents to infer schema fields
      const samples = await col.find().limit(5).toArray();
      const fieldMap = new Map<string, string>();

      for (const doc of samples) {
        for (const [key, val] of Object.entries(doc)) {
          if (!fieldMap.has(key)) {
            const type = val === null ? 'null' : Array.isArray(val) ? 'Array' : typeof val;
            fieldMap.set(key, type);
          }
        }
      }

      result.push({
        name: colName,
        count,
        sizeBytes,
        indexes: indexNames,
        fields: Array.from(fieldMap.entries()).map(([name, type]) => ({ name, type }))
      });
    }

    return result;
  }

  public static async executeQuery(uri: string, operation: string, collectionName: string, filterStr?: string, limit: number = 50): Promise<{
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
  }> {
    const conn = await this.getConnection(uri);
    if (!conn.db) throw new Error('Mongo database object is undefined');
    const db = conn.db;
    const col = db.collection(collectionName);
    const start = performance.now();

    let filter: any = {};
    if (filterStr && filterStr.trim()) {
      try {
        filter = JSON.parse(filterStr);
      } catch {
        filter = {};
      }
    }

    let rows: any[] = [];
    if (operation === 'find' || !operation) {
      rows = await col.find(filter).limit(limit).toArray();
    } else if (operation === 'count') {
      const count = await col.countDocuments(filter);
      rows = [{ totalCount: count }];
    } else if (operation === 'stats') {
      const count = await col.estimatedDocumentCount();
      const indexes = await col.indexes();
      rows = [{ collection: collectionName, documentCount: count, indexes }];
    }

    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

    return {
      rows,
      rowCount: rows.length,
      executionTimeMs
    };
  }

  public static async createCollection(uri: string, collectionName: string, initialDoc?: any): Promise<{ success: boolean; message: string }> {
    const conn = await this.getConnection(uri);
    if (!conn.db) throw new Error('Mongo database object is undefined');
    const db = conn.db;
    const col = await db.createCollection(collectionName);
    if (initialDoc && typeof initialDoc === 'object' && Object.keys(initialDoc).length > 0) {
      await col.insertOne(initialDoc);
    }
    return { success: true, message: `Collection '${collectionName}' created successfully.` };
  }
}
