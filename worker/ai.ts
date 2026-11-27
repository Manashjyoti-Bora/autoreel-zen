import type { Env } from './env';
import type { Format, Lang, Settings, Tone } from '../shared/types';
import { fetchWithTimeout, providerCandidates } from './providers';

export interface Brief {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  visualPrompt: string;
  altText: string;
  cta: string;
  nextAngle: string;
  reelScript: string;
  /** 2–10 slide lines for a carousel; empty for every other format. */
  slides: string[];
}

export interface BriefResult {
  brief: Brief;
  engine: 'ai' | 'offline';
  model: string;
  note: string;
}

const TONE_HINT: Record<Tone, string> = {
  zen: 'calm, grounded, spacious — short lines, no shouting',
  bold: 'direct, confident, punchy — one strong claim per line',
  poetic: 'lyrical, image-heavy, slightly mysterious',
  meme: 'self-aware, playful internet humour without cringe',
  story: 'first-person little story with a small turn',
  gyaan: 'practical insight anyone can apply today',
};

const LANG_HINT: Record<Lang, string> = {
  as: 'Assamese (Bengali script) as the main language, with a short English line for reach',
  en: 'simple, global English',
  hinglish: 'casual Hinglish (Hindi in Latin script mixed with English)',
};

const FORMAT_HINT: Record<Format, string> = {
  reel: 'a 20-30 second vertical reel: a shot list with on-screen text plus a caption whose first line is the hook',
  photo: 'a single image post: hook line + caption + one action',
  carousel: 'a 4-slide carousel: slide-by-slide lines separated by "\\n—\\n"',
  quote: 'a short quotable line as the hero, caption expands it in 2-3 lines',
};

function cleanJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json in model output');
  return body.slice(start, end + 1);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asSlides(value: unknown, fallback: string[]): string[] {
  const list = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 140))
        .filter(Boolean)
    : [];
  const chosen = list.length >= 2 ? list : fallback;
  return chosen.slice(0, 10);
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.replace(/^#+/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function generateBrief(
  env: Env,
  settings: Settings,
  input: { topic: string; tone: Tone; format: Format; language: Lang; recent: string[] },
): Promise<BriefResult> {
  const candidates = providerCandidates(env, settings);
  if (!candidates.length) {
    return {
      brief: offlineBrief(input),
      engine: 'offline',
      model: 'offline-draft-engine',
      note: 'No model key set — add a free key (GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY…) or keep the draft engine',
    };
  }

  const system =
    'You are the copy core of a 1000-agent Instagram content swarm. ' +
    'You write posts that feel human, specific and calm — never generic influencer filler. ' +
    'Return ONLY valid JSON.';

  const user = `Create one Instagram post.
Topic: ${input.topic}
Tone: ${TONE_HINT[input.tone]}
Language: ${LANG_HINT[input.language]}
Format: ${FORMAT_HINT[input.format]}
Brand: ${settings.brand || 'personal'}
Account vision: ${settings.vision || 'one clear idea per post'}
Recent post titles: ${input.recent.length ? input.recent.join(' | ') : 'none yet'}

Rules:
- hook: one scroll-stopping first line, max 90 characters, no clickbait lies.
- caption: 60-140 words, line breaks for breathing room, ends with one clear action.
- hashtags: 10-16 tags, lowercase, no # symbol, mix of broad + niche + local.
- visualPrompt: a detailed text-to-image prompt for a 4:5 editorial image, no text in the image.
- altText: one factual sentence describing the image.
- cta: max 8 words.
- nextAngle: a natural follow-up post idea in max 12 words.
- reelScript: ONLY when the format is reel — 6 lines, one per shot, each written as "0-3s | on-screen text (max 7 words) | what the camera shows". Start at 0s and end by 30s. Empty string for every other format.
- slides: ONLY when the format is carousel — an array of 2-10 slide lines, one sentence each (max 90 characters): slide 1 is the hook, the middle slides each make one point, the last slide carries the action. Empty array for every other format.
- Never promise guaranteed virality, income, or medical results.

JSON keys: title, hook, caption, hashtags, visualPrompt, altText, cta, nextAngle, reelScript, slides.`;

  const failures: string[] = [];
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
            temperature: 0.9,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        },
        22_000,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('empty model response');
      const parsed = JSON.parse(cleanJson(raw)) as Record<string, unknown>;
      const fallback = offlineBrief(input);
      const brief: Brief = {
        title: asString(parsed.title, fallback.title).slice(0, 120),
        hook: asString(parsed.hook, fallback.hook).slice(0, 180),
        caption: asString(parsed.caption, fallback.caption).slice(0, 2200),
        hashtags: asTags(parsed.hashtags),
        visualPrompt: asString(parsed.visualPrompt, fallback.visualPrompt).slice(0, 800),
        altText: asString(parsed.altText, fallback.altText).slice(0, 400),
        cta: asString(parsed.cta, fallback.cta).slice(0, 80),
        nextAngle: asString(parsed.nextAngle, fallback.nextAngle).slice(0, 160),
        reelScript:
          input.format === 'reel'
            ? asString(parsed.reelScript, fallback.reelScript).slice(0, 1400)
            : '',
        slides:
          input.format === 'carousel'
            ? asSlides(parsed.slides, fallback.slides)
            : [],
      };
      if (!brief.hashtags.length) brief.hashtags = fallback.hashtags;
      return {
        brief,
        engine: 'ai',
        model: `${provider.id}/${provider.model}`,
        note: `${provider.label} · ${provider.model}${provider.free ? ' (free tier)' : ''}`,
      };
    } catch (err) {
      failures.push(`${provider.id}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  return {
    brief: offlineBrief(input),
    engine: 'offline',
    model: 'draft-engine',
    note: failures.length
      ? `All ${candidates.length} provider(s) failed (${failures.slice(0, 2).join(' · ')}) — draft engine used`
      : 'Draft engine used',
  };
}

const OPENERS: Record<Lang, string[]> = {
  as: [
    'শান্ত থাকাটোও এটা কৌশল।',
    'আজিৰ কথা, চুটি কৰি কওঁ।',
    'সকলোৱে নোকোৱা কথাটো এটা।',
    'লাহে লাহে, কিন্তু দিশ ঠিক।',
  ],
  en: ['Quiet is a strategy.', 'One honest thing, said simply.', 'Not louder. Clearer.', 'Small, but every day.'],
  hinglish: ['Shaant rehna bhi ek skill hai.', 'Ek chhoti si baat, seedhi si.', 'Dheere chalo, par roz chalo.', 'Simple cheez, strong cheez.'],
};

const CLOSERS: Record<Lang, string[]> = {
  as: ['সেইটোৱেই আজিৰ প্ৰথম পদক্ষেপ হওক।', 'আজি এটা সৰু কাম কৰি চাওক।', 'কাইলৈ মনত পেলাব লাগিব বুলি নাভাবিব।'],
  en: ['Make that the only thing you do today.', 'Do one small version of it now.', 'Save this for the day you need it.'],
  hinglish: ['Aaj bas ek chhota step lo.', 'Ise save karo, kaam aayega.', 'Kal nahi — aaj, ek chhota kaam.'],
};

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function offlineBrief(input: {
  topic: string;
  tone: Tone;
  format: Format;
  language: Lang;
}): Brief {
  const seed = hashOf(input.topic + input.tone);
  const topic = input.topic.trim().replace(/\s+/g, ' ');
  const opener = pick(OPENERS[input.language], seed);
  const closer = pick(CLOSERS[input.language], seed >> 3);
  const bridge =
    input.language === 'as'
      ? 'এইটো মেগিক নহয়, অভ্যাস।'
      : input.language === 'en'
        ? 'This is not magic. It is repetition with attention.'
        : 'Yeh magic nahi hai. Yeh attention ke saath repetition hai.';
  const caption = [
    opener,
    '',
    `${topic} —`,
    bridge,
    '',
    input.language === 'as'
      ? `প্ৰতিদিনে সৰু সৰু ভাৱে ${topic} লৈ এখোজ আগুৱাই যাওক।`
      : input.language === 'en'
        ? `Move one small step closer to ${topic} every single day.`
        : `Roz ${topic} ki taraf ek chhota step lo.`,
    '',
    closer,
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n');

  const baseTags = ['assam', 'dailyinspiration', 'zenmindset', 'minimalaesthetic'];
  const topicTags = topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  return {
    title: `${topic.slice(0, 60)}`,
    hook:
      input.language === 'as'
        ? `${topic} — শান্তভাৱে, প্ৰতিদিনে।`
        : input.language === 'en'
          ? `${topic}. Quietly. Every day.`
          : `${topic} — shaant se, roz.`,
    caption,
    hashtags: [...baseTags, ...topicTags, 'reelsindia', 'quoteoftheday', 'growthmindset', 'assamesequotes', 'slowliving'],
    visualPrompt: `Editorial 4:5 photograph about "${topic}", soft natural window light, muted warm neutrals with one deep accent colour, generous negative space, film grain, calm zen composition, no text, no watermark, shot on 50mm`,
    altText: `A calm editorial photograph illustrating the idea of ${topic}.`,
    cta: input.language === 'as' ? 'আজি এটা কৰি চাওক' : input.language === 'en' ? 'Try it once today' : 'Aaj ek baar karo',
    nextAngle: `A follow-up post answering the first objection about ${topic}`,
    reelScript: input.format === 'reel' ? offlineReelScript(topic, input) : '',
    slides: input.format === 'carousel' ? offlineSlidePlan(topic, input.language) : [],
  };
}

/**
 * Deterministic carousel plan: five slides that each carry one idea, so the
 * carousel can be produced and published without a model key. Slide text is
 * the line the owner would typeset; the generated image is the background.
 */
export function offlineSlidePlan(topic: string, language: Lang): string[] {
  const t = topic.trim().replace(/\s+/g, ' ').slice(0, 70);
  if (language === 'as') {
    return [
      `${t} — ৫খন স্লাইডত, চুটি কৰি`,
      `প্ৰথমতে: ${t} কিয় গুৰুত্বপূৰ্ণ`,
      'দ্বিতীয়তে: যিটো আটাইতকৈ সহজ পদক্ষেপ',
      'তৃতীয়তে: যিটো আপুনি আজি কৰিব পাৰে',
      'শেষত: এটা কথাত ধৰি থাকক — ছেভ কৰি থওক',
    ];
  }
  if (language === 'hinglish') {
    return [
      `${t} — 5 slides mein, seedhi baat`,
      `Pehle: ${t} kyun matter karta hai`,
      'Doosra: sabse aasaan pehla step',
      'Teesra: aaj hi jo kar sakte ho',
      'Aakhir: ek cheez pakdo — save karo',
    ];
  }
  return [
    `${t} — five slides, kept short`,
    `First: why ${t} matters`,
    'Second: the smallest honest first step',
    'Third: the one thing you can do today',
    'Last: hold one line — save this',
  ];
}

/**
 * Deterministic reel script. No video renderer is involved: this is the shot
 * list a human (or a later renderer) follows, so the reel still has a hook,
 * on-screen text and a loop without inventing footage.
 */
export function offlineReelScript(
  topic: string,
  input: { tone: Tone; language: Lang; hook?: string },
): string {
  const t = topic.trim().replace(/\s+/g, ' ').slice(0, 70);
  const hook =
    input.hook ||
    (input.language === 'as'
      ? `${t} — ৩ ছেকেণ্ডতে কওঁ`
      : input.language === 'en'
        ? `${t} — in three seconds`
        : `${t} — teen second mein`);
  const beat =
    input.tone === 'bold'
      ? 'Say the uncomfortable part first. No apology.'
      : input.tone === 'meme'
        ? 'Cut to a deadpan face. Let the silence do the joke.'
        : input.tone === 'story'
          ? 'Start mid-story, like the camera was already rolling.'
          : 'Hold still. One slow push in. Let the frame breathe.';
  const lines = [
    `0-3s | ${hook} | Close vertical shot, face half-lit, text bottom third`,
    `3-7s | ${t} | Hands doing the thing, macro detail, no music drop yet`,
    `7-12s | ${beat} | Same frame, small camera move, text swaps to one word`,
    `12-18s | ${input.language === 'as' ? 'মই এইটো প্ৰতিদিনে নকৰো — কৰো যেতিয়া মন যায়' : input.language === 'en' ? 'I do not do this daily. I do it when it matters.' : 'Main roz nahi karta. Jab zaroori ho tab karta hoon.'} | Walk away from frame, hold empty space`,
    `18-24s | ${input.language === 'as' ? 'সৰু, কিন্তু প্ৰতিবাৰে' : input.language === 'en' ? 'Small, every single time' : 'Chhota, har baar'} | Return to the opening frame — loop point`,
    `24-30s | Save this | End card: one line, no logo animation`,
  ];
  return lines.join('\n');
}

export interface ImageResult {
  bytes: ArrayBuffer;
  contentType: string;
  source: 'ai' | 'stock';
  note: string;
  extension: string;
}

export async function generateImage(
  env: Env,
  settings: Settings,
  prompt: string,
  seedText: string,
): Promise<ImageResult> {
  const key = (env.IMAGE_API_KEY || env.OPENAI_API_KEY || '').trim();
  const base = (env.IMAGE_BASE_URL || env.OPENAI_BASE_URL || 'https://freebuff.com/api/v1/paid').replace(
    /\/+$/,
    '',
  );
  const model = settings.imageModel || 'gpt-image-1';

  if (key) {
    try {
      const res = await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          prompt: `${prompt}. Aspect ratio 4:5, editorial quality, no text, no watermark.`,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });
      if (!res.ok) throw new Error(`image api ${res.status}`);
      const data = (await res.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      const first = data.data?.[0];
      if (first?.b64_json) {
        const binary = atob(first.b64_json);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return {
          bytes: bytes.buffer,
          contentType: 'image/png',
          source: 'ai',
          note: `Generated with ${model}`,
          extension: 'png',
        };
      }
      if (first?.url) {
        const img = await fetch(first.url);
        if (!img.ok) throw new Error('image download failed');
        return {
          bytes: await img.arrayBuffer(),
          contentType: img.headers.get('content-type') || 'image/png',
          source: 'ai',
          note: `Generated with ${model}`,
          extension: 'png',
        };
      }
      throw new Error('empty image response');
    } catch (err) {
      const stock = await stockImage(seedText);
      return { ...stock, note: `Image API failed (${err instanceof Error ? err.message : 'error'}) — stock visual used` };
    }
  }

  const stock = await stockImage(seedText);
  return { ...stock, note: 'Stock visual engine (no image key set)' };
}

async function stockImage(seedText: string): Promise<Omit<ImageResult, 'note'>> {
  const seed = hashOf(seedText).toString(36);
  const prompt = encodeURIComponent(seedText.slice(0, 300));
  const sources = [
    `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1350&nologo=true&seed=${seed}`,
    `https://picsum.photos/seed/${seed}/1080/1350`,
  ];
  let lastError = 'no stock source';
  for (const url of sources) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' }, 18_000);
      if (!res.ok) throw new Error(`stock ${res.status}`);
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1024) throw new Error('stock image too small');
      return {
        bytes,
        contentType: res.headers.get('content-type') || 'image/jpeg',
        source: 'stock',
        extension: 'jpg',
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'stock failed';
    }
  }
  throw new Error(lastError);
}
