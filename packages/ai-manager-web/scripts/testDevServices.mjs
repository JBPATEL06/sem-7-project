import { spawn, execSync } from 'child_process';
import http from 'http';

console.log('--- Starting dev.js verification test (all 7 services) ---');
const proc = spawn('node', ['scripts/dev.js'], { cwd: '.' });

proc.stdout.on('data', d => process.stdout.write(d.toString()));
proc.stderr.on('data', d => process.stderr.write(d.toString()));

const ports = [
  { port: 3000, name: 'Express Server', path: '/api/auth/me' },
  { port: 5173, name: 'Vite Client UI', path: '/' },
  { port: 1420, name: 'OpenPencil Studio', path: '/' },
  { port: 8085, name: 'draw.io Editor', path: '/index.html' },
  { port: 1337, name: 'postgres-meta REST', path: '/tables' },
  { port: 8082, name: 'Supabase Studio', path: '/' },
  { port: 3030, name: 'Git Web UI', path: '/' }
];

async function checkPort({ port, name, path }) {
  return new Promise(resolve => {
    const req = http.get({ hostname: 'localhost', port, path, timeout: 5000 }, res => {
      resolve({ port, name, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 500 });
    });
    req.on('error', err => {
      resolve({ port, name, status: null, ok: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, name, status: null, ok: false, error: 'TIMEOUT' });
    });
  });
}

setTimeout(async () => {
  console.log('\n======================================================');
  console.log('🔍 PROOF: Pinging all 7 service ports...');
  console.log('======================================================');
  const results = await Promise.all(ports.map(checkPort));
  console.table(results);

  console.log('\n======================================================');
  console.log('🔍 PROOF: Active Port Listeners from Netstat');
  console.log('======================================================');
  try {
    const netstatOut = execSync('netstat -ano | findstr "LISTENING" | findstr "3000 5173 1420 8085 1337 8082 3030"');
    console.log(netstatOut.toString());
  } catch (e) {
    console.log('Netstat error:', e.message);
  }

  console.log('Shutting down test process tree...');
  spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
  setTimeout(() => process.exit(0), 2000);
}, 16000);
