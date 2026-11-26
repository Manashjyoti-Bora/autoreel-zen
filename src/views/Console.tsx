import { useMemo, useState } from 'react';
import type {
  Bootstrap,
  ComposeInput,
  Format,
  InspirationIdea,
  InspirationResult,
  Lang,
  Post,
  Tone,
  TrailStep,
} from '@shared/types';
import { Pipeline } from '../components/Pipeline';
import { Chip, Pill, Stat } from '../components/ui';
import { api, timeLeft } from '../lib/api';

const SOURCE_LABEL: Record<InspirationResult['source'], string> = {
  live: 'read live',
  mirror: 'text mirror',
  caption: 'your caption',
  link: 'link only',
};

const TONES: Array<{ id: Tone; label: string }> = [
  { id: 'zen', label: 'Zen' },
  { id: 'bold', label: 'Bold' },
  { id: 'poetic', label: 'Poetic' },
  { id: 'meme', label: 'Meme' },
  { id: 'story', label: 'Story' },
  { id: 'gyaan', label: 'Gyaan' },
];

const FORMATS: Array<{ id: Format; label: string }> = [
  { id: 'reel', label: 'Reel' },
  { id: 'photo', label: 'Photo' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'quote', label: 'Quote' },
];

const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'as', label: 'অসমীয়া' },
  { id: 'en', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
];

export function ConsoleView({
  boot,
  busy,
  trail,
  liveLabel,
  onCompose,
  onProduce,
  onPublish,
  onDelete,
  onMarkPosted,
}: {
  boot: Bootstrap;
  busy: boolean;
  trail: TrailStep[];
  liveLabel: string;
  onCompose: (input: ComposeInput) => void;
  onProduce: (post: Post) => void;
  onPublish: (post: Post) => void;
  onDelete: (post: Post) => void;
  onMarkPosted: (post: Post) => void;
}) {
  const settings = boot.settings!;
  const stats = boot.stats!;
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>(settings.defaultTone);
  const [format, setFormat] = useState<Format>(settings.defaultFormat);
  const [language, setLanguage] = useState<Lang>(settings.defaultLanguage);
  const [count, setCount] = useState(1);
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [reading, setReading] = useState(false);
  const [insp, setInsp] = useState<InspirationResult | null>(null);
  const [inspError, setInspError] = useState('');

  const nextUp = useMemo(() => {
    const scheduled = boot.posts
      .filter((post) => post.status === 'scheduled' && post.scheduledAt)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime(),
      );
    return scheduled[0] ?? null;
  }, [boot.posts]);

  const recent = boot.posts.slice(0, 4);

  async function readLink(event: React.FormEvent) {
    event.preventDefault();
    const clean = link.trim();
    if (clean.length < 8 || reading) return;
    setReading(true);
    setInspError('');
    setInsp(null);
    try {
      const result = await api<InspirationResult>('/inspiration', {
        method: 'POST',
        body: JSON.stringify({ link: clean, caption: caption.trim() }),
      });
      setInsp(result);
      if (result.source !== 'live') setShowCaption(true);
    } catch (err) {
      setInspError(err instanceof Error ? err.message : 'Could not read that link');
    } finally {
      setReading(false);
    }
  }

  function fillFromIdea(idea: InspirationIdea) {
    setTopic(idea.topic);
    setTone(idea.tone);
    setFormat(idea.format);
    document.querySelector('.composer-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function sendIdea(idea: InspirationIdea) {
    if (busy) return;
    onCompose({ topic: idea.topic, tone: idea.tone, format: idea.format, language, count: 1, autoSchedule: true });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = topic.trim();
    if (clean.length < 2 || busy) return;
    onCompose({ topic: clean, tone, format, language, count, autoSchedule: true });
    setTopic('');
  }

  return (
    <div className="view view-console">
      <section className="stats-row">
        <Stat label="In queue" value={stats.queue} foot={`${stats.drafts} drafts waiting`} />
        <Stat label="Published" value={stats.published} foot={`${stats.todayCount} today`} accent="var(--lime)" />
        <Stat label="Streak" value={`${stats.streak}d`} foot="consecutive posting days" accent="var(--cyan)" />
        <Stat
          label="Virality heuristic"
          value={stats.avgVirality ? `${stats.avgVirality}` : '—'}
          foot="avg score out of 100"
          accent="var(--violet)"
        />
      </section>

      <section className="remix glass">
        <div className="remix-head">
          <div>
            <span className="eyebrow">Remix a real post</span>
            <h2>Paste an Instagram link</h2>
            <p className="remix-copy">
              The swarm reads the post, then writes five original angles in your own voice — inspiration,
              never a repost. "Post this" runs the full pipeline: copy, cover, score, schedule.
            </p>
          </div>
          <Pill tone={insp?.engine === 'ai' ? 'lime' : 'muted'}>
            {insp ? (insp.engine === 'ai' ? 'AI angles' : 'rules angles') : 'link → ideas'}
          </Pill>
        </div>

        <form className="remix-form" onSubmit={readLink}>
          <input
            className="remix-input"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://www.instagram.com/p/… or /reel/…"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-primary" disabled={reading || link.trim().length < 8}>
            {reading ? 'Reading…' : 'Read & riff'}
            <span className="btn-arrow">↗</span>
          </button>
        </form>

        <div className="remix-manual">
          <button type="button" className="link-btn" onClick={() => setShowCaption((value) => !value)}>
            {showCaption ? 'Hide caption box' : 'Instagram blocked it? Paste the caption instead'}
          </button>
          {showCaption ? (
            <textarea
              className="remix-caption"
              rows={3}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={2400}
              placeholder="Paste the caption text of the post you liked — the swarm still finds new angles."
            />
          ) : null}
        </div>

        {inspError ? <p className="field-note error">{inspError}</p> : null}

        {insp ? (
          <div className="remix-result" aria-live="polite">
            <div className="remix-meta">
              <span className={`remix-source is-${insp.source}`}>{SOURCE_LABEL[insp.source]}</span>
              <span className="remix-tag">{insp.kind}</span>
              {insp.author ? <span className="remix-author">@{insp.author}</span> : null}
              {insp.keywords.slice(0, 5).map((word) => (
                <span className="remix-tag" key={word}>
                  #{word}
                </span>
              ))}
            </div>
            {insp.caption ? (
              <blockquote className="remix-text">
                {insp.caption.slice(0, 280)}
                {insp.caption.length > 280 ? '…' : ''}
              </blockquote>
            ) : null}
            <p className="remix-note">{insp.note}</p>

            <div className="remix-ideas">
              {insp.ideas.map((idea, index) => (
                <article className="remix-idea" key={`${idea.topic}-${index}`}>
                  <span className="remix-angle">{idea.angle}</span>
                  <h3>{idea.hook}</h3>
                  <p>{idea.why}</p>
                  <div className="remix-idea-foot">
                    <span className="remix-tag">
                      {idea.tone} · {idea.format}
                    </span>
                    <div className="remix-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => fillFromIdea(idea)}>
                        Use in composer
                      </button>
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => sendIdea(idea)}>
                        Post this
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="console-grid">
        <form className="composer glass" onSubmit={submit}>
          <div className="composer-head">
            <div>
              <span className="eyebrow">Brief the swarm</span>
              <h1>
                আজি কি ক&apos;ব?
                <span className="composer-sub">one topic → a finished post</span>
              </h1>
            </div>
            <div className="engine-chips">
              <Pill tone={settings.aiReady ? 'lime' : 'warn'}>
                {settings.aiReady ? 'AI copy' : 'draft engine'}
              </Pill>
              <Pill tone={settings.imageReady ? 'cyan' : 'warn'}>
                {settings.imageReady ? 'AI visuals' : 'stock visuals'}
              </Pill>
            </div>
          </div>

          <textarea
            className="composer-input"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            rows={4}
            maxLength={280}
            placeholder={'বিষয়টো লিখক — যেনে: "শান্ত ৰাতিপুৱাৰ অভ্যাস", "৩ মিনিটৰ rule", "অসমৰ বৰষুণ আৰু মন"…'}
          />

          <div className="composer-rows">
            <div className="chip-row">
              <span className="chip-label">Tone</span>
              {TONES.map((item) => (
                <Chip key={item.id} active={tone === item.id} onClick={() => setTone(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <div className="chip-row">
              <span className="chip-label">Format</span>
              {FORMATS.map((item) => (
                <Chip key={item.id} active={format === item.id} onClick={() => setFormat(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <div className="chip-row">
              <span className="chip-label">Language</span>
              {LANGS.map((item) => (
                <Chip key={item.id} active={language === item.id} onClick={() => setLanguage(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <div className="chip-row">
              <span className="chip-label">How many</span>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setCount((value) => Math.max(1, value - 1))}
                  aria-label="Fewer posts"
                >
                  −
                </button>
                <span>{count}</span>
                <button
                  type="button"
                  onClick={() => setCount((value) => Math.min(5, value + 1))}
                  aria-label="More posts"
                >
                  +
                </button>
              </div>
              <span className="chip-hint">each one gets its own angle + visual</span>
            </div>
          </div>

          <div className="composer-foot">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || topic.trim().length < 2}>
              {busy ? 'Swarm working…' : 'Dispatch to swarm'}
              <span className="btn-arrow">↗</span>
            </button>
            <span className="composer-note">
              {settings.autopilot
                ? `Auto-schedules into your ${settings.slots.join(' · ')} slots`
                : 'Autopilot paused — posts stay in ready state'}
            </span>
          </div>
        </form>

        <Pipeline trail={trail} busy={busy} label={liveLabel} />
      </section>

      <section className="console-bottom">
        <div className="next-up glass">
          <div className="next-up-head">
            <span className="eyebrow">Next drop</span>
            <Pill tone={nextUp ? 'lime' : 'muted'}>{nextUp ? `in ${timeLeft(nextUp.scheduledAt)}` : 'empty'}</Pill>
          </div>
          {nextUp ? (
            <div className="next-up-body">
              <img src={nextUp.mediaUrl} alt={nextUp.altText || nextUp.title} />
              <div>
                <h3>{nextUp.title || nextUp.topic}</h3>
                <p>{nextUp.hook}</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => onPublish(nextUp)}
                >
                  Publish now
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-note">
              Nothing scheduled. Send a topic or run the autopilot tick to fill the queue.
            </p>
          )}
        </div>

        <div className="recent glass">
          <div className="next-up-head">
            <span className="eyebrow">Latest drops</span>
            <Pill tone="muted">{recent.length}</Pill>
          </div>
          <div className="recent-list">
            {recent.length === 0 ? <p className="empty-note">No posts yet — the first one is yours.</p> : null}
            {recent.map((post) => (
              <div className="recent-item" key={post.id}>
                <div className="recent-thumb">
                  {post.mediaUrl ? (
                    <img src={post.mediaUrl} alt={post.altText || post.title} loading="lazy" />
                  ) : (
                    <span />
                  )}
                </div>
                <div className="recent-copy">
                  <span className="recent-title">{post.title || post.topic}</span>
                  <span className="recent-meta">
                    {post.status} · {post.virality ? `${post.virality}/100` : 'unscored'}
                  </span>
                </div>
                <div className="recent-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={busy}
                    onClick={() => onProduce(post)}
                    title="Regenerate"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={busy}
                    onClick={() => (post.status === 'published' ? onMarkPosted(post) : onPublish(post))}
                    title={post.status === 'published' ? 'Mark posted' : 'Publish'}
                  >
                    ↗
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={busy}
                    onClick={() => onDelete(post)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
