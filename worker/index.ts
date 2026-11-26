import { Hono, type Context } from 'hono';
import type { Env } from './env';
import {
  deletePost,
  ensureSchema,
  getPost,
  getSettings,
  insertCampaign,
  insertPost,
  listCampaigns,
  listPosts,
  logEvent,
  updatePost,
  updateSettings,
} from './db';
import {
  checkPassword,
  clearCookieHeader,
  cronAuthorized,
  isAuthed,
  isOpenMode,
  makeSession,
  sessionCookieHeader,
} from './auth';
import { AGENTS, CURATED_AGENTS, DEPARTMENTS, producePost, publishPost, tickAutopilot } from './swarm';
import { providerStatus } from './providers';
import { inspire } from './inspiration';
import { RESOURCES, RESOURCE_KINDS, resourceCounts } from '../shared/resources';
import { verifyInstagram } from './instagram';
import { backupToGitHub } from './github';
import type {
  Bootstrap,
  Campaign,
  Format,
  Lang,
  Post,
  Settings,
  Stats,
  Tone,
} from '../shared/types';

const TONES: Tone[] = ['zen', 'bold', 'poetic', 'meme', 'story', 'gyaan'];
const FORMATS: Format[] = ['reel', 'photo', 'carousel', 'quote'];
const LANGS: Lang[] = ['as', 'en', 'hinglish'];

const app = new Hono<{ Bindings: Env }>();
const api = new Hono<{ Bindings: Env }>();

api.use('*', async (c, next) => {
  await ensureSchema(c.env);
  await next();
});

function originOf(c: Context<{ Bindings: Env }>): string {
  return (c.env.APP_ORIGIN || '').trim() || new URL(c.req.url).origin;
}

function publicSettings(settings: Settings): Settings {
  return { ...settings, igToken: '', ghToken: '' };
}

async function guard(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  if (await isAuthed(c.env, c.req.raw)) return null;
  return c.json({ error: 'unauthorized' }, 401);
}

function localDay(iso: string, offsetMinutes: number): string {
  const shifted = new Date(new Date(iso).getTime() + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function computeStats(posts: Post[], settings: Settings): Stats {
  const now = Date.now();
  const offset = settings.utcOffsetMinutes;
  const active = posts.filter((post) =>
    ['draft', 'ready', 'scheduled', 'producing', 'publishing'].includes(post.status),
  );
  const published = posts.filter((post) => post.status === 'published');
  const scored = posts.filter((post) => post.virality > 0);

  const days = new Set(published.map((post) => localDay(post.publishedAt ?? post.createdAt, offset)));
  const today = localDay(new Date().toISOString(), offset);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00.000Z`);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const upcoming = posts
    .filter((post) => post.status === 'scheduled' && post.scheduledAt)
    .map((post) => new Date(post.scheduledAt as string).getTime())
    .filter((time) => time > now)
    .sort((a, b) => a - b);

  return {
    queue: active.length,
    published: published.length,
    drafts: posts.filter((post) => post.status === 'draft').length,
    failed: posts.filter((post) => post.status === 'failed').length,
    streak,
    avgVirality: scored.length
      ? Math.round(scored.reduce((sum, post) => sum + post.virality, 0) / scored.length)
      : 0,
    nextAt: upcoming.length ? new Date(upcoming[0]).toISOString() : null,
    todayCount: published.filter((post) => localDay(post.publishedAt ?? post.createdAt, offset) === today)
      .length,
  };
}

async function bootstrapData(c: Context<{ Bindings: Env }>): Promise<Bootstrap> {
  const settings = await getSettings(c.env);
  const [posts, campaigns] = await Promise.all([listPosts(c.env, 150), listCampaigns(c.env, 40)]);
  return {
    authed: true,
    needsPassword: false,
    openMode: isOpenMode(c.env),
    serverTime: new Date().toISOString(),
    agents: AGENTS,
    settings: publicSettings(settings),
    posts,
    campaigns,
    stats: computeStats(posts, settings),
  };
}

api.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { password?: string };
  if (isOpenMode(c.env) || (await checkPassword(c.env, body.password ?? ''))) {
    const token = await makeSession(c.env);
    return c.json({ ok: true, openMode: isOpenMode(c.env) }, 200, {
      'set-cookie': sessionCookieHeader(token),
    });
  }
  return c.json({ ok: false, error: 'Wrong password' }, 401);
});

api.post('/logout', (c) => {
  return c.json({ ok: true }, 200, { 'set-cookie': clearCookieHeader() });
});

api.get('/bootstrap', async (c) => {
  if (!(await isAuthed(c.env, c.req.raw))) {
    return c.json({
      authed: false,
      needsPassword: true,
      openMode: isOpenMode(c.env),
      serverTime: new Date().toISOString(),
      agents: AGENTS,
      settings: null,
      posts: [],
      campaigns: [],
      stats: null,
    });
  }
  return c.json(await bootstrapData(c));
});

api.get('/state', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  return c.json(await bootstrapData(c));
});

api.get('/agents', (c) =>
  c.json({
    agents: AGENTS,
    departments: DEPARTMENTS,
    count: AGENTS.length,
    curated: CURATED_AGENTS,
    generated: AGENTS.length - CURATED_AGENTS,
  }),
);

// Public catalogue of free/open-source building blocks. No secrets, cacheable.
app.get('/api/resources', (c) =>
  c.json(
    {
      resources: RESOURCES,
      kinds: RESOURCE_KINDS,
      counts: resourceCounts(),
      count: RESOURCES.length,
      checkedAt: '2026-11',
    },
    200,
    { 'cache-control': 'public, max-age=3600' },
  ),
);

api.get('/providers', async (c) => {
  const settings = await getSettings(c.env);
  const status = providerStatus(c.env);
  const active = status.providers.find((provider) => provider.configured);
  return c.json({ ...status, active: active?.id ?? null, draftEngine: !active });
});

api.post('/inspiration', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as { link?: string; caption?: string };
  const link = (body.link ?? '').trim();
  if (!link) return c.json({ error: 'Paste an Instagram post link' }, 400);
  if (link.length > 500) return c.json({ error: 'That link is too long' }, 400);
  const settings = await getSettings(c.env);
  const result = await inspire(c.env, settings, { link, caption: body.caption });
  if (!result.ok) return c.json(result, 400);
  await logEvent(
    c.env,
    'remix',
    `${result.kind} ${result.shortcode} → ${result.ideas.length} angles (${result.engine}, ${result.source})`,
  );
  return c.json(result);
});

api.post('/compose', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as {
    topic?: string;
    tone?: Tone;
    format?: Format;
    language?: Lang;
    count?: number;
    source?: 'topic' | 'derived';
  };
  const topic = (body.topic ?? '').trim();
  if (topic.length < 2) return c.json({ error: 'Give the swarm a topic first' }, 400);
  const count = Math.min(5, Math.max(1, Number(body.count) || 1));
  const tone: Tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : 'zen';
  const format: Format = FORMATS.includes(body.format as Format) ? (body.format as Format) : 'photo';
  const language: Lang = LANGS.includes(body.language as Lang) ? (body.language as Lang) : 'as';

  const campaign = await insertCampaign(c.env, {
    id: crypto.randomUUID(),
    topic,
    tone,
    format,
    language,
    count,
    source: body.source === 'derived' ? 'derived' : 'manual',
  });

  const posts: Post[] = [];
  for (let i = 0; i < count; i += 1) {
    posts.push(
      await insertPost(c.env, {
        id: crypto.randomUUID(),
        campaignId: campaign.id,
        topic,
        format,
        tone,
        language,
        source: 'topic',
        status: 'draft',
      }),
    );
  }
  await logEvent(c.env, 'compose', `Campaign "${topic}" with ${count} post(s)`);
  return c.json({ campaign, posts });
});

api.post('/posts/:id/produce', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.json({ error: 'post not found' }, 404);
  const settings = await getSettings(c.env);
  const posts = await listPosts(c.env, 200);
  const takenSlots = posts
    .filter((item) => item.id !== post.id && item.scheduledAt)
    .map((item) => item.scheduledAt as string);
  const recentTitles = posts
    .filter((item) => item.title && item.id !== post.id)
    .slice(0, 4)
    .map((item) => item.title);
  try {
    const result = await producePost(c.env, post, settings, { recentTitles, takenSlots });
    return c.json({ post: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'produce failed';
    await updatePost(c.env, post.id, { status: 'failed', error: message });
    return c.json({ error: message }, 500);
  }
});

api.post('/posts/:id/video', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as { url?: string };
  const url = (body.url ?? '').trim();
  if (url && (!/^https:\/\//i.test(url) || url.length > 800)) {
    return c.json({ error: 'Paste a public https video URL (mp4/mov)' }, 400);
  }
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.json({ error: 'post not found' }, 404);
  const updated = await updatePost(c.env, post.id, { videoUrl: url });
  return c.json({ post: updated });
});

api.get('/posts/:id/reel-kit', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.text('post not found', 404);
  const origin = originOf(c);
  const kit = [
    `# ${post.title || post.topic}`,
    '',
    `Hook: ${post.hook}`,
    `Format: ${post.format} · Tone: ${post.tone} · Language: ${post.language}`,
    `Cover: ${origin}/api/media/${post.mediaKey}`,
    '',
    '## Shot list',
    post.reelScript || '(no script yet — regenerate this post as a reel)',
    '',
    '## Caption',
    post.caption,
    '',
    '## Hashtags',
    post.hashtags.map((tag) => `#${tag}`).join(' '),
    '',
    '## Publish',
    post.videoUrl
      ? `Video: ${post.videoUrl} — press Publish and Instagram posts it as a Reel.`
      : 'Export the shots above as a 9:16 mp4, host it at a public https URL, paste that URL on the post card, then press Publish.',
    '',
    `Generated by AUTOREEL ZEN · ${new Date().toISOString()}`,
  ].join('\n');
  return c.text(kit, 200, {
    'content-type': 'text/markdown; charset=utf-8',
    'content-disposition': `attachment; filename="reel-kit-${post.id.slice(0, 8)}.md"`,
  });
});

api.post('/posts/:id/publish', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.json({ error: 'post not found' }, 404);
  const settings = await getSettings(c.env);
  const outcome = await publishPost(c.env, post, settings, originOf(c));
  return c.json(outcome, outcome.ok || outcome.manual ? 200 : 502);
});

api.post('/posts/:id/mark-posted', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.json({ error: 'post not found' }, 404);
  const updated = await updatePost(c.env, post.id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  });
  return c.json({ post: updated });
});

api.post('/posts/:id/schedule', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as { at?: string };
  const at = body.at ? new Date(body.at) : null;
  if (!at || Number.isNaN(at.getTime())) return c.json({ error: 'invalid date' }, 400);
  const post = await getPost(c.env, c.req.param('id'));
  if (!post) return c.json({ error: 'post not found' }, 404);
  const updated = await updatePost(c.env, post.id, {
    status: 'scheduled',
    scheduledAt: at.toISOString(),
    error: '',
  });
  return c.json({ post: updated });
});

api.delete('/posts/:id', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  await deletePost(c.env, c.req.param('id'));
  return c.json({ ok: true });
});

api.post('/settings', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Parameters<typeof updateSettings>[1] = {};

  if (typeof body.autopilot === 'boolean') patch.autopilot = body.autopilot;
  if (typeof body.autoContinue === 'boolean') patch.autoContinue = body.autoContinue;
  if (body.postsPerDay !== undefined) {
    patch.postsPerDay = Math.min(10, Math.max(1, Number(body.postsPerDay) || 3));
  }
  if (body.utcOffsetMinutes !== undefined) {
    patch.utcOffsetMinutes = Math.min(840, Math.max(-720, Number(body.utcOffsetMinutes) || 330));
  }
  if (Array.isArray(body.slots)) {
    const slots = (body.slots as unknown[])
      .filter((slot): slot is string => typeof slot === 'string')
      .map((slot) => slot.trim())
      .filter((slot) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(slot))
      .map((slot) => (slot.length === 4 ? `0${slot}` : slot))
      .slice(0, 8);
    patch.slots = slots.length ? slots : ['09:30', '13:30', '19:30'];
  }
  if (typeof body.defaultTone === 'string' && TONES.includes(body.defaultTone as Tone)) {
    patch.defaultTone = body.defaultTone as Tone;
  }
  if (typeof body.defaultFormat === 'string' && FORMATS.includes(body.defaultFormat as Format)) {
    patch.defaultFormat = body.defaultFormat as Format;
  }
  if (typeof body.defaultLanguage === 'string' && LANGS.includes(body.defaultLanguage as Lang)) {
    patch.defaultLanguage = body.defaultLanguage as Lang;
  }
  for (const key of ['seedTopic', 'brand', 'vision', 'igUserId', 'igUsername', 'ghRepo', 'llmModel', 'imageModel'] as const) {
    if (typeof body[key] === 'string') patch[key] = (body[key] as string).slice(0, 500);
  }
  if (typeof body.igToken === 'string' && body.igToken.trim()) patch.igToken = body.igToken.trim();
  if (typeof body.ghToken === 'string' && body.ghToken.trim()) patch.ghToken = body.ghToken.trim();

  await updateSettings(c.env, patch);
  return c.json(await bootstrapData(c));
});

api.post('/instagram/verify', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const body = (await c.req.json().catch(() => ({}))) as {
    igUserId?: string;
    igToken?: string;
  };
  const current = await getSettings(c.env);
  const settings: Settings = {
    ...current,
    igUserId: (body.igUserId ?? current.igUserId).trim(),
    igToken: (body.igToken ?? current.igToken).trim(),
  };
  if (body.igUserId || body.igToken) {
    const patch: Parameters<typeof updateSettings>[1] = {};
    if (settings.igUserId) patch.igUserId = settings.igUserId;
    if (settings.igToken) patch.igToken = settings.igToken;
    await updateSettings(c.env, patch);
  }
  const result = await verifyInstagram(settings);
  if (result.ok && result.username) {
    await updateSettings(c.env, { igUsername: result.username });
  }
  return c.json(result);
});

api.post('/backup', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const settings = await getSettings(c.env);
  const [posts, campaigns] = await Promise.all([listPosts(c.env, 200), listCampaigns(c.env, 50)]);
  const result = await backupToGitHub(settings, {
    posts,
    campaigns,
    stats: computeStats(posts, settings),
  });
  if (result.ok) {
    await updateSettings(c.env, { lastBackup: new Date().toISOString() });
    await logEvent(c.env, 'backup', `Snapshot pushed to ${settings.ghRepo}`);
  }
  return c.json(result, result.ok ? 200 : 400);
});

api.get('/export', async (c) => {
  const denied = await guard(c);
  if (denied) return denied;
  const settings = await getSettings(c.env);
  const [posts, campaigns] = await Promise.all([listPosts(c.env, 500), listCampaigns(c.env, 100)]);
  const payload = {
    app: 'autoreel-zen',
    exportedAt: new Date().toISOString(),
    stats: computeStats(posts, settings),
    campaigns,
    posts,
  };
  return c.json(payload, 200, {
    'content-disposition': 'attachment; filename="autoreel-zen.json"',
  });
});

api.post('/autopilot/tick', async (c) => {
  const authed = await isAuthed(c.env, c.req.raw);
  if (!authed && !cronAuthorized(c.env, c.req.raw)) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const result = await tickAutopilot(c.env, originOf(c));
  return c.json(result);
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    app: 'autoreel-zen',
    version: '1.3.0',
    remix: true,
    reels: true,
    agents: AGENTS.length,
    resources: RESOURCES.length,
    providers: providerStatus(c.env).configured,
  }),
);

app.get('/api/media/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.text('not found', 404);
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable',
      etag: object.httpEtag,
    },
  });
});

app.route('/api', api);

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
