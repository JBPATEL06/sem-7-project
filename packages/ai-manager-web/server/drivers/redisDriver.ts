import Redis from 'ioredis';

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number;
  valuePreview: string;
}

export class RedisDriver {
  private static clients: Map<string, Redis> = new Map();

  public static getClient(uri: string): Redis {
    if (!this.clients.has(uri)) {
      const client = new Redis(uri, {
        connectTimeout: 8000,
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      this.clients.set(uri, client);
    }
    return this.clients.get(uri)!;
  }

  public static async testConnection(uri: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const client = this.getClient(uri);
      if (client.status === 'wait') {
        await client.connect();
      }
      const pong = await client.ping();
      return { success: pong === 'PONG', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  public static async getSchema(uri: string): Promise<RedisKeyInfo[]> {
    const client = this.getClient(uri);
    if (client.status === 'wait') {
      await client.connect();
    }

    const keys = await client.keys('*');
    const result: RedisKeyInfo[] = [];

    for (const key of keys.slice(0, 50)) {
      const type = await client.type(key);
      const ttl = await client.ttl(key);
      let valuePreview = '';

      try {
        if (type === 'string') {
          const val = await client.get(key);
          valuePreview = val ? (val.length > 60 ? val.slice(0, 60) + '...' : val) : '';
        } else if (type === 'hash') {
          const count = await client.hlen(key);
          valuePreview = `{ ${count} fields }`;
        } else if (type === 'list') {
          const len = await client.llen(key);
          valuePreview = `[ ${len} items ]`;
        } else if (type === 'set') {
          const card = await client.scard(key);
          valuePreview = `( ${card} members )`;
        } else {
          valuePreview = type;
        }
      } catch {
        valuePreview = '—';
      }

      result.push({
        key,
        type: type.toUpperCase(),
        ttl,
        valuePreview
      });
    }

    return result;
  }

  public static async executeCommand(uri: string, commandLine: string): Promise<{
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
  }> {
    const client = this.getClient(uri);
    if (client.status === 'wait') {
      await client.connect();
    }

    const parts = commandLine.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const start = performance.now();
    let res: any;

    if (!cmd) {
      return { rows: [], rowCount: 0, executionTimeMs: 0 };
    }

    if (cmd === 'get' && args[0]) {
      res = await client.get(args[0]);
    } else if (cmd === 'set' && args[0] && args[1]) {
      res = await client.set(args[0], args.slice(1).join(' '));
    } else if (cmd === 'del' && args[0]) {
      res = await client.del(...args);
    } else if (cmd === 'keys') {
      res = await client.keys(args[0] || '*');
    } else if (cmd === 'hgetall' && args[0]) {
      res = await client.hgetall(args[0]);
    } else if (cmd === 'ping') {
      res = await client.ping();
    } else {
      res = await (client as any).call(cmd, ...args);
    }

    const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

    const rows = typeof res === 'object' && !Array.isArray(res) && res !== null
      ? Object.entries(res).map(([k, v]) => ({ field: k, value: v }))
      : Array.isArray(res)
      ? res.map((item, idx) => ({ index: idx, value: item }))
      : [{ result: String(res) }];

    return {
      rows,
      rowCount: rows.length,
      executionTimeMs
    };
  }
}
