import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(webDir, '../..');
const openPencilDir = path.resolve(rootDir, 'packages/open-pencil');

const isWin = process.platform === 'win32';

console.log('================================================================');
console.log('🚀 AI Manager Unified Dev Orchestration (7 Services)');
console.log('   1. Express Server     -> http://localhost:3000');
console.log('   2. Vite Client UI     -> http://localhost:5173');
console.log('   3. OpenPencil Studio  -> http://localhost:1420');
console.log('   4. draw.io Local      -> http://localhost:8085/index.html');
console.log('   5. postgres-meta REST -> http://localhost:1337');
console.log('   6. Supabase Studio    -> http://localhost:8082');
console.log('   7. Git Web UI         -> http://localhost:3030');
console.log('================================================================\n');

const services = [
  {
    name: 'server:3000',
    cmd: isWin ? 'cmd.exe' : 'npx',
    args: isWin ? ['/c', 'npx tsx server/index.ts'] : ['tsx', 'server/index.ts'],
    cwd: webDir
  },
  {
    name: 'client:5173',
    cmd: isWin ? 'cmd.exe' : 'npx',
    args: isWin ? ['/c', 'npx vite'] : ['vite'],
    cwd: webDir
  },
  {
    name: 'openpencil:1420',
    cmd: isWin ? 'cmd.exe' : 'npx',
    args: isWin ? ['/c', 'npx vite --port 1420'] : ['vite', '--port', '1420'],
    cwd: openPencilDir
  },
  {
    name: 'drawio:8085',
    cmd: isWin ? 'cmd.exe' : 'node',
    args: isWin ? ['/c', 'node scripts/services/drawioService.js'] : ['scripts/services/drawioService.js'],
    cwd: webDir
  },
  {
    name: 'postgres-meta:1337',
    cmd: isWin ? 'cmd.exe' : 'npx',
    args: isWin ? ['/c', 'npx tsx scripts/services/postgresMetaService.js'] : ['tsx', 'scripts/services/postgresMetaService.js'],
    cwd: webDir
  },
  {
    name: 'supabase-studio:8082',
    cmd: isWin ? 'cmd.exe' : 'node',
    args: isWin ? ['/c', 'node scripts/services/supabaseStudioService.js'] : ['scripts/services/supabaseStudioService.js'],
    cwd: webDir
  },
  {
    name: 'git-ui:3030',
    cmd: isWin ? 'cmd.exe' : 'node',
    args: isWin ? ['/c', 'node scripts/services/gitUiService.js'] : ['scripts/services/gitUiService.js'],
    cwd: webDir
  }
];

const processes = [];

services.forEach(svc => {
  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: 'true' }
  });

  child.stdout.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => {
      if (l) console.log(`[${svc.name}] ${l}`);
    });
  });

  child.stderr.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => {
      if (l) console.error(`[${svc.name}:err] ${l}`);
    });
  });

  child.on('exit', code => {
    console.log(`[dev-launcher] ${svc.name} process exited with code ${code}`);
  });

  processes.push({ name: svc.name, proc: child });
});

function killAll() {
  console.log('\n[dev-launcher] Shutting down all 7 services...');
  processes.forEach(({ name, proc }) => {
    try {
      if (isWin) {
        spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
      }
    } catch (e) {}
  });
  process.exit(0);
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);
