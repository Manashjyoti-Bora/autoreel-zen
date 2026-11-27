import type { Env } from './env';
import type { Format, Settings, Tone } from '../shared/types';
import { fetchWithTimeout, providerCandidates } from './providers';

/**
 * Paste-a-link inspiration engine.
 *
 * Reads the public text of an Instagram post (best effort — Instagram blocks
 * many datacenter IPs) and turns it into original angles. It never returns the
 * original caption as something to repost: the point is "inspiration, then your
 * own version".
 */

export type InspirationSource = 'live' | 'mirror' | 'caption' | 'link';

export interface InspirationIdea {
  angle: string;
  topic: string;
  hook: string;
  why: string;
  tone: Tone;
  format: Format;
}

export interface InspirationResult {
  ok: boolean;
  link: string;
  shortcode: string;
  kind: 'post' | 'reel' | 'tv' | 'unknown';
  author: string;
  caption: string;
  source: InspirationSource;
  engine: 'ai' | 'offline';
  note: string;
  keywords: string[];
  ideas: InspirationIdea[];
}

const LINK_RE =
  /(?:instagram\.com|instagr\.am)\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/i;

export interface ParsedLink {
  ok: boolean;
  kind: 'post' | 'reel' | 'tv' | 'unknown';
  shortcode: string;
  url: string;
  error?: string;
}

export function parseInstagramLink(raw: string): ParsedLink {
  const input = (raw || '').trim();
  if (!input) return { ok: false, kind: 'unknown', shortcode: '', url: '', error: 'Paste a post link first' };
  const match = input.match(LINK_RE);
  if (!match) {
    return {
      ok: false,
      kind: 'unknown',
      shortcode: '',
      url: '',
      error: 'That does not look like an Instagram post, reel or IGTV link',
    };
  }
  const kind = match[1].toLowerCase().startsWith('reel')
    ? 'reel'
    : match[1].toLowerCase() === 'tv'
      ? 'tv'
      : 'post';
  const shortcode = match[2];
  const path = kind === 'reel' ? 'reel' : kind === 'tv' ? 'tv' : 'p';
  return { ok: true, kind, shortcode, url: `https://www.instagram.com/${path}/${shortcode}/` };
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractCaption(html: string): { caption: string; author: string } {
  let caption = '';
  let author = '';

  const captionJson = html.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (captionJson) caption = decodeJsonString(captionJson[1]);

  if (!caption) {
    const alt = html.match(/"accessibility_caption"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (alt) caption = decodeJsonString(alt[1]);
  }

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    const text = decodeEntities(tidy(title[1]));
    const onInstagram = text.match(/^(.*?)\s+on Instagram:\s*[“"']([\s\S]*)[”"']\s*$/);
    if (onInstagram) {
      author = author || onInstagram[1].trim();
      if (!caption) caption = onInstagram[2];
    } else if (!caption) {
      caption = text;
    }
  }

  if (!caption) {
    const desc = html.match(/<meta[^>]+(?:property|name)="(?:og:)?description"[^>]+content="([^"]*)"/i);
    if (desc) caption = decodeEntities(desc[1]);
  }

  if (!author) {
    const owner = html.match(/"owner"\s*:\s*\{[^}]*"username"\s*:\s*"([^"]+)"/);
    if (owner) author = owner[1];
  }
  if (!author) {
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i);
    if (ogTitle) {
      const named = decodeEntities(ogTitle[1]).match(/^(.*?)\s+on Instagram/);
      if (named) author = named[1].trim();
    }
  }

  // Instagram's own boilerplate is not content.
  caption = tidy(caption)
    .replace(/^(Log in|Sign up|Create an account|See Instagram photos and videos)[^\n]*/gim, '')
    .replace(/\b(Log in to like or comment|See more posts from|View this post on Instagram)\b.*$/gim, '')
    .trim();

  return { caption: caption.slice(0, 2400), author: author.slice(0, 80) };
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
    },
    timeoutMs,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Read the public post. Two independent sources, then give up honestly. */
export async function readPost(parsed: ParsedLink): Promise<{
  caption: string;
  author: string;
  source: InspirationSource;
  note: string;
}> {
  const attempts: string[] = [];
  try {
    const html = await fetchText(`${parsed.url}embed/captioned/`, 12_000);
    const { caption, author } = extractCaption(html);
    if (caption.length >= 25) {
      return {
        caption,
        author,
        source: 'live',
        note: `Read the public embed page${author ? ` of @${author}` : ''} — real text, not a guess.`,
      };
    }
    attempts.push('embed page had no caption text');
  } catch (err) {
    attempts.push(`embed: ${err instanceof Error ? err.message : 'failed'}`);
  }

  try {
    const mirror = await fetchText(`https://r.jina.ai/${parsed.url}`, 14_000);
    const lines = mirror
      .split('\n')
      .map((line) => line.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim())
      .filter((line) => line.length > 24)
      .filter((line) => !/^(title|url source|markdown content|published time|warning)\b/i.test(line))
      .filter((line) => !/(log in|sign up|instagram|see more|watch on|followers|following)/i.test(line));
    const joined = tidy(lines.slice(0, 12).join('\n')).slice(0, 1800);
    if (joined.length >= 40) {
      return {
        caption: joined,
        author: '',
        source: 'mirror',
        note: 'Read through a text mirror — approximate, check it before using it.',
      };
    }
    attempts.push('mirror had no usable text');
  } catch (err) {
    attempts.push(`mirror: ${err instanceof Error ? err.message : 'failed'}`);
  }

  return {
    caption: '',
    author: '',
    source: 'link',
    note: `Instagram did not serve this post to a server (${attempts.slice(0, 2).join(' · ')}). Paste the caption text below and the swarm will still riff on it.`,
  };
}

const STOP = new Set(
  `the and for with that this from your you are was have has not but they them their what when who how all can will just about into over more most some very then than out its our his her she him been were also like get got one two new now day days today life people make made time good really every still because while after before only even much many such these those there here where which would could should being between other another again doing done does did had having myself yourself himself herself itself ourselves themselves thing things want wants need needs know knows feel feels look looks good great best better work works way ways world just keep keeps lot lots little bit never always everyone someone something anything everything nothing say says said go goes going come comes came take takes took give gives gave us our ours we our's im ive dont cant wont thats whats lets let us use used using via amp https http www com org net io ai app apps yesterday today tomorrow morning mornings evening night nights week weeks month months year years hour hours minute minutes second seconds ago later now still even`.split(
    /\s+/,
  ),
);

export function keywordsOf(text: string, limit = 8): string[] {
  const counts = new Map<string, { word: string; n: number }>();
  const words = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu) ?? [];
  for (const raw of words) {
    const word = raw.replace(/[’']s$/, '');
    if (word.length < 3 || word.length > 24) continue;
    if (STOP.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    const seen = counts.get(word);
    if (seen) seen.n += 1;
    else counts.set(word, { word, n: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || b.word.length - a.word.length || a.word.localeCompare(b.word))
    .slice(0, limit)
    .map((entry) => entry.word);
}

const TONE_ROTATION: Tone[] = ['zen', 'bold', 'poetic', 'story', 'gyaan', 'meme'];
const FORMAT_ROTATION: Format[] = ['reel', 'photo', 'quote', 'reel', 'carousel'];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Template = (subject: string) => Omit<InspirationIdea, 'tone' | 'format'>;

const TEMPLATES: Template[] = [
  (s) => ({
    angle: 'The honest counter-take',
    topic: `${s}: the take nobody posts`,
    hook: `Everyone says the same thing about ${s}. Here is the part they skip.`,
    why: 'Contrarian angles earn saves and arguments — both push reach.',
  }),
  (s) => ({
    angle: 'A small true story',
    topic: `A small ${s} story from yesterday`,
    hook: `Yesterday ${s} taught me one thing I did not expect.`,
    why: 'A specific moment reads as real, which is what the algorithm rewards.',
  }),
  (s) => ({
    angle: 'The 3-minute version',
    topic: `The 3-minute ${s} routine`,
    hook: `Three minutes on ${s}. That is the whole method.`,
    why: 'Tiny actionable posts get shared because they are easy to try today.',
  }),
  (s) => ({
    angle: 'Five quiet rules',
    topic: `Five quiet rules for ${s}`,
    hook: `Five rules for ${s}. None of them are about working harder.`,
    why: 'Numbered lists read fast in the feed and invite people to save.',
  }),
  (s) => ({
    angle: 'The question nobody asks',
    topic: `The question nobody asks about ${s}`,
    hook: `Nobody asks this about ${s}. It changes everything.`,
    why: 'A question in the hook pulls comments, and comments are reach.',
  }),
  (s) => ({
    angle: 'The myth that keeps you stuck',
    topic: `The ${s} myth that keeps you stuck`,
    hook: `That ${s} advice is not wrong. It is just incomplete.`,
    why: 'Naming a widely believed myth makes people tag a friend.',
  }),
  (s) => ({
    angle: 'Local, not generic',
    topic: `${s}, the Assamese way`,
    hook: `How we actually do ${s} here in Assam.`,
    why: 'Local specificity is the one thing a global account cannot copy.',
  }),
];

export function offlineIdeas(shortcode: string, keywords: string[], caption: string): InspirationIdea[] {
  const anchors = keywords.length ? keywords : ['this idea'];
  const seed = hash(shortcode + caption.slice(0, 120));
  const ideas: InspirationIdea[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 5; i += 1) {
    let index = (seed + i * 3) % TEMPLATES.length;
    while (used.has(index) && used.size < TEMPLATES.length) index = (index + 1) % TEMPLATES.length;
    used.add(index);
    const subject = anchors[i % anchors.length].replace(/^./, (char) => char.toUpperCase());
    const base = TEMPLATES[index](subject);
    ideas.push({
      ...base,
      tone: TONE_ROTATION[(seed + i) % TONE_ROTATION.length],
      format: FORMAT_ROTATION[(seed + i) % FORMAT_ROTATION.length],
    });
  }
  return ideas;
}

function coerceTone(value: unknown, fallback: Tone): Tone {
  const tones: Tone[] = ['zen', 'bold', 'poetic', 'meme', 'story', 'gyaan'];
  return tones.includes(value as Tone) ? (value as Tone) : fallback;
}

function coerceFormat(value: unknown, fallback: Format): Format {
  const formats: Format[] = ['reel', 'photo', 'carousel', 'quote'];
  return formats.includes(value as Format) ? (value as Format) : fallback;
}

async function aiIdeas(
  env: Env,
  settings: Settings,
  input: { caption: string; keywords: string[]; author: string },
): Promise<{ ideas: InspirationIdea[]; model: string } | null> {
  const candidates = providerCandidates(env, settings);
  if (!candidates.length) return null;

  const system =
    'You are the insight department of an Instagram content swarm. ' +
    'You read a real post and invent ORIGINAL angles inspired by it. ' +
    'Never reuse the original wording, never suggest reposting. Return ONLY valid JSON.';

  const user = `Here is the public text of an Instagram post${input.author ? ` by @${input.author}` : ''}:
"""
${input.caption.slice(0, 1500)}
"""

Keywords detected: ${input.keywords.join(', ') || 'none'}

Give 5 genuinely different angles this account could post in its own voice.
Rules:
- Each angle must be a new idea, not a rewrite of the original caption.
- Do not copy sentences. Do not name the original creator.
- "topic" must be a short brief (max 12 words) that works as a post topic.
- "hook" is one scroll-stopping first line, max 90 characters, no clickbait lies.
- "why" explains in max 14 words why this angle can travel.
- tone must be one of: zen, bold, poetic, meme, story, gyaan.
- format must be one of: reel, photo, carousel, quote. Prefer reel when the original was a reel.
- No promises of guaranteed virality, income, or medical results.

Return JSON: { "ideas": [ { "angle": "", "topic": "", "hook": "", "why": "", "tone": "", "format": "" } ] }`;

  for (const provider of candidates) {
    try {
      const res = await fetchWithTimeout(
        `${provider.base}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${provider.key}`,
            ...(provider.headers ?? {}),
          },
          body: JSON.stringify({
            model: provider.model,
            temperature: 0.85,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        },
        20_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('empty response');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('no json');
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { ideas?: unknown };
      if (!Array.isArray(parsed.ideas)) throw new Error('no ideas array');
      const ideas: InspirationIdea[] = [];
      for (const entry of parsed.ideas.slice(0, 6)) {
        const item = entry as Record<string, unknown>;
        const topic = typeof item.topic === 'string' ? item.topic.trim() : '';
        const hook = typeof item.hook === 'string' ? item.hook.trim() : '';
        if (!topic || !hook) continue;
        ideas.push({
          angle: (typeof item.angle === 'string' ? item.angle : 'Fresh angle').slice(0, 80),
          topic: topic.slice(0, 120),
          hook: hook.slice(0, 180),
          why: (typeof item.why === 'string' ? item.why : '').slice(0, 140),
          tone: coerceTone(item.tone, 'zen'),
          format: coerceFormat(item.format, 'reel'),
        });
      }
      if (ideas.length >= 3) return { ideas: ideas.slice(0, 5), model: `${provider.id}/${provider.model}` };
      throw new Error('too few usable ideas');
    } catch {
      /* next provider */
    }
  }
  return null;
}

export async function inspire(
  env: Env,
  settings: Settings,
  input: { link: string; caption?: string },
): Promise<InspirationResult> {
  const parsed = parseInstagramLink(input.link);
  if (!parsed.ok) {
    return {
      ok: false,
      link: input.link,
      shortcode: '',
      kind: 'unknown',
      author: '',
      caption: '',
      source: 'link',
      engine: 'offline',
      note: parsed.error ?? 'Invalid link',
      keywords: [],
      ideas: [],
    };
  }

  const manual = (input.caption ?? '').trim();
  let caption = '';
  let author = '';
  let source: InspirationSource = 'link';
  let note = '';

  if (manual.length >= 8) {
    caption = manual.slice(0, 2400);
    source = 'caption';
    note = 'Using the caption you pasted — that is the most reliable input of all.';
  } else {
    const read = await readPost(parsed);
    caption = read.caption;
    author = read.author;
    source = read.source;
    note = read.note;
  }

  const keywords = keywordsOf(`${caption} ${manual}`);
  const fallback = offlineIdeas(parsed.shortcode, keywords, caption);

  let ideas = fallback;
  let engine: 'ai' | 'offline' = 'offline';
  let engineNote = caption
    ? `Rules-based angles from ${keywords.slice(0, 3).join(', ') || 'the post'} — add a free model key for sharper ideas.`
    : 'Rules-based angles. Paste the caption for a much closer riff.';

  if (caption.length >= 20) {
    const ai = await aiIdeas(env, settings, { caption, keywords, author });
    if (ai) {
      ideas = ai.ideas;
      engine = 'ai';
      engineNote = `Model-written angles · ${ai.model}`;
    }
  }

  return {
    ok: true,
    link: parsed.url,
    shortcode: parsed.shortcode,
    kind: parsed.kind,
    author,
    caption,
    source,
    engine,
    note: `${note} ${engineNote}`.trim(),
    keywords,
    ideas,
  };
}
