import path from 'path';
import fs from 'fs';
import { getWorkspaceRootDir, AppLogger } from '../../shared/index.js';

export interface OpenPencilMcpConfig {
  name: string;
  command: string;
  args: string[];
  transport: 'stdio' | 'sse';
  url?: string;
  activeBridgePort: number;
}

export function getOpenPencilMcpConfig(): OpenPencilMcpConfig {
  const root = getWorkspaceRootDir();
  const mcpStdioScript = path.resolve(root, 'packages/open-pencil/packages/mcp/dist/stdio.mjs');
  const mcpHttpScript = path.resolve(root, 'packages/open-pencil/packages/mcp/dist/index.mjs');

  return {
    name: 'openpencil',
    command: 'node',
    args: [fs.existsSync(mcpStdioScript) ? mcpStdioScript : mcpHttpScript],
    transport: 'stdio',
    url: 'http://127.0.0.1:7600',
    activeBridgePort: 7600
  };
}

export async function checkOpenPencilMcpBridgeStatus(): Promise<{
  isAvailable: boolean;
  port: number;
  serverScript: string;
  error?: string;
}> {
  const config = getOpenPencilMcpConfig();
  try {
    const res = await fetch(`${config.url}/health`, {
      signal: AbortSignal.timeout(1500)
    });
    return {
      isAvailable: res.ok,
      port: config.activeBridgePort,
      serverScript: config.args[0]
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      port: config.activeBridgePort,
      serverScript: config.args[0],
      error: err.message
    };
  }
}
