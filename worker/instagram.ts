import type { Settings } from '../shared/types';

const GRAPH = 'https://graph.facebook.com/v21.0';

function captionFor(post: { caption: string; hashtags: string[] }): string {
  const tags = post.hashtags.map((tag) => `#${tag.replace(/^#+/, '')}`).join(' ');
  const body = post.caption.trim();
  const full = tags ? `${body}\n\n${tags}` : body;
  return full.slice(0, 2200);
}

export interface PublishResult {
  ok: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
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
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      username?: string;
      followers_count?: number;
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || `Graph API ${res.status}` };
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
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const statusRes = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(settings.igToken)}`,
    );
    const status = (await statusRes.json()) as { status_code?: string };
    if (status.status_code === 'FINISHED') return true;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') return false;
    await new Promise((resolve) => setTimeout(resolve, attempt < 6 ? 2000 : 5000));
  }
  return false;
}

async function publishContainer(settings: Settings, creationId: string): Promise<PublishResult> {
  const publishRes = await fetch(`${GRAPH}/${settings.igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: settings.igToken }),
  });
  const published = (await publishRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!publishRes.ok || !published.id) {
    return { ok: false, error: published.error?.message || `publish ${publishRes.status}` };
  }

  let permalink = '';
  try {
    const infoRes = await fetch(
      `${GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(settings.igToken)}`,
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

export async function publishToInstagram(
  settings: Settings,
  post: PublishPostShape,
  imageUrl: string,
): Promise<PublishResult> {
  if (!settings.igUserId || !settings.igToken) {
    return { ok: false, error: 'Instagram is not connected' };
  }
  if (!imageUrl.startsWith('http')) {
    return { ok: false, error: 'Media must be publicly reachable over https' };
  }

  const isReel = post.format === 'reel';
  const videoUrl = (post.videoUrl ?? '').trim();

  if (isReel && !videoUrl.startsWith('http')) {
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

    const createRes = await fetch(`${GRAPH}/${settings.igUserId}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !created.id) {
      return { ok: false, error: created.error?.message || `create ${createRes.status}` };
    }

    // Reels take much longer to transcode than a photo, so wait longer for them.
    const ready = await waitForContainer(settings, created.id, isReel ? 30 : 6);
    if (!ready) {
      return {
        ok: false,
        error: isReel
          ? 'Instagram did not finish transcoding the reel in time — check the video URL and try again'
          : 'Instagram did not finish processing the image',
      };
    }

    return await publishContainer(settings, created.id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

export function buildManualPackage(
  post: PublishPostShape,
  imageUrl: string,
): { caption: string; hashtags: string; imageUrl: string; reelScript: string } {
  return {
    caption: post.caption,
    hashtags: post.hashtags.map((tag) => `#${tag.replace(/^#+/, '')}`).join(' '),
    imageUrl,
    reelScript: '',
  };
}
