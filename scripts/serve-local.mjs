#!/usr/bin/env node
/**
 * Phone / laptop server that needs nothing native.
 *
 * `wrangler dev` cannot run on Android: `workerd` has no arm64-le Termux build.
 * This script does not need it. It serves the already-built client from
 * `dist/client` and forwards `/api/...` and `/images/...` to a deployed Worker,
 * so the interface runs on the phone while the 24x7 backend stays on Cloudflare.
 *
 * The Worker URL is remembered, so the long command is needed only once:
 *
 *   npm run build
 *   npm run serve -- https://autoreel-zen.<subdomain>.workers.dev   # saves + starts
 *   npm run serve                                                   # after that
 *
 * Environment:
 *   AUTOREEL_REMOTE       origin of the deployed Worker (overrides the saved one)
 *   AUTOREEL_REMOTE_FILE  where the URL is saved (default ~/.autoreel-remote)
 *   PORT                  default 3000
 *   HOST                  default 0.0.0.0 so other devices on the LAN can open it
 */
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = resolve('dist/client');
const REMOTE_FILE = process.env.AUTOREEL_REMOTE_FILE || join(homedir(), '.autoreel-remote');

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

/** Accept only a bare http(s) origin — no path, no trailing slash. */
function normalizeRemote(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    return '';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (url.pathname !== '/' || url.search || url.hash) return '';
  return `${url.protocol}//${url.host}`;
}

function parseArgs(argv) {
  const parsed = { remote: '', forget: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--forget') parsed.forget = true;
    else if (arg === '--remote' || arg === '--set-remote') parsed.remote = argv[++i] || '';
    else if (arg.startsWith('--remote=')) parsed.remote = arg.slice('--remote='.length);
    else if (!arg.startsWith('-') && !parsed.remote) parsed.remote = arg;
  }
  return parsed;
}

async function readSavedRemote() {
  try {
    return normalizeRemote(await readFile(REMOTE_FILE, 'utf8'));
  } catch {
    return '';
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(
    [
      'Usage: npm run serve [--] [worker-url]',
      '',
      '  worker-url   https origin of your deployed Worker, e.g.',
      '               https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev',
      '               It is saved, so later runs need no URL.',
      '  --forget     forget the saved URL and exit',
      '',
      `Saved in ${REMOTE_FILE}`,
      'Override with AUTOREEL_REMOTE for a single run.',
    ].join('\n'),
  );
  process.exit(0);
}

if (args.forget) {
  try {
    await writeFile(REMOTE_FILE, '', { mode: 0o600 });
  } catch {
    /* nothing saved */
  }
  console.log(`Forgot the saved Worker URL (${REMOTE_FILE}).`);
  process.exit(0);
}

const supplied = args.remote || process.env.AUTOREEL_REMOTE || '';
let REMOTE = '';
let rememberNote = '';

if (supplied) {
  REMOTE = normalizeRemote(supplied);
  if (!REMOTE) {
    console.error(
      `Not a usable Worker URL: ${supplied}\nUse the bare origin, e.g. https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev`,
    );
    process.exit(1);
  }
  try {
    await writeFile(REMOTE_FILE, `${REMOTE}\n`, { mode: 0o600 });
    rememberNote = `saved for next time in ${REMOTE_FILE}`;
  } catch (err) {
    rememberNote = `could not save the URL (${err instanceof Error ? err.message : 'error'})`;
  }
} else {
  REMOTE = await readSavedRemote();
  if (REMOTE) rememberNote = `remembered from ${REMOTE_FILE}`;
}

/** Forward one request to the deployed Worker and stream the answer back. */
function proxy(req, res) {
  if (!REMOTE) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error:
          'No Worker URL saved yet. Run "npm run serve -- https://your-worker.workers.dev" once, then "npm run serve" works on its own.',
      }),
    );
    return;
  }

  let target;
  try {
    target = new URL(REMOTE);
  } catch {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: `Saved Worker URL is not a URL: ${REMOTE}` }));
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
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const safe = resolve(join(ROOT, decoded));
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
  console.log(`  api     → ${REMOTE || '(not set — /api will answer 502)'}${rememberNote ? ` (${rememberNote})` : ''}`);
  if (REMOTE) console.log('  next time → npm run serve');
});
