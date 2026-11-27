#!/usr/bin/env node
/**
 * Phone / laptop server that needs nothing native.
 *
 * `wrangler dev` cannot run on Android: `workerd` has no arm64-le Termux build.
 * This script does not need it. It serves the already-built client from
 * `dist/client` and forwards `/api/...` and `/images/...` to a deployed Worker,
 * so the interface runs on the phone while the 24x7 backend stays on Cloudflare.
 *
 *   npm run build
 *   AUTOREEL_REMOTE=https://autoreel-zen.<subdomain>.workers.dev npm run serve
 *
 * Environment:
 *   AUTOREEL_REMOTE  origin of the deployed Worker (required for data)
 *   PORT             default 3000
 *   HOST             default 0.0.0.0 so other devices on the LAN can open it
 */
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = resolve('dist/client');
const REMOTE = (process.env.AUTOREEL_REMOTE || '').trim().replace(/\/+$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function isProxied(pathname) {
  return pathname.startsWith('/api') || pathname.startsWith('/images');
}

/** Forward one request to the deployed Worker and stream the answer back. */
function proxy(req, res) {
  if (!REMOTE) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error:
          'AUTOREEL_REMOTE is not set. Start again with AUTOREEL_REMOTE=https://your-worker.workers.dev npm run serve',
      }),
    );
    return;
  }

  let target;
  try {
    target = new URL(REMOTE);
  } catch {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: `AUTOREEL_REMOTE is not a URL: ${REMOTE}` }));
    return;
  }

  const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = { ...req.headers, host: target.host };
  delete headers['accept-encoding'];

  const upstream = send(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.url,
      headers,
    },
    (answer) => {
      res.writeHead(answer.statusCode || 502, answer.headers);
      answer.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: `Worker unreachable: ${err.message}` }));
  });

  req.pipe(upstream);
}

async function readStatic(pathname) {
  const safe = resolve(join(ROOT, decodeURIComponent(pathname)));
  if (safe !== ROOT && !safe.startsWith(ROOT + sep)) return null;
  try {
    const info = await stat(safe);
    if (!info.isFile()) return null;
    return { body: await readFile(safe), type: TYPES[extname(safe).toLowerCase()] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (isProxied(url.pathname)) {
    proxy(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const file = await readStatic(url.pathname === '/' ? '/index.html' : url.pathname);
  if (file) {
    res.writeHead(200, { 'content-type': file.type, 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : file.body);
    return;
  }

  // SPA fallback: unknown paths render the app shell.
  const shell = await readStatic('/index.html');
  if (!shell) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('dist/client not found — run "npm run build" first.\n');
    return;
  }
  res.writeHead(200, { 'content-type': shell.type, 'cache-control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : shell.body);
});

server.listen(PORT, HOST, () => {
  console.log(`AUTOREEL ZEN serving ${ROOT}`);
  console.log(`  local   → http://localhost:${PORT}`);
  console.log(`  network → http://<this-device-ip>:${PORT}`);
  console.log(`  api     → ${REMOTE || '(not set — /api will answer 502)'}`);
});
