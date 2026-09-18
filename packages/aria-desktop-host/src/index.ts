import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const PORT = Number(process.env.ARIA_PORT || 19387);
const HOST = process.env.ARIA_HOST || '127.0.0.1';
const TOKEN = process.env.ARIA_TOKEN || 'aria-session-token';

const rootDir = resolve(process.cwd());
const dshDir = join(rootDir, 'deepseek-harness');
const isDshPresent = existsSync(dshDir);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/healthz' || req.url === '/status') {
    const status = {
      service: 'Aria DSH Desktop Host',
      version: '0.2.0',
      status: 'ready',
      port: PORT,
      pid: process.pid,
      dshRoot: dshDir,
      dshAvailable: isDshPresent,
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
    return;
  }

  if (req.url === '/api/harness/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      harness: 'Aria // 智役：咏叹终端',
      kernel: 'DeepSeek Harness (Cordis Engine)',
      protocol: 'v1.alpha',
      authenticated: true,
      token: TOKEN,
      url: `http://${HOST}:${PORT}`,
      wsUrl: `ws://${HOST}:${PORT}/events`,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  const signal = {
    type: 'ready',
    service: 'dsh-daemon',
    port: PORT,
    host: HOST,
    url: `http://${HOST}:${PORT}`,
    token: TOKEN,
    pid: process.pid,
  };
  console.log(`[ARIA_DSH_DAEMON_READY] ${JSON.stringify(signal)}`);
});

function gracefulShutdown() {
  console.log('[ARIA_DSH_DAEMON] Shutting down server...');
  server.close(() => {
    console.log('[ARIA_DSH_DAEMON] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('message', (msg) => {
  if (msg && msg.type === 'shutdown') {
    gracefulShutdown();
  }
});
