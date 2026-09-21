import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';

console.log('[dev-launcher] Starting Vite Client and Express Server...');

const client = isWin
  ? spawn('cmd.exe', ['/c', 'npx vite'], { cwd: webDir, stdio: 'inherit' })
  : spawn('npx', ['vite'], { cwd: webDir, stdio: 'inherit' });

const server = isWin
  ? spawn('cmd.exe', ['/c', 'npx tsx server/index.ts'], { cwd: webDir, stdio: 'inherit' })
  : spawn('npx', ['tsx', 'server/index.ts'], { cwd: webDir, stdio: 'inherit' });

function handleExit(code, service) {
  console.log(`[dev-launcher] ${service} exited with code ${code}`);
  client.kill();
  server.kill();
  process.exit(code || 0);
}

client.on('exit', (code) => handleExit(code, 'Vite Client'));
server.on('exit', (code) => handleExit(code, 'Express Server'));

process.on('SIGINT', () => {
  client.kill();
  server.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  client.kill();
  server.kill();
  process.exit(0);
});
