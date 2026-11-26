import type { Env } from './env';

const COOKIE = 'arzen_session';
const encoder = new TextEncoder();

function secretOf(env: Env): string {
  return (env.SESSION_SECRET || env.APP_PASSWORD || 'autoreel-zen-dev').trim();
}

export function passwordOf(env: Env): string {
  return (env.APP_PASSWORD || '').trim();
}

export function isOpenMode(env: Env): boolean {
  return passwordOf(env).length === 0;
}

async function hmac(env: Env, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretOf(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function makeSession(env: Env): Promise<string> {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return `${expires}.${await hmac(env, String(expires))}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function isAuthed(env: Env, request: Request): Promise<boolean> {
  if (isOpenMode(env)) return true;
  const token = readCookie(request, COOKIE);
  if (!token) return false;
  const [expiresRaw, signature] = token.split('.');
  const expires = Number(expiresRaw);
  if (!expires || !signature || expires < Date.now()) return false;
  const expected = await hmac(env, String(expires));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function checkPassword(env: Env, password: string): Promise<boolean> {
  return password.trim().length > 0 && password.trim() === passwordOf(env);
}

export function sessionCookieHeader(token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function clearCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function cronAuthorized(env: Env, request: Request): boolean {
  const expected = (env.CRON_SECRET || '').trim();
  if (!expected) return false;
  const provided = request.headers.get('x-cron-secret') || '';
  return provided === expected;
}
