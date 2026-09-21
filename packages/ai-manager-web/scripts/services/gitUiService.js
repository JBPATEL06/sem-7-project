import http from 'http';
import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

const PORT = 3030;
const git = simpleGit(rootDir);

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Local Git Management (Gitea / Git UI)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0d1117; color: #c9d1d9; display: flex; flex-direction: column; height: 100vh; }
    header { background: #161b22; border-bottom: 1px solid #30363d; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .repo-title { font-weight: 600; font-size: 16px; color: #58a6ff; display: flex; align-items: center; gap: 8px; }
    .badge { background: #1f6feb26; color: #58a6ff; font-size: 12px; padding: 2px 8px; border-radius: 12px; border: 1px solid #388bfd4d; }
    #container { flex: 1; padding: 24px; overflow-y: auto; max-width: 1200px; margin: 0 auto; width: 100%; }
    .panel { background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 20px; overflow: hidden; }
    .panel-header { padding: 12px 16px; background: #21262d; border-bottom: 1px solid #30363d; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; }
    .commit-row { padding: 12px 16px; border-bottom: 1px solid #21262d; display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
    .commit-row:last-child { border-bottom: none; }
    .commit-msg { font-weight: 500; color: #f0f6fc; }
    .commit-hash { font-family: monospace; color: #8b949e; background: #21262d; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="repo-title">
      <span>📦</span>
      <span>JBPATEL06 / sem-7-project</span>
      <span class="badge" id="currentBranch">branch: main</span>
    </div>
    <div style="font-size: 13px; color: #8b949e;">Local Git Service (:3030)</div>
  </header>

  <div id="container">
    <div class="panel">
      <div class="panel-header">
        <span>Recent Commits</span>
        <button onclick="loadGitData()" style="background: transparent; border: 1px solid #30363d; color: #c9d1d9; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Refresh</button>
      </div>
      <div id="commitList">
        <div style="padding: 16px; color: #8b949e;">Loading Git history...</div>
      </div>
    </div>
  </div>

  <script>
    async function loadGitData() {
      try {
        const res = await fetch('http://localhost:3030/api/git/log');
        const data = await res.json();
        document.getElementById('currentBranch').innerText = 'branch: ' + (data.branch || 'main');
        const commits = data.all || [];
        const container = document.getElementById('commitList');
        if (commits.length === 0) {
          container.innerHTML = '<div style="padding: 16px; color: #8b949e;">No commits found</div>';
          return;
        }
        container.innerHTML = commits.map(c => \`
          <div class="commit-row">
            <div>
              <div class="commit-msg">\${c.message}</div>
              <div style="font-size: 11px; color: #8b949e; margin-top: 4px;">\${c.author_name} • \${new Date(c.date).toLocaleString()}</div>
            </div>
            <span class="commit-hash">\${c.hash.substring(0, 7)}</span>
          </div>
        \`).join('');
      } catch (e) {
        document.getElementById('commitList').innerHTML = \`<div style="padding: 16px; color: #f85149;">Error loading git: \${e.message}</div>\`;
      }
    }
    window.onload = loadGitData;
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3030'}`);
  if (url.pathname === '/api/git/log') {
    try {
      const log = await git.log({ maxCount: 15 });
      const status = await git.status();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        branch: status.current,
        all: log.all
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(HTML_CONTENT);
});

server.listen(PORT, () => {
  console.log(`[git-ui] Local Git Web UI running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
