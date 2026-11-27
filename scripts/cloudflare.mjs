#!/usr/bin/env node
/**
 * One-command Cloudflare setup + deploy.
 *
 *   node scripts/cloudflare.mjs setup    # create D1 + R2, write wrangler.deploy.jsonc
 *   node scripts/cloudflare.mjs deploy    # setup, then wrangler deploy
 *
 * Used by .github/workflows/deploy.yml, so nobody has to build or deploy from a
 * phone. Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the environment
 * (or a prior `wrangler login` on a laptop). NODE only — no extra dependencies.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_CONFIG = resolve(ROOT, 'wrangler.jsonc');
const DEPLOY_CONFIG = resolve(ROOT, 'wrangler.deploy.jsonc');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function say(message) {
  console.log(`[cloudflare] ${message}`);
}

function wranglerBin() {
  const local = resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler');
  return existsSync(local) ? { command: local, prefix: [] } : { command: NPX, prefix: ['--yes', 'wrangler@4'] };
}

/** Run wrangler. Returns combined output; with tolerate=true it never throws. */
function wrangler(args, { tolerate = false } = {}) {
  const { command, prefix } = wranglerBin();
  try {
    return execFileSync(command, [...prefix, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    if (tolerate) return output;
    throw new Error(`wrangler ${args.join(' ')} failed:\n${output || err.message}`);
  }
}

function stripJsonc(text) {
  // wrangler.jsonc is JSON with comments; drop // and /* */ comments plus trailing commas.
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (char === '\n') {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') {
      inLine = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlock = true;
      i += 1;
      continue;
    }
    out += char;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function readBaseConfig() {
  return JSON.parse(stripJsonc(readFileSync(BASE_CONFIG, 'utf8')));
}

function parseJsonLoose(text) {
  const start = text.indexOf('[');
  const objStart = text.indexOf('{');
  const from = start !== -1 && (objStart === -1 || start < objStart) ? start : objStart;
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (from === -1 || end <= from) return null;
  try {
    return JSON.parse(text.slice(from, end + 1));
  } catch {
    return null;
  }
}

function databaseIdFrom(text) {
  const match = text.match(/"database_id"\s*:\s*"([0-9a-fA-F-]{36})"/);
  return match ? match[1] : '';
}

function ensureDatabase(name, currentId) {
  const list = parseJsonLoose(wrangler(['d1', 'list', '--json'], { tolerate: true }));
  if (Array.isArray(list)) {
    const hit = list.find((row) => row && (row.name === name || row.database_name === name));
    if (hit?.uuid || hit?.database_id) return hit.uuid || hit.database_id;
  }
  say(`creating D1 database "${name}"`);
  const created = wrangler(['d1', 'create', name], { tolerate: true });
  const id = databaseIdFrom(created);
  if (id) return id;
  if (/already exists/i.test(created) && currentId) {
    say('D1 database already exists — keeping the id from wrangler.jsonc');
    return currentId;
  }
  throw new Error(
    `Could not resolve the D1 database id for "${name}". Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or paste the id into wrangler.jsonc.\n${created}`,
  );
}

function ensureBucket(name) {
  const created = wrangler(['r2', 'bucket', 'create', name], { tolerate: true });
  if (/already exists/i.test(created)) {
    say(`R2 bucket "${name}" already exists`);
    return;
  }
  if (/created|Success/i.test(created) || !created.trim()) {
    say(`R2 bucket "${name}" ready`);
    return;
  }
  throw new Error(`Could not create the R2 bucket "${name}":\n${created}`);
}

function setup() {
  const config = readBaseConfig();
  const database = config.d1_databases?.[0];
  const bucket = config.r2_buckets?.[0];
  if (!database) throw new Error('wrangler.jsonc has no d1_databases entry');
  if (!bucket) throw new Error('wrangler.jsonc has no r2_buckets entry');

  const id = ensureDatabase(database.database_name, database.database_id);
  ensureBucket(bucket.bucket_name);

  config.d1_databases[0].database_id = id;
  delete config.$schema;
  writeFileSync(DEPLOY_CONFIG, `${JSON.stringify(config, null, 2)}\n`);
  say(`wrote wrangler.deploy.jsonc (d1 ${id.slice(0, 8)}…, r2 ${bucket.bucket_name})`);
}

function deploy() {
  setup();
  say('deploying worker + assets');
  const output = wrangler(['deploy', '--config', DEPLOY_CONFIG]);
  process.stdout.write(output);
  const url = output.match(/https:\/\/[^\s]+\.workers\.dev/);
  if (url) say(`live at ${url[0]}`);
  say('remember: wrangler secret put APP_PASSWORD (and CRON_SECRET) once — the deploy does not create secrets');
}

if (process.platform === 'android') {
  console.error(
    '[cloudflare] Cloudflare deploy needs a machine with a workerd binary. Android/Termux has none.\n' +
      'Push to GitHub instead: .github/workflows/deploy.yml builds and deploys for you.\n' +
      'Locally on the phone you can still run: npm install && npm run check',
  );
  process.exit(1);
}

const mode = process.argv[2] ?? 'setup';
try {
  if (mode === 'setup') setup();
  else if (mode === 'deploy') deploy();
  else {
    console.error(`Unknown mode "${mode}". Use: setup | deploy`);
    process.exit(2);
  }
} catch (err) {
  console.error(`[cloudflare] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
