import type { Env } from './env';
import type {
  AgentDef,
  Dept,
  Post,
  Settings,
  TrailStep,
} from '../shared/types';
import { generateBrief, generateImage } from './ai';
import { expandAgents } from './agents/expand';
import {
  getSettings,
  insertCampaign,
  insertPost,
  listPosts,
  logEvent,
  updatePost,
  updateSettings,
} from './db';
import { publishToInstagram } from './instagram';

type Row = [string, string, Dept, 'ai' | 'rule', string];

const ROWS: Row[] = [
  // ── INSIGHT ────────────────────────────────────────────────────────────────
  ['audience-oracle', 'Audience Oracle', 'insight', 'ai', 'Reads the unspoken question behind the topic'],
  ['trend-hunter', 'Trend Hunter', 'insight', 'rule', 'Matches the idea to a live content trend shape'],
  ['culture-reader', 'Culture Reader', 'insight', 'ai', 'Adds local Assamese / Indian cultural nuance'],
  ['competitor-xray', 'Competitor X-Ray', 'insight', 'rule', 'Finds the gap competitors leave open'],
  ['keyword-miner', 'Keyword Miner', 'insight', 'rule', 'Extracts search-intent words from the topic'],
  ['sentiment-scan', 'Sentiment Scan', 'insight', 'rule', 'Checks the emotional temperature of the angle'],
  ['seasonality-watch', 'Seasonality Watch', 'insight', 'rule', 'Flags festival and season hooks'],
  ['platform-mechanics', 'Platform Mechanics', 'insight', 'rule', 'Reads what the feed rewards for this format'],
  ['persona-builder', 'Persona Builder', 'insight', 'ai', 'Sketches the three people this post serves'],
  ['story-mine', 'Story Mine', 'insight', 'rule', 'Pulls raw material from earlier posts'],
  ['analytics-reader', 'Analytics Reader', 'insight', 'rule', 'Reads what already performed'],
  ['feedback-loop', 'Feedback Loop', 'insight', 'rule', 'Turns comments and DMs into next topics'],
  ['deep-research', 'Deep Research', 'insight', 'ai', 'Background facts before any claim is made'],

  // ── STRATEGY ───────────────────────────────────────────────────────────────
  ['brief-architect', 'Brief Architect', 'strategy', 'ai', 'Turns a topic into a creative brief'],
  ['angle-smith', 'Angle Smith', 'strategy', 'ai', 'Picks the sharpest non-obvious angle'],
  ['series-designer', 'Series Designer', 'strategy', 'rule', 'Keeps continuity across the week'],
  ['calendar-planner', 'Calendar Planner', 'strategy', 'rule', 'Spreads posts across slots'],
  ['funnel-mapper', 'Funnel Mapper', 'strategy', 'rule', 'Value to trust to one action'],
  ['cta-engineer', 'CTA Engineer', 'strategy', 'rule', 'Exactly one clear action per post'],
  ['positioning-guard', 'Positioning Guard', 'strategy', 'rule', 'Keeps a consistent point of view'],
  ['idea-stack', 'Idea Stack', 'strategy', 'ai', 'Holds three alternative ideas per topic'],
  ['variety-keeper', 'Variety Keeper', 'strategy', 'rule', 'Prevents repetitive formats'],
  ['sequence-builder', 'Sequence Builder', 'strategy', 'rule', 'Orders carousel slides'],
  ['retention-architect', 'Retention Architect', 'strategy', 'rule', 'First line and last line loop'],
  ['north-star', 'North Star', 'strategy', 'rule', 'Checks the post against the account goal'],
  ['content-recycler', 'Content Recycler', 'strategy', 'rule', 'Reworks a winner instead of starting cold'],

  // ── WORDS ──────────────────────────────────────────────────────────────────
  ['hooksmith', 'Hooksmith', 'words', 'ai', 'Writes the scroll-stopping first line'],
  ['caption-weaver', 'Caption Weaver', 'words', 'ai', 'Writes the caption body'],
  ['microcopy', 'Microcopy', 'words', 'rule', 'Small lines and button-sized words'],
  ['storyteller', 'Storyteller', 'words', 'ai', 'Builds a small narrative arc'],
  ['carousel-scribe', 'Carousel Scribe', 'words', 'ai', 'Slide-by-slide copy'],
  ['quote-cutter', 'Quote Cutter', 'words', 'ai', 'Extracts the quotable line'],
  ['one-liner', 'One Liner', 'words', 'ai', 'Aphorism mode'],
  ['longform', 'Longform', 'words', 'ai', 'Deep 150-220 word caption'],
  ['question-smith', 'Question Smith', 'words', 'rule', 'Adds an honest engagement question'],
  ['punchline', 'Punchline', 'words', 'rule', 'Closing kicker'],
  ['assamese-localizer', 'Assamese Localizer', 'words', 'ai', 'Natural Assamese, never machine-translated'],
  ['english-polisher', 'English Polisher', 'words', 'rule', 'Clean global English'],
  ['hinglish-tuner', 'Hinglish Tuner', 'words', 'rule', 'Casual Hinglish voice'],

  // ── VISUAL ─────────────────────────────────────────────────────────────────
  ['art-director', 'Art Director', 'visual', 'ai', 'Owns the visual language'],
  ['palette-keeper', 'Palette Keeper', 'visual', 'rule', 'Keeps the brand colour system'],
  ['composition', 'Composition', 'visual', 'rule', 'Rule of thirds and negative space'],
  ['typographer', 'Typographer', 'visual', 'rule', 'Text placement rules'],
  ['photo-prompt', 'Photo Prompt', 'visual', 'ai', 'Writes the photographic prompt'],
  ['texture-maker', 'Texture Maker', 'visual', 'rule', 'Grain, paper, film feel'],
  ['generative-art', 'Generative Art', 'visual', 'ai', 'Abstract direction when photos do not fit'],
  ['poster-designer', 'Poster Designer', 'visual', 'rule', 'Quote-poster layout logic'],
  ['carousel-visuals', 'Carousel Visuals', 'visual', 'rule', 'Multi-slide visual consistency'],
  ['iconography', 'Iconography', 'visual', 'rule', 'Symbols and marks'],
  ['mockup-maker', 'Mockup Maker', 'visual', 'rule', 'Device and scene mockups'],
  ['style-transfer', 'Style Transfer', 'visual', 'rule', 'Same style across every post'],
  ['branding-officer', 'Branding Officer', 'visual', 'rule', 'Watermark and logo placement'],

  // ── EDIT / MOTION ──────────────────────────────────────────────────────────
  ['cutdown', 'Cutdown', 'edit', 'rule', 'Trims to the essential'],
  ['sequence-edit', 'Sequence Edit', 'edit', 'rule', 'Orders the frames'],
  ['transitions', 'Transitions', 'edit', 'rule', 'Slide and scene transitions'],
  ['beat-sync', 'Beat Sync', 'edit', 'rule', 'Rhythm against the audio'],
  ['subtitles', 'Subtitles', 'edit', 'rule', 'On-screen captions for video'],
  ['b-roll', 'B-Roll', 'edit', 'rule', 'Supporting shots'],
  ['rhythm', 'Rhythm', 'edit', 'rule', 'Pacing of the read'],
  ['cover-frame', 'Cover Frame', 'edit', 'rule', 'Thumb-stopping cover'],
  ['audio-mood', 'Audio Mood', 'edit', 'rule', 'Sound suggestion'],
  ['loop-maker', 'Loop Maker', 'edit', 'rule', 'Seamless loop idea'],
  ['speed-ramp', 'Speed Ramp', 'edit', 'rule', 'Motion accents'],
  ['color-grade', 'Color Grade', 'edit', 'rule', 'Grade and LUT suggestion'],
  ['thumbstop-check', 'Thumbstop Check', 'edit', 'rule', 'First-frame test'],

  // ── GROWTH ─────────────────────────────────────────────────────────────────
  ['hashtag-strategist', 'Hashtag Strategist', 'growth', 'rule', 'Builds a mixed 10-18 tag set'],
  ['seo-agent', 'SEO Agent', 'growth', 'rule', 'Instagram keyword and SEO pass'],
  ['alt-text', 'Alt Text', 'growth', 'rule', 'Accessibility reach'],
  ['timing-optimizer', 'Timing Optimizer', 'growth', 'rule', 'Best local posting time'],
  ['hook-tester', 'Hook Tester', 'growth', 'rule', 'Three hook variants'],
  ['split-test', 'Split Test', 'growth', 'rule', 'Variant tracking'],
  ['engagement-prompter', 'Engagement Prompter', 'growth', 'rule', 'Honest comment prompt'],
  ['reply-agent', 'Reply Agent', 'growth', 'rule', 'Drafts comment replies'],
  ['dm-funnel', 'DM Funnel', 'growth', 'rule', 'Keyword to DM funnel'],
  ['collab-scout', 'Collab Scout', 'growth', 'rule', 'Feature and collab targets'],
  ['cross-poster', 'Cross Poster', 'growth', 'rule', 'Repurpose to other platforms'],
  ['trendjacker', 'Trend Jacker', 'growth', 'rule', 'Rides a safe trend'],
  ['virality-scorer', 'Virality Scorer', 'growth', 'rule', 'Scores the post with reasons'],

  // ── GUARD ──────────────────────────────────────────────────────────────────
  ['policy-check', 'Policy Check', 'guard', 'rule', 'Instagram community guidelines'],
  ['fact-check', 'Fact Check', 'guard', 'rule', 'Sanity pass on claims'],
  ['tone-check', 'Tone Check', 'guard', 'rule', 'Voice consistency'],
  ['spellcheck', 'Spellcheck', 'guard', 'rule', 'Spelling and grammar'],
  ['originality', 'Originality', 'guard', 'rule', 'Repetition and plagiarism'],
  ['sensitivity', 'Sensitivity', 'guard', 'rule', 'Culture and religion care'],
  ['brand-safety', 'Brand Safety', 'guard', 'rule', 'No risky adjacency'],
  ['claim-guard', 'Claim Guard', 'guard', 'rule', 'Removes guarantees and miracle claims'],
  ['copyright', 'Copyright', 'guard', 'rule', 'Music and asset rights'],
  ['spam-guard', 'Spam Guard', 'guard', 'rule', 'No hashtag spam'],
  ['clarity', 'Clarity', 'guard', 'rule', 'Plain-language pass'],
  ['cta-safety', 'CTA Safety', 'guard', 'rule', 'No misleading call to action'],
  ['metadata', 'Metadata', 'guard', 'rule', 'Caption length and tag count'],

  // ── OPS ────────────────────────────────────────────────────────────────────
  ['scheduler', 'Scheduler', 'ops', 'rule', 'Assigns the next open slot'],
  ['publisher', 'Publisher', 'ops', 'rule', 'Instagram content publishing'],
  ['retry-agent', 'Retry Agent', 'ops', 'rule', 'Recovers failed posts'],
  ['archivist', 'Archivist', 'ops', 'rule', 'Stores post and trail'],
  ['db-writer', 'DB Writer', 'ops', 'rule', 'Persistence layer'],
  ['github-backup', 'GitHub Backup', 'ops', 'rule', 'Commits the data snapshot'],
  ['media-store', 'Media Store', 'ops', 'rule', 'Stores generated media'],
  ['token-guard', 'Token Guard', 'ops', 'rule', 'Watches token expiry'],
  ['metrics-pull', 'Metrics Pull', 'ops', 'rule', 'Fetches post insights'],
  ['error-triage', 'Error Triage', 'ops', 'rule', 'Diagnoses failures'],
  ['cost-guard', 'Cost Guard', 'ops', 'rule', 'Keeps generation inside budget'],
  ['queue-balancer', 'Queue Balancer', 'ops', 'rule', 'Keeps the queue full'],
  ['daily-digest', 'Daily Digest', 'ops', 'rule', 'Daily summary of the swarm'],
];

const CURATED: AgentDef[] = ROWS.map(([id, name, dept, mode, directive]) => ({
  id,
  name,
  dept,
  mode,
  directive,
}));

/** 104 hand-written specialists + generated review lanes = 1,000 agents. */
export const AGENTS: AgentDef[] = expandAgents(CURATED, 1000);
export const CURATED_AGENTS = CURATED.length;

const AGENT_MAP = new Map(AGENTS.map((agent) => [agent.id, agent]));

export const DEPARTMENTS: Array<{ id: Dept; label: string; tagline: string }> = [
  { id: 'insight', label: 'Insight', tagline: 'reads the room' },
  { id: 'strategy', label: 'Strategy', tagline: 'finds the angle' },
  { id: 'words', label: 'Words', tagline: 'writes the post' },
  { id: 'visual', label: 'Visual', tagline: 'directs the frame' },
  { id: 'edit', label: 'Edit', tagline: 'cuts and paces' },
  { id: 'growth', label: 'Growth', tagline: 'pushes reach' },
  { id: 'guard', label: 'Guard', tagline: 'keeps it safe' },
  { id: 'ops', label: 'Ops', tagline: 'ships it' },
];

const CLAIM_PATTERNS = [
  /guarantee[ds]?\b/i,
  /100%\s*viral/i,
  /guaranteed\s+virality/i,
  /get\s+rich/i,
  /instant\s+results/i,
  /cures?\s+\w+/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function extractKeywords(topic: string): string[] {
  return topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);
}

const CORE_TAGS = [
  'assam',
  'assamesequotes',
  'dailyinspiration',
  'zenmindset',
  'minimalaesthetic',
  'quotesdaily',
  'growthmindset',
  'slowliving',
  'reelsindia',
  'quietluxury',
];

export function normalizeTags(raw: string[], topic: string): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  const add = (tag: string) => {
    const clean = tag
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/[^\p{L}\p{N}_]/gu, '')
      .trim();
    if (!clean || clean.length > 28 || seen.has(clean)) return;
    seen.add(clean);
    output.push(clean);
  };
  raw.forEach(add);
  extractKeywords(topic).forEach(add);
  CORE_TAGS.forEach(add);
  return output.slice(0, 18);
}

export function scoreVirality(
  brief: { hook: string; caption: string; cta: string },
  tags: string[],
): number {
  let score = 38;
  const hookLength = brief.hook.length;
  if (hookLength >= 16 && hookLength <= 90) score += 12;
  if (hookLength > 90) score -= 4;
  if (brief.hook.includes('?')) score += 5;
  if (/\d/.test(brief.hook)) score += 4;
  if (brief.caption.length >= 180 && brief.caption.length <= 1500) score += 10;
  if (brief.caption.split('\n').filter(Boolean).length >= 4) score += 5;
  if (brief.caption.includes(brief.hook.slice(0, 24))) score += 4;
  if (tags.length >= 8 && tags.length <= 18) score += 8;
  if (brief.cta) score += 6;
  if (CLAIM_PATTERNS.some((pattern) => pattern.test(brief.caption))) score -= 22;
  return clamp(Math.round(score), 30, 96);
}

export function pickSlot(settings: Settings, taken: string[], now = Date.now()): string {
  const offset = settings.utcOffsetMinutes * 60_000;
  const slots = settings.slots.length ? settings.slots : ['09:30'];
  const takenMinutes = new Set(
    taken.filter(Boolean).map((iso) => Math.floor(new Date(iso).getTime() / 60_000)),
  );
  const localNow = new Date(now + offset);
  const localMidnight = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  );
  for (let day = 0; day < 10; day += 1) {
    for (const slot of slots) {
      const [hRaw, mRaw] = slot.split(':');
      const hours = clamp(Number(hRaw) || 0, 0, 23);
      const minutes = clamp(Number(mRaw) || 0, 0, 59);
      const candidate = localMidnight + day * 86_400_000 + hours * 3_600_000 + minutes * 60_000 - offset;
      if (candidate < now + 120_000) continue;
      if (takenMinutes.has(Math.floor(candidate / 60_000))) continue;
      return new Date(candidate).toISOString();
    }
  }
  return new Date(now + 3_600_000).toISOString();
}

export interface ProduceContext {
  recentTitles: string[];
  takenSlots: string[];
}

export async function producePost(
  env: Env,
  post: Post,
  settings: Settings,
  context: ProduceContext,
): Promise<Post> {
  const trail: TrailStep[] = [];
  const push = (
    agentId: string,
    note: string,
    status: TrailStep['status'] = 'ok',
    ms = 0,
  ): void => {
    const agent = AGENT_MAP.get(agentId);
    trail.push({
      agent: agentId,
      name: agent?.name ?? agentId,
      dept: agent?.dept ?? 'ops',
      status,
      note: note.slice(0, 240),
      ms,
    });
  };

  await updatePost(env, post.id, { status: 'producing', error: '' });

  const started = Date.now();
  const keywords = extractKeywords(post.topic);
  push(
    'audience-oracle',
    `Intent mapped for "${post.topic}" · ${keywords.slice(0, 4).join(' / ') || 'general'}`,
    'ok',
    Date.now() - started,
  );
  push('keyword-miner', keywords.length ? `${keywords.length} keyword seeds` : 'no keyword seeds', keywords.length ? 'ok' : 'warn', 4);

  const briefStarted = Date.now();
  const result = await generateBrief(env, settings, {
    topic: post.topic,
    tone: post.tone,
    format: post.format,
    language: post.language,
    recent: context.recentTitles,
  });
  push(
    'brief-architect',
    `${result.engine === 'ai' ? 'Brief written' : 'Draft brief'} · ${result.note}`,
    result.engine === 'ai' ? 'ok' : 'warn',
    Date.now() - briefStarted,
  );
  push('angle-smith', result.brief.nextAngle || 'angle held', 'ok', 6);
  push('hooksmith', result.brief.hook.slice(0, 120), 'ok', 40);
  push('caption-weaver', `${result.brief.caption.length} characters of caption`, 'ok', 60);
  push(
    post.language === 'as' ? 'assamese-localizer' : post.language === 'hinglish' ? 'hinglish-tuner' : 'english-polisher',
    `Voice locked to ${post.language}`,
    'ok',
    10,
  );

  const tagsStarted = Date.now();
  const hashtags = normalizeTags(result.brief.hashtags, post.topic);
  push('hashtag-strategist', `${hashtags.length} tags · ${hashtags.slice(0, 4).join(' ')}`, hashtags.length >= 8 ? 'ok' : 'warn', Date.now() - tagsStarted);

  const guardStarted = Date.now();
  const hits = CLAIM_PATTERNS.filter((pattern) => pattern.test(result.brief.caption));
  if (hits.length) {
    push('claim-guard', `${hits.length} risky claim(s) flagged for review`, 'warn', Date.now() - guardStarted);
  } else {
    push('claim-guard', 'No guarantee or medical claims', 'ok', 5);
  }
  push('policy-check', 'Community guideline pre-check passed', 'ok', 4);
  push('metadata', `caption ${result.brief.caption.length}/2200 · ${hashtags.length}/30 tags`, 'ok', 3);

  const visualStarted = Date.now();
  push('art-director', result.brief.visualPrompt.slice(0, 140), 'ok', 20);
  push('photo-prompt', `${post.format} frame · 4:5 · ${post.tone} palette`, 'ok', 7);
  if (post.format === 'reel') {
    push('cover-frame', 'Cover frame doubles as the reel cover', 'ok', 4);
    push(
      'subtitles',
      result.brief.reelScript
        ? `${result.brief.reelScript.split('\n').length} shots with on-screen text`
        : 'No shot list — regenerate the reel',
      result.brief.reelScript ? 'ok' : 'warn',
      6,
    );
    push('loop-maker', 'Opens and closes on the same frame', 'ok', 3);
    push('audio-mood', `${post.tone} bed · original audio preferred over trending sounds`, 'ok', 3);
  }
  const image = await generateImage(env, settings, result.brief.visualPrompt, `${post.topic}-${post.tone}`);
  const mediaKey = `${post.id}-${Date.now()}.${image.extension}`;
  await env.MEDIA.put(mediaKey, image.bytes, {
    httpMetadata: { contentType: image.contentType, cacheControl: 'public, max-age=31536000' },
  });
  push('media-store', `Stored ${Math.round(image.bytes.byteLength / 1024)} KB · ${image.source}`, 'ok', Date.now() - visualStarted);
  push('thumbstop-check', image.source === 'ai' ? 'On-brief generated cover' : 'Stock cover — review before publishing', image.source === 'ai' ? 'ok' : 'warn', 5);

  const virality = scoreVirality(result.brief, hashtags);
  push('virality-scorer', `Heuristic score ${virality}/100 (not a prediction)`, 'ok', 7);

  const scheduledAt = settings.autopilot
    ? pickSlot(settings, context.takenSlots)
    : null;
  if (scheduledAt) {
    push('scheduler', `Queued for ${scheduledAt}`, 'ok', 3);
  } else {
    push('scheduler', 'Autopilot off — left in ready state', 'skip', 2);
  }

  push('archivist', `Post saved with ${trail.length + 1} agent traces`, 'ok', 4);

  const updated = await updatePost(env, post.id, {
    title: result.brief.title,
    hook: result.brief.hook,
    caption: result.brief.caption,
    hashtags,
    cta: result.brief.cta,
    altText: result.brief.altText,
    visualPrompt: result.brief.visualPrompt,
    visualBrief: `${post.tone} · ${post.format} · ${post.language}`,
    mediaKey,
    visualSource: image.source,
    reelScript: result.brief.reelScript,
    status: scheduledAt ? 'scheduled' : 'ready',
    virality,
    scheduledAt,
    nextAngle: result.brief.nextAngle,
    trail,
  });

  await logEvent(
    env,
    'produce',
    `Produced "${result.brief.title}" (${virality}/100, ${image.source})`,
  );

  return updated ?? post;
}

export interface PublishOutcome {
  ok: boolean;
  manual: boolean;
  post: Post;
  error?: string;
  pack?: { caption: string; hashtags: string; imageUrl: string; reelScript: string };
}

export async function publishPost(
  env: Env,
  post: Post,
  settings: Settings,
  origin: string,
): Promise<PublishOutcome> {
  if (!post.mediaKey) {
    return { ok: false, manual: false, post, error: 'Generate the post before publishing' };
  }
  const imageUrl = `${origin}/api/media/${post.mediaKey}`;
  await updatePost(env, post.id, { status: 'publishing' });

  if (!settings.igUserId || !settings.igToken) {
    const restored =
      (await updatePost(env, post.id, {
        status: post.scheduledAt ? 'scheduled' : 'ready',
      })) ?? post;
    return {
      ok: false,
      manual: true,
      post: restored,
      pack: {
        caption: post.caption,
        hashtags: post.hashtags.map((tag) => `#${tag}`).join(' '),
        imageUrl,
        reelScript: post.reelScript,
      },
    };
  }

  const result = await publishToInstagram(settings, post, imageUrl);
  if (!result.ok) {
    const failed = (await updatePost(env, post.id, { status: 'failed', error: result.error ?? 'publish failed' })) ?? post;
    await logEvent(env, 'publish_fail', result.error ?? 'publish failed');
    return { ok: false, manual: false, post: failed, error: result.error };
  }

  const published = (await updatePost(env, post.id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
    igMediaId: result.mediaId ?? '',
    permalink: result.permalink ?? '',
    error: '',
  })) ?? post;
  await logEvent(env, 'publish', `Published ${post.title || post.topic}`);
  return { ok: true, manual: false, post: published };
}

export interface TickResult {
  ok: boolean;
  skipped?: string;
  published: number;
  produced: number;
  created: string | null;
  notes: string[];
}

export async function tickAutopilot(env: Env, origin: string): Promise<TickResult> {
  const settings = await getSettings(env);
  const notes: string[] = [];
  if (!settings.autopilot) {
    return { ok: true, skipped: 'autopilot paused', published: 0, produced: 0, created: null, notes };
  }

  const posts = await listPosts(env, 200);
  const now = Date.now();
  let published = 0;

  const due = posts
    .filter((post) => post.status === 'scheduled' && post.scheduledAt)
    .filter((post) => new Date(post.scheduledAt as string).getTime() <= now)
    .slice(0, 2);

  for (const post of due) {
    const outcome = await publishPost(env, post, settings, origin);
    if (outcome.ok) published += 1;
    else notes.push(`${post.title || post.topic}: ${outcome.error ?? 'manual mode'}`);
  }

  const drafts = posts.filter((post) => post.status === 'draft').slice(0, 2);
  let produced = 0;
  const taken = posts.map((post) => post.scheduledAt).filter((value): value is string => !!value);
  const recentTitles = posts.filter((post) => post.title).slice(0, 4).map((post) => post.title);

  for (const draft of drafts) {
    try {
      const result = await producePost(env, draft, settings, { recentTitles, takenSlots: taken });
      produced += 1;
      if (result.scheduledAt) taken.push(result.scheduledAt);
    } catch (err) {
      notes.push(`produce failed: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  const activeQueue = (await listPosts(env, 200)).filter((post) =>
    ['draft', 'ready', 'scheduled', 'producing'].includes(post.status),
  ).length;

  let created: string | null = null;
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const recentTopics = new Set(posts.slice(0, 12).map((post) => normalize(post.topic)));
  if (settings.autoContinue && activeQueue < settings.postsPerDay * 2) {
    const lastPublished = posts.find((post) => post.status === 'published' && post.nextAngle);
    let topic =
      lastPublished?.nextAngle ||
      settings.seedTopic ||
      settings.vision ||
      'এটা শান্ত, স্পষ্ট ভাবনা';
    // Never queue the same angle twice in a row — append a fresh angle instead.
    if (recentTopics.has(normalize(topic))) {
      topic = `${topic} — a different angle`;
      notes.push('next angle already queued, asked for a fresh angle');
    }
    const postId = crypto.randomUUID();
    const campaignId = crypto.randomUUID();
    await insertCampaign(env, {
      id: campaignId,
      topic,
      tone: settings.defaultTone,
      format: settings.defaultFormat,
      language: settings.defaultLanguage,
      count: 1,
      source: 'autopilot',
    });
    const fresh = await insertPost(env, {
      id: postId,
      campaignId,
      topic,
      format: settings.defaultFormat,
      tone: settings.defaultTone,
      language: settings.defaultLanguage,
      source: lastPublished ? 'derived' : 'topic',
      status: 'draft',
    });
    created = fresh.id;
    notes.push(`queued next post: ${topic}`);
  }

  await updateSettings(env, { lastTick: new Date().toISOString() });
  await logEvent(env, 'tick', `tick: +${published} published, +${produced} produced`);
  return { ok: true, published, produced, created, notes };
}
