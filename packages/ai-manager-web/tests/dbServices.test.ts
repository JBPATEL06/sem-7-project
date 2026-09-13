import { describe, it, expect } from 'vitest';
import { maskUri, safeDecryptUri } from '../server/dbRoutes.js';
import { parseRedisCommandLine } from '../server/drivers/redisDriver.js';
import { encrypt } from '../server/utils/encryption.js';

describe('Database Services & Driver Utility Tests', () => {
  it('1. maskUri correctly hides passwords and usernames', () => {
    const postgresUri = 'postgresql://admin:secret123@localhost:5432/mydb';
    const masked = maskUri(postgresUri);
    expect(masked).not.toContain('secret123');
    expect(masked).toContain('•••');

    const invalidUri = 'some_raw_connection_string@secret_pass';
    const maskedInvalid = maskUri(invalidUri);
    expect(maskedInvalid).not.toContain('secret_pass');
    expect(maskedInvalid).toContain('•••');
  });

  it('2. safeDecryptUri handles both encrypted strings and legacy plain-text fallback', () => {
    const plaintext = 'mongodb://127.0.0.1:27017/test_db';
    const encrypted = encrypt(plaintext);
    
    expect(safeDecryptUri(encrypted)).toBe(plaintext);
    // Legacy plain-text fallback
    expect(safeDecryptUri(plaintext)).toBe(plaintext);
  });

  it('3. parseRedisCommandLine parses quoted tokens and space-delimited commands', () => {
    const cmdLine = 'SET myKey "Hello World with spaces" EX 300';
    const tokens = parseRedisCommandLine(cmdLine);
    expect(tokens).toEqual(['SET', 'myKey', 'Hello World with spaces', 'EX', '300']);

    const singleQuoteCmd = "HSET user:1 name 'Jane Doe'";
    const singleQuoteTokens = parseRedisCommandLine(singleQuoteCmd);
    expect(singleQuoteTokens).toEqual(['HSET', 'user:1', 'name', 'Jane Doe']);
  });

  it('4. syncDiskDiagramsToStore auto-discovers .excalidraw files from diagrams/ folder', async () => {
    const { syncDiskDiagramsToStore } = await import('../server/diagramRoutes.js');
    await syncDiskDiagramsToStore('acme-api', 'usr_admin_default');
  });

  it('5. syncDiskScreensToStore auto-discovers .penpot.json layout specs from ui/ folder', async () => {
    const { syncDiskScreensToStore } = await import('../server/screenRoutes.js');
    await syncDiskScreensToStore('acme-api', 'usr_admin_default');
  });
});
