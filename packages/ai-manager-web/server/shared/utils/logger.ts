import fs from 'fs';
import path from 'path';

export function getLogsDirectory(): string {
  const baseDir = path.resolve(process.cwd(), '.ai-manager', 'logs');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function maskSecrets(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input
    .replace(/(gsk_[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, '$1***')
    .replace(/(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, '$1***')
    .replace(/(Bearer\s+[A-Za-z0-9_.-]{10})[A-Za-z0-9_.-]+/gi, '$1***')
    .replace(/(password["':\s]+)[^,}\s]+/gi, '$1***');
}

export interface LogEntry {
  timestamp: string;
  requestId: string;
  step: string;
  message: string;
  meta?: Record<string, any>;
}

export class AppLogger {
  private static getLogFilePath(): string {
    const logsDir = getLogsDirectory();
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(logsDir, `app-${dateStr}.log`);
  }

  public static writeLog(entry: LogEntry): void {
    const formattedMeta = entry.meta ? ` | data: ${JSON.stringify(entry.meta)}` : '';
    const maskedMsg = maskSecrets(entry.message);
    const maskedMeta = maskSecrets(formattedMeta);
    const logLine = `[${entry.timestamp}] [${entry.requestId}] [${entry.step}] ${maskedMsg}${maskedMeta}\n`;

    // 1. Output to console for live development
    const consoleColor = entry.step.includes('ERROR')
      ? '\x1b[31m'
      : entry.step.includes('RESPONSE')
      ? '\x1b[32m'
      : '\x1b[36m';
    const resetColor = '\x1b[0m';
    console.log(`${consoleColor}[${entry.requestId}] [${entry.step}]${resetColor} ${maskedMsg}${maskedMeta}`);

    // 2. Append to daily rotating log file
    try {
      const filePath = this.getLogFilePath();
      fs.appendFileSync(filePath, logLine, 'utf-8');
    } catch (err) {
      console.error('[Logger] Failed to write to log file:', err);
    }
  }

  public static createRequestLogger(requestId?: string, endpoint?: string) {
    const reqId = requestId || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    return {
      requestId: reqId,
      logStep(step: string, message: string, meta?: Record<string, any>) {
        AppLogger.writeLog({
          timestamp: new Date().toISOString(),
          requestId: reqId,
          step,
          message,
          meta
        });
      },
      logError(step: string, err: any) {
        const errorMsg = err instanceof Error ? `${err.message}\nStack: ${err.stack}` : String(err);
        AppLogger.writeLog({
          timestamp: new Date().toISOString(),
          requestId: reqId,
          step: `${step}_ERROR`,
          message: errorMsg
        });
      },
      logResponse(status: number, summary: string, meta?: Record<string, any>) {
        const duration = Date.now() - startTime;
        AppLogger.writeLog({
          timestamp: new Date().toISOString(),
          requestId: reqId,
          step: 'HTTP_RESPONSE',
          message: `HTTP ${status} (${duration}ms) - ${summary}`,
          meta: { ...(meta || {}), durationMs: duration, endpoint }
        });
      }
    };
  }
}
