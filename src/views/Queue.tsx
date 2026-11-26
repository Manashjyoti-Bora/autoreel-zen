import { useMemo, useState } from 'react';
import type { Bootstrap, Post, PostStatus } from '@shared/types';
import { PostCard } from '../components/PostCard';

const FILTERS: Array<{ id: 'all' | PostStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'ready', label: 'Ready' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
];

export function QueueView({
  boot,
  busyId,
  onProduce,
  onPublish,
  onDelete,
  onMarkPosted,
  onRefresh,
}: {
  boot: Bootstrap;
  busyId: string | null;
  onProduce: (post: Post) => void;
  onPublish: (post: Post) => void;
  onDelete: (post: Post) => void;
  onMarkPosted: (post: Post) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const posts = useMemo(() => {
    if (filter === 'all') return boot.posts;
    return boot.posts.filter((post) => post.status === filter);
  }, [boot.posts, filter]);

  return (
    <div className="view">
      <div className="queue-head">
        <div>
          <span className="eyebrow">Content queue</span>
          <h1>{boot.posts.length} posts in the studio</h1>
        </div>
        <div className="filter-row">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              {item.id !== 'all'
                ? ` ${boot.posts.filter((post) => post.status === item.id).length}`
                : ''}
            </button>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state glass">
          <h3>Nothing here yet</h3>
          <p>Send a topic from the console and this fills up automatically.</p>
        </div>
      ) : (
        <div className="post-grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              busy={busyId === post.id}
              onProduce={onProduce}
              onPublish={onPublish}
              onDelete={onDelete}
              onMarkPosted={onMarkPosted}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
