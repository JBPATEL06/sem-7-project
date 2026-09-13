import Redis from 'ioredis';

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number;
  valuePreview: string;
}

export function parseRedisCommandLine(commandLine: string): string[] {
  const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
  const matches = commandLine.trim().match(regex) || [];
  return matches.map(token => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  });
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

  // Close and evict a single Redis client by URI
  public static async closeClient(uri: string): Promise<void> {
    const client = this.clients.get(uri);
    if (client) {
      try {
        await client.quit();
      } catch {}
      this.clients.delete(uri);
      console.log(`[RedisDriver] Client for ${uri.slice(0, 15)}... disconnected.`);
    }
  }

  // G6: Graceful shutdown — quit all ioredis clients
  public static async closeAll(): Promise<void> {
    const closers = Array.from(this.clients.values()).map(client => {
      try { return client.quit(); } catch { return Promise.resolve(); }
    });
    await Promise.allSettled(closers);
    this.clients.clear();
    console.log('[RedisDriver] All clients disconnected.');
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

  // G3 fix: use SCAN cursor instead of KEYS * to avoid blocking prod Redis (max 100 keys)
  public static async getSchema(uri: string): Promise<RedisKeyInfo[]> {
    const client = this.getClient(uri);
    if (client.status === 'wait') {
      await client.connect();
    }

    const MAX_KEYS = 100;
    const collectedKeys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await client.scan(cursor, 'COUNT', 20);
      cursor = nextCursor;
      for (const key of batch) {
        if (collectedKeys.length >= MAX_KEYS) break;
        collectedKeys.push(key);
      }
    } while (cursor !== '0' && collectedKeys.length < MAX_KEYS);

    const result: RedisKeyInfo[] = [];

    for (const key of collectedKeys) {
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
        } else if (type === 'zset') {
          const card = await client.zcard(key);
          valuePreview = `{ ${card} sorted members }`;
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

    const parts = parseRedisCommandLine(commandLine);
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
      // G3: safe SCAN-based KEYS replacement — never blocks the server
      const pattern = args[0] || '*';
      const found: string[] = [];
      let cur = '0';
      do {
        const [nextCur, batch] = await client.scan(cur, 'MATCH', pattern, 'COUNT', 20);
        cur = nextCur;
        found.push(...batch);
      } while (cur !== '0' && found.length < 200);
      res = found;
    } else if (cmd === 'hgetall' && args[0]) {
      res = await client.hgetall(args[0]);
    } else if (cmd === 'hget' && args[0] && args[1]) {
      res = await client.hget(args[0], args[1]);
    } else if (cmd === 'lrange' && args[0]) {
      const start_ = parseInt(args[1] || '0', 10);
      const stop_ = parseInt(args[2] || '-1', 10);
      res = await client.lrange(args[0], start_, stop_);
    } else if (cmd === 'smembers' && args[0]) {
      res = await client.smembers(args[0]);
    } else if (cmd === 'zrange' && args[0]) {
      const start_ = parseInt(args[1] || '0', 10);
      const stop_ = parseInt(args[2] || '-1', 10);
      res = await client.zrange(args[0], start_ as any, stop_ as any);
    } else if (cmd === 'ttl' && args[0]) {
      res = await client.ttl(args[0]);
    } else if (cmd === 'type' && args[0]) {
      res = await client.type(args[0]);
    } else if (cmd === 'info') {
      res = await client.info(args[0]);
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
