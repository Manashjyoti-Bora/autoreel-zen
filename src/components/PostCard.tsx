import { useState } from 'react';
import type { Post } from '@shared/types';
import { api, shortDate } from '../lib/api';
import { Pill } from './ui';

const STATUS_TONE: Record<Post['status'], 'lime' | 'violet' | 'cyan' | 'pink' | 'muted' | 'warn'> = {
  draft: 'muted',
  producing: 'violet',
  ready: 'cyan',
  scheduled: 'lime',
  publishing: 'violet',
  published: 'lime',
  failed: 'pink',
};

export function PostCard({
  post,
  busy,
  onProduce,
  onPublish,
  onDelete,
  onMarkPosted,
  onRefresh,
}: {
  post: Post;
  busy: boolean;
  onProduce: (post: Post) => void;
  onPublish: (post: Post) => void;
  onDelete: (post: Post) => void;
  onMarkPosted: (post: Post) => void;
  onRefresh: () => void;
}) {
  const hasMedia = !!post.mediaUrl;
  const isReel = post.format === 'reel';
  const [videoUrl, setVideoUrl] = useState(post.videoUrl ?? '');
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoNote, setVideoNote] = useState('');

  async function saveVideo() {
    if (savingVideo) return;
    setSavingVideo(true);
    setVideoNote('');
    try {
      await api(`/posts/${post.id}/video`, {
        method: 'POST',
        body: JSON.stringify({ url: videoUrl.trim() }),
      });
      setVideoNote(videoUrl.trim() ? 'Video saved — Publish will post it as a Reel' : 'Video cleared');
      onRefresh();
    } catch (err) {
      setVideoNote(err instanceof Error ? err.message : 'Could not save that URL');
    } finally {
      setSavingVideo(false);
    }
  }

  return (
    <article className={`post-card glass ${busy ? 'is-busy' : ''}`}>
      <div className="post-media">
        {hasMedia ? (
          <img src={post.mediaUrl} alt={post.altText || post.title || post.topic} loading="lazy" />
        ) : (
          <div className="post-media-empty">
            <span>{busy ? 'Rendering…' : 'Not produced yet'}</span>
            <span className="post-media-hint">{post.topic.slice(0, 60)}</span>
          </div>
        )}
        <div className="post-badges">
          <Pill tone={STATUS_TONE[post.status]}>{post.status}</Pill>
          {post.virality ? <Pill tone="muted">{post.virality}/100</Pill> : null}
        </div>
        {post.visualSource === 'stock' ? (
          <span className="post-source">stock visual</span>
        ) : null}
        {isReel ? <span className="post-source reel-badge">reel</span> : null}
      </div>

      <div className="post-body">
        <h3 className="post-title">{post.title || post.topic}</h3>
        {post.hook ? <p className="post-hook">{post.hook}</p> : null}
        {post.caption ? <p className="post-caption">{post.caption}</p> : null}

        <div className="post-tags">
          {post.hashtags.slice(0, 6).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
          {post.hashtags.length > 6 ? <span>+{post.hashtags.length - 6}</span> : null}
        </div>

        <div className="post-meta">
          <span>{post.format}</span>
          <span>{post.tone}</span>
          <span>{post.language}</span>
          <span>{post.scheduledAt ? `⏱ ${shortDate(post.scheduledAt)}` : shortDate(post.createdAt)}</span>
        </div>

        {isReel ? (
          <details className="reel-script">
            <summary>
              Reel script · {post.reelScript ? `${post.reelScript.split('\n').length} shots` : 'not generated yet'}
            </summary>
            <pre>{post.reelScript || 'Regenerate this post as a reel to get the shot list.'}</pre>
          </details>
        ) : null}

        {isReel ? (
          <div className="reel-video">
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="Public https .mp4 — Instagram posts it as a Reel"
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="btn btn-ghost" disabled={savingVideo} onClick={() => void saveVideo()}>
              {savingVideo ? 'Saving…' : 'Save video'}
            </button>
          </div>
        ) : null}
        {videoNote ? <p className="field-note">{videoNote}</p> : null}

        {post.error ? <p className="post-error">{post.error}</p> : null}

        <div className="post-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => onProduce(post)}
          >
            {hasMedia ? 'Regenerate' : 'Produce'}
          </button>
          {isReel ? (
            <a className="btn btn-ghost" href={`/api/posts/${post.id}/reel-kit`}>
              Reel kit
            </a>
          ) : null}
          {post.status === 'published' ? (
            post.permalink ? (
              <a className="btn btn-ghost" href={post.permalink} target="_blank" rel="noreferrer">
                Open post
              </a>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => onMarkPosted(post)}>
                Mark posted
              </button>
            )
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !hasMedia}
              onClick={() => onPublish(post)}
            >
              Publish
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => onDelete(post)}
            aria-label="Delete post"
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
