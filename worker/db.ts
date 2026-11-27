import type { Env } from './env';
import { hasLlmKey } from './providers';
import type {
  Campaign,
  Format,
  Lang,
  Post,
  PostStatus,
  Settings,
  Slide,
  Tone,
  TrailStep,
} from '../shared/types';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  autopilot INTEGER NOT NULL DEFAULT 1,
  posts_per_day INTEGER NOT NULL DEFAULT 3,
  slots TEXT NOT NULL DEFAULT '["09:30","13:30","19:30"]',
  utc_offset_minutes INTEGER NOT NULL DEFAULT 330,
  default_tone TEXT NOT NULL DEFAULT 'zen',
  default_format TEXT NOT NULL DEFAULT 'reel',
  default_language TEXT NOT NULL DEFAULT 'as',
  auto_continue INTEGER NOT NULL DEFAULT 1,
  seed_topic TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  vision TEXT NOT NULL DEFAULT '',
  ig_user_id TEXT NOT NULL DEFAULT '',
  ig_token TEXT NOT NULL DEFAULT '',
  ig_username TEXT NOT NULL DEFAULT '',
  gh_repo TEXT NOT NULL DEFAULT '',
  gh_token TEXT NOT NULL DEFAULT '',
  last_backup TEXT NOT NULL DEFAULT '',
  last_tick TEXT NOT NULL DEFAULT '',
  llm_model TEXT NOT NULL DEFAULT '',
  image_model TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  tone TEXT NOT NULL,
  format TEXT NOT NULL,
  language TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  hook TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '[]',
  cta TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  visual_prompt TEXT NOT NULL DEFAULT '',
  visual_brief TEXT NOT NULL DEFAULT '',
  media_key TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  visual_source TEXT NOT NULL DEFAULT '',
  reel_script TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  slides TEXT NOT NULL DEFAULT '[]',
  format TEXT NOT NULL DEFAULT 'reel',
  tone TEXT NOT NULL DEFAULT 'zen',
  language TEXT NOT NULL DEFAULT 'as',
  status TEXT NOT NULL DEFAULT 'draft',
  virality INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  ig_media_id TEXT NOT NULL DEFAULT '',
  permalink TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'topic',
  next_angle TEXT NOT NULL DEFAULT '',
  trail TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  at TEXT NOT NULL
);
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(env: Env): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const statements = SCHEMA.split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await env.DB.prepare(statement).run();
      }
      await ensurePostColumns(env);
      await ensureSettingsColumns(env);
      await env.DB.prepare(
        `INSERT OR IGNORE INTO settings (id, seed_topic, brand, vision) VALUES (1, '', 'Autoreel Zen', 'A calm daily account about one clear idea per post.')`,
      ).run();
      await promoteReelsFirst(env);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Settings columns added after the first release. */
async function ensureSettingsColumns(env: Env): Promise<void> {
  const info = await env.DB.prepare('PRAGMA table_info(settings)').all<{ name: string }>();
  const existing = new Set((info.results ?? []).map((row) => row.name));
  if (existing.has('reels_first')) return;
  await env.DB.prepare('ALTER TABLE settings ADD COLUMN reels_first INTEGER NOT NULL DEFAULT 0').run();
}

/**
 * One-time upgrade for databases created before reels came first: those rows
 * carry the old implicit default ('photo'). Runs once per database, so an owner
 * who deliberately picks another default afterwards keeps it.
 */
async function promoteReelsFirst(env: Env): Promise<void> {
  const row = await env.DB.prepare('SELECT reels_first FROM settings WHERE id = 1').first<{
    reels_first: number;
  }>();
  if (!row || row.reels_first) return;
  await env.DB.prepare(`UPDATE settings SET default_format = 'reel' WHERE id = 1`).run();
  await env.DB.prepare('UPDATE settings SET reels_first = 1 WHERE id = 1').run();
}

/** Columns added after the first release — CREATE TABLE IF NOT EXISTS will not add them. */
async function ensurePostColumns(env: Env): Promise<void> {
  const info = await env.DB.prepare('PRAGMA table_info(posts)').all<{ name: string }>();
  const existing = new Set((info.results ?? []).map((row) => row.name));
  const wanted: Array<[string, string]> = [
    ['reel_script', "TEXT NOT NULL DEFAULT ''"],
    ['video_url', "TEXT NOT NULL DEFAULT ''"],
    ['slides', "TEXT NOT NULL DEFAULT '[]'"],
  ];
  for (const [name, type] of wanted) {
    if (existing.has(name)) continue;
    await env.DB.prepare(`ALTER TABLE posts ADD COLUMN ${name} ${type}`).run();
  }
}

interface SettingsRow {
  autopilot: number;
  posts_per_day: number;
  slots: string;
  utc_offset_minutes: number;
  default_tone: string;
  default_format: string;
  default_language: string;
  auto_continue: number;
  seed_topic: string;
  brand: string;
  vision: string;
  ig_user_id: string;
  ig_token: string;
  ig_username: string;
  gh_repo: string;
  gh_token: string;
  last_backup: string;
  last_tick: string;
  llm_model: string;
  image_model: string;
}

function parseSlots(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
      return parsed.slice(0, 8);
    }
  } catch {
    /* ignore */
  }
  return ['09:30', '13:30', '19:30'];
}

export async function getSettings(env: Env): Promise<Settings> {
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  const r = row as SettingsRow;
  return {
    autopilot: !!r.autopilot,
    postsPerDay: r.posts_per_day,
    slots: parseSlots(r.slots),
    utcOffsetMinutes: r.utc_offset_minutes,
    defaultTone: r.default_tone as Tone,
    defaultFormat: r.default_format as Format,
    defaultLanguage: r.default_language as Lang,
    autoContinue: !!r.auto_continue,
    seedTopic: r.seed_topic,
    brand: r.brand,
    vision: r.vision,
    igUserId: r.ig_user_id,
    igToken: r.ig_token,
    igTokenSet: !!r.ig_token,
    igUsername: r.ig_username,
    ghRepo: r.gh_repo,
    ghToken: r.gh_token,
    ghTokenSet: !!r.gh_token,
    lastBackup: r.last_backup,
    lastTick: r.last_tick,
    llmModel: r.llm_model,
    imageModel: r.image_model,
    passwordProtected: !!(env.APP_PASSWORD || '').trim(),
    aiReady: hasLlmKey(env),
    imageReady: !!((env.IMAGE_API_KEY || env.OPENAI_API_KEY) || '').trim(),
  };
}

type SettingsPatch = Partial<{
  autopilot: boolean;
  postsPerDay: number;
  slots: string[];
  utcOffsetMinutes: number;
  defaultTone: Tone;
  defaultFormat: Format;
  defaultLanguage: Lang;
  autoContinue: boolean;
  seedTopic: string;
  brand: string;
  vision: string;
  igUserId: string;
  igToken: string;
  igUsername: string;
  ghRepo: string;
  ghToken: string;
  lastBackup: string;
  lastTick: string;
  llmModel: string;
  imageModel: string;
}>;

export async function updateSettings(env: Env, patch: SettingsPatch): Promise<void> {
  const columns: Record<string, string> = {
    autopilot: 'autopilot',
    postsPerDay: 'posts_per_day',
    slots: 'slots',
    utcOffsetMinutes: 'utc_offset_minutes',
    defaultTone: 'default_tone',
    defaultFormat: 'default_format',
    defaultLanguage: 'default_language',
    autoContinue: 'auto_continue',
    seedTopic: 'seed_topic',
    brand: 'brand',
    vision: 'vision',
    igUserId: 'ig_user_id',
    igToken: 'ig_token',
    igUsername: 'ig_username',
    ghRepo: 'gh_repo',
    ghToken: 'gh_token',
    lastBackup: 'last_backup',
    lastTick: 'last_tick',
    llmModel: 'llm_model',
    imageModel: 'image_model',
  };
  for (const [key, column] of Object.entries(columns)) {
    if (!(key in patch)) continue;
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    let bound: string | number;
    if (typeof value === 'boolean') bound = value ? 1 : 0;
    else if (Array.isArray(value)) bound = JSON.stringify(value.slice(0, 8));
    else if (typeof value === 'number') bound = value;
    else bound = String(value);
    await env.DB.prepare(`UPDATE settings SET ${column} = ? WHERE id = 1`).bind(bound).run();
  }
}

interface PostRow {
  id: string;
  campaign_id: string;
  topic: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
  alt_text: string;
  visual_prompt: string;
  visual_brief: string;
  media_key: string;
  media_url: string;
  visual_source: string;
  reel_script: string;
  video_url: string;
  slides: string;
  format: string;
  tone: string;
  language: string;
  status: string;
  virality: number;
  scheduled_at: string;
  published_at: string;
  ig_media_id: string;
  permalink: string;
  error: string;
  source: string;
  next_angle: string;
  trail: string;
  created_at: string;
  updated_at: string;
}

export function mapPost(row: PostRow): Post {
  let hashtags: string[] = [];
  let slides: Slide[] = [];
  let trail: TrailStep[] = [];
  try {
    hashtags = JSON.parse(row.hashtags) as string[];
  } catch {
    /* ignore */
  }
  try {
    const parsed = JSON.parse(row.slides ?? '[]') as unknown;
    if (Array.isArray(parsed)) {
      slides = parsed
        .filter((slide): slide is Slide =>
          !!slide && typeof slide === 'object' && typeof (slide as Slide).mediaKey === 'string',
        )
        .slice(0, 10)
        .map((slide) => ({
          mediaKey: slide.mediaKey,
          caption: typeof slide.caption === 'string' ? slide.caption : '',
          altText: typeof slide.altText === 'string' ? slide.altText : '',
        }));
    }
  } catch {
    /* ignore */
  }
  try {
    trail = JSON.parse(row.trail) as TrailStep[];
  } catch {
    /* ignore */
  }
  return {
    id: row.id,
    campaignId: row.campaign_id,
    topic: row.topic,
    title: row.title,
    hook: row.hook,
    caption: row.caption,
    hashtags,
    cta: row.cta,
    altText: row.alt_text,
    visualPrompt: row.visual_prompt,
    visualBrief: row.visual_brief,
    mediaKey: row.media_key,
    mediaUrl: row.media_key ? `/api/media/${row.media_key}` : '',
    visualSource: row.visual_source,
    reelScript: row.reel_script ?? '',
    videoUrl: row.video_url ?? '',
    slides,
    format: row.format as Format,
    tone: row.tone as Tone,
    language: row.language as Lang,
    status: row.status as PostStatus,
    virality: row.virality,
    scheduledAt: row.scheduled_at || null,
    publishedAt: row.published_at || null,
    igMediaId: row.ig_media_id,
    permalink: row.permalink,
    error: row.error,
    source: row.source === 'derived' ? 'derived' : 'topic',
    nextAngle: row.next_angle,
    trail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPosts(env: Env, limit = 120): Promise<Post[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT ?',
  )
    .bind(limit)
    .all<PostRow>();
  return (results ?? []).map(mapPost);
}

export async function getPost(env: Env, id: string): Promise<Post | null> {
  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<PostRow>();
  return row ? mapPost(row) : null;
}

export interface PostInsert {
  id: string;
  campaignId: string;
  topic: string;
  format: Format;
  tone: Tone;
  language: Lang;
  source: 'topic' | 'derived';
  status: PostStatus;
}

export async function insertPost(env: Env, input: PostInsert): Promise<Post> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO posts (id, campaign_id, topic, format, tone, language, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      input.campaignId,
      input.topic,
      input.format,
      input.tone,
      input.language,
      input.source,
      input.status,
      now,
      now,
    )
    .run();
  const post = await getPost(env, input.id);
  if (!post) throw new Error('post insert failed');
  return post;
}

export async function updatePost(
  env: Env,
  id: string,
  patch: Partial<{
    title: string;
    hook: string;
    caption: string;
    hashtags: string[];
    cta: string;
    altText: string;
    visualPrompt: string;
    visualBrief: string;
    mediaKey: string;
    mediaUrl: string;
    visualSource: string;
    reelScript: string;
    videoUrl: string;
    slides: Slide[];
    status: PostStatus;
    virality: number;
    scheduledAt: string | null;
    publishedAt: string | null;
    igMediaId: string;
    permalink: string;
    error: string;
    nextAngle: string;
    trail: TrailStep[];
  }>,
): Promise<Post | null> {
  const columns: Array<[keyof typeof patch, string]> = [
    ['title', 'title'],
    ['hook', 'hook'],
    ['caption', 'caption'],
    ['hashtags', 'hashtags'],
    ['cta', 'cta'],
    ['altText', 'alt_text'],
    ['visualPrompt', 'visual_prompt'],
    ['visualBrief', 'visual_brief'],
    ['mediaKey', 'media_key'],
    ['mediaUrl', 'media_url'],
    ['visualSource', 'visual_source'],
    ['reelScript', 'reel_script'],
    ['videoUrl', 'video_url'],
    ['slides', 'slides'],
    ['status', 'status'],
    ['virality', 'virality'],
    ['scheduledAt', 'scheduled_at'],
    ['publishedAt', 'published_at'],
    ['igMediaId', 'ig_media_id'],
    ['permalink', 'permalink'],
    ['error', 'error'],
    ['nextAngle', 'next_angle'],
    ['trail', 'trail'],
  ];
  const sets: string[] = [];
  const values: Array<string | number> = [];
  for (const [key, column] of columns) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    if (Array.isArray(value)) values.push(JSON.stringify(value));
    else if (value === null) values.push('');
    else if (typeof value === 'number') values.push(value);
    else values.push(String(value));
  }
  sets.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  return getPost(env, id);
}

export async function deletePost(env: Env, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

interface CampaignRow {
  id: string;
  topic: string;
  tone: string;
  format: string;
  language: string;
  count: number;
  status: string;
  source: string;
  created_at: string;
}

export async function insertCampaign(
  env: Env,
  input: {
    id: string;
    topic: string;
    tone: Tone;
    format: Format;
    language: Lang;
    count: number;
    source: string;
  },
): Promise<Campaign> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO campaigns (id, topic, tone, format, language, count, status, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  )
    .bind(input.id, input.topic, input.tone, input.format, input.language, input.count, input.source, now)
    .run();
  return {
    id: input.id,
    topic: input.topic,
    tone: input.tone,
    format: input.format,
    language: input.language,
    count: input.count,
    status: 'active',
    source: input.source,
    createdAt: now,
  };
}

export async function listCampaigns(env: Env, limit = 30): Promise<Campaign[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ?',
  )
    .bind(limit)
    .all<CampaignRow>();
  return (results ?? []).map((row) => ({
    id: row.id,
    topic: row.topic,
    tone: row.tone as Tone,
    format: row.format as Format,
    language: row.language as Lang,
    count: row.count,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  }));
}

export async function logEvent(env: Env, kind: string, message: string): Promise<void> {
  await env.DB.prepare('INSERT INTO events (kind, message, at) VALUES (?, ?, ?)')
    .bind(kind, message.slice(0, 400), new Date().toISOString())
    .run();
}

export async function recentEventCount(env: Env, kind: string, sinceIso: string): Promise<number> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM events WHERE kind = ? AND at >= ?',
  )
    .bind(kind, sinceIso)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
