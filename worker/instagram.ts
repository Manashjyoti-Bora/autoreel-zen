import type { Settings } from '../shared/types';

const GRAPH = 'https://graph.facebook.com/v21.0';
const MAX_CAPTION = 2200;
const MAX_TAGS = 30;
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Instagram returns transient errors while a container is being processed.
 * Retry 429 (nothing was processed) and, when asked, 5xx / network hiccups.
 * Publishing is never retried on 5xx — the post may already exist.
 */
async function graphFetch(
  url: string,
  init?: RequestInit,
  options: { attempts?: number; retry5xx?: boolean } = {},
): Promise<Response> {
  const attempts = Math.max(1, options.attempts ?? 1);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(url, init);
      const retryable =
        res.status === 429 || (options.retry5xx === true && RETRY_STATUS.has(res.status));
      if (retryable && attempt < attempts - 1) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        await wait(retryAfter > 0 ? Math.min(retryAfter * 1000, 15_000) : 800 * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await wait(600 * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Instagram network error');
}

function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const clean = tag.replace(/^#+/, '').replace(/\s+/g, '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function captionFor(post: { caption: string; hashtags: string[] }): string {
  const tags = cleanTags(post.hashtags)
    .map((tag) => `#${tag}`)
    .join(' ');
  const body = post.caption.trim();
  const budget = tags ? Math.max(0, MAX_CAPTION - tags.length - 2) : MAX_CAPTION;
  const head = body.slice(0, budget).trimEnd();
  return tags ? `${head}\n\n${tags}`.slice(0, MAX_CAPTION) : head.slice(0, MAX_CAPTION);
}

export interface PublishResult {
  ok: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
  /** Human-readable hint from the Graph API, e.g. "the media is not ready yet". */
  detail?: string;
}

interface GraphError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_msg?: string;
  is_transient?: boolean;
}

function describe(data: { error?: GraphError }, fallback: string): string {
  const error = data.error;
  if (!error) return fallback;
  const parts = [error.error_user_msg || error.message || fallback];
  if (typeof error.code === 'number') parts.push(`code ${error.code}`);
  if (error.is_transient) parts.push('transient');
  return parts.join(' · ');
}

export async function verifyInstagram(
  settings: Settings,
): Promise<{ ok: boolean; username?: string; followers?: number; error?: string }> {
  if (!settings.igUserId || !settings.igToken) {
    return { ok: false, error: 'Instagram user id and access token are required' };
  }
  try {
    const url = new URL(`${GRAPH}/${settings.igUserId}`);
    url.searchParams.set('fields', 'username,followers_count');
    url.searchParams.set('access_token', settings.igToken);
    const res = await graphFetch(url.toString(), undefined, { attempts: 3, retry5xx: true });
    const data = (await res.json()) as {
      username?: string;
      followers_count?: number;
      error?: GraphError;
    };
    if (!res.ok || data.error) {
      return { ok: false, error: describe(data, `Graph API ${res.status}`) };
    }
    return { ok: true, username: data.username, followers: data.followers_count };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

/** Poll a media container until Instagram finishes processing it. */
async function waitForContainer(
  settings: Settings,
  creationId: string,
  attempts: number,
): Promise<{ ready: boolean; status?: string }> {
  let lastStatus = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const statusRes = await graphFetch(
        `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(settings.igToken)}`,
        undefined,
        { attempts: 2, retry5xx: true },
      );
      const status = (await statusRes.json()) as { status_code?: string; status?: string };
      if (status.status_code) lastStatus = status.status_code;
      if (status.status_code === 'FINISHED') return { ready: true, status: lastStatus };
      if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
        return { ready: false, status: lastStatus };
      }
    } catch {
      /* transient — keep polling */
    }
    await wait(attempt < 6 ? 2000 : 5000);
  }
  return { ready: false, status: lastStatus };
}

async function publishContainer(settings: Settings, creationId: string): Promise<PublishResult> {
  // A 5xx here may mean the post already exists, so only 429 is retried.
  const publishRes = await graphFetch(
    `${GRAPH}/${settings.igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: settings.igToken }),
    },
    { attempts: 3 },
  );
  const published = (await publishRes.json()) as { id?: string; error?: GraphError };
  if (!publishRes.ok || !published.id) {
    return { ok: false, error: describe(published, `publish ${publishRes.status}`) };
  }

  let permalink = '';
  try {
    const infoRes = await graphFetch(
      `${GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(settings.igToken)}`,
      undefined,
      { attempts: 2, retry5xx: true },
    );
    const info = (await infoRes.json()) as { permalink?: string };
    permalink = info.permalink || '';
  } catch {
    /* permalink is optional */
  }

  return { ok: true, mediaId: published.id, permalink };
}

export interface PublishPostShape {
  caption: string;
  hashtags: string[];
  format?: string;
  videoUrl?: string;
}

const VIDEO_EXTENSION = /\.(mp4|mov|m4v)(\?|#|$)/i;

export async function publishToInstagram(
  settings: Settings,
  post: PublishPostShape,
  imageUrl: string,
): Promise<PublishResult> {
  if (!settings.igUserId || !settings.igToken) {
    return { ok: false, error: 'Instagram is not connected' };
  }
  if (!/^https:\/\//i.test(imageUrl)) {
    return { ok: false, error: 'Media must be publicly reachable over https' };
  }

  const isReel = post.format === 'reel';
  const videoUrl = (post.videoUrl ?? '').trim();

  if (isReel && !videoUrl) {
    return {
      ok: false,
      error:
        'A reel needs a public .mp4 URL. The script and cover are ready — add the video URL on the post card, then publish again.',
    };
  }
  if (isReel && !/^https:\/\//i.test(videoUrl)) {
    return { ok: false, error: 'The reel video URL must be https and publicly reachable' };
  }

  try {
    const body: Record<string, string> = isReel
      ? {
          media_type: 'REELS',
          video_url: videoUrl,
          cover_url: imageUrl,
          caption: captionFor(post),
          share_to_feed: 'true',
          access_token: settings.igToken,
        }
      : {
          image_url: imageUrl,
          caption: captionFor(post),
          access_token: settings.igToken,
        };

    const createRes = await graphFetch(
      `${GRAPH}/${settings.igUserId}/media`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      { attempts: 3 },
    );
    const created = (await createRes.json()) as { id?: string; error?: GraphError };
    if (!createRes.ok || !created.id) {
      return { ok: false, error: describe(created, `create ${createRes.status}`) };
    }

    // Reels take much longer to transcode than a photo, so wait longer for them.
    const ready = await waitForContainer(settings, created.id, isReel ? 36 : 8);
    if (!ready.ready) {
      const hint = ready.status ? ` (last status: ${ready.status})` : '';
      return {
        ok: false,
        error: isReel
          ? `Instagram did not finish transcoding the reel in time${hint}. Check that the video is a public 9:16 mp4 under 90s, then publish again.`
          : `Instagram did not finish processing the image${hint}`,
        detail: readHint(videoUrl),
      };
    }

    return await publishContainer(settings, created.id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

function readHint(videoUrl: string): string {
  return VIDEO_EXTENSION.test(videoUrl)
    ? 'The URL looks like a video file.'
    : 'The URL has no .mp4/.mov ending — some hosts serve a page instead of the file.';
}

export function buildManualPackage(
  post: PublishPostShape,
  imageUrl: string,
): { caption: string; hashtags: string; imageUrl: string; reelScript: string } {
  return {
    caption: post.caption,
    hashtags: cleanTags(post.hashtags)
      .map((tag) => `#${tag}`)
      .join(' '),
    imageUrl,
    reelScript: '',
  };
}
