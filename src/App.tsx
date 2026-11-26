import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bootstrap, ComposeInput, Post, TrailStep } from '@shared/types';
import { api } from './lib/api';
import { ConsoleView } from './views/Console';
import { QueueView } from './views/Queue';
import { SwarmView } from './views/Swarm';
import { AutopilotView } from './views/Autopilot';
import { ResourcesView } from './views/Resources';
import { GuideView } from './views/Guide';

type View = 'console' | 'queue' | 'swarm' | 'resources' | 'guide' | 'autopilot';

const NAV: Array<{ id: View; label: string; icon: string }> = [
  { id: 'console', label: 'Console', icon: 'M4 12h3l2-6 3 12 2-6h6' },
  { id: 'queue', label: 'Queue', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'swarm', label: 'Swarm', icon: 'M12 4v4M6 20v-4a3 3 0 013-3h6a3 3 0 013 3v4M12 12a3 3 0 100-6 3 3 0 000 6z' },
  { id: 'resources', label: 'Free stack', icon: 'M4 7l8-3 8 3-8 3-8-3zM4 12l8 3 8-3M4 17l8 3 8-3' },
  { id: 'autopilot', label: 'Autopilot', icon: 'M4 8h10M18 8h2M4 16h4M12 16h8M15 5v6M9 13v6' },
  { id: 'guide', label: 'Run guide', icon: 'M4 5h16v14H4zM7 9l2 2-2 2M12 13h5' },
];

const TITLES: Record<View, { eyebrow: string; title: string }> = {
  console: { eyebrow: 'Studio', title: 'Zen console' },
  queue: { eyebrow: 'Studio', title: 'Content queue' },
  swarm: { eyebrow: 'Studio', title: 'Agent swarm' },
  resources: { eyebrow: 'Zero cost', title: 'Free stack' },
  guide: { eyebrow: 'Setup', title: 'Run guide' },
  autopilot: { eyebrow: 'Studio', title: 'Autopilot' },
};

export default function App() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [view, setView] = useState<View>('console');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [liveLabel, setLiveLabel] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [ticking, setTicking] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5200);
  }, []);

  const load = useCallback(async () => {
    const data = await api<Bootstrap>('/bootstrap');
    setBoot(data);
    return data;
  }, []);

  useEffect(() => {
    void load()
      .catch((err: unknown) => notify('error', err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [load, notify]);

  const authed = !!boot?.authed;
  const autopilotOn = !!boot?.settings?.autopilot;

  const runTick = useCallback(
    async (silent: boolean) => {
      if (silent) {
        try {
          await api('/autopilot/tick', { method: 'POST' });
          await load();
        } catch {
          /* silent background tick */
        }
        return;
      }
      setTicking(true);
      try {
        const result = await api<{ published: number; produced: number; created: string | null; notes: string[]; skipped?: string }>(
          '/autopilot/tick',
          { method: 'POST' },
        );
        await load();
        setTickResult(
          result.skipped
            ? `Skipped — ${result.skipped}`
            : `Published ${result.published} · produced ${result.produced}${result.created ? ' · new topic queued' : ''}${result.notes.length ? ` · ${result.notes.join(' · ')}` : ''}`,
        );
        notify('ok', 'Autopilot tick finished');
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Tick failed');
      } finally {
        setTicking(false);
      }
    },
    [load, notify],
  );

  useEffect(() => {
    if (!authed || !autopilotOn) return;
    const timer = window.setInterval(() => void runTick(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [authed, autopilotOn, runTick]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError('');
    try {
      await api('/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      await load();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function logout() {
    await api('/logout', { method: 'POST' }).catch(() => undefined);
    await load();
  }

  async function compose(input: ComposeInput) {
    setBusy(true);
    setTrail([]);
    setLiveLabel('Dispatching to the swarm…');
    try {
      const { posts } = await api<{ posts: Post[] }>('/compose', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await load();
      for (const draft of posts) {
        setLiveLabel(`Producing ${posts.length > 1 ? `${posts.indexOf(draft) + 1}/${posts.length}` : 'post'}…`);
        setTrail([]);
        const { post } = await api<{ post: Post }>(`/posts/${draft.id}/produce`, { method: 'POST' });
        setTrail(post.trail);
        await load();
      }
      notify('ok', `${posts.length} post${posts.length > 1 ? 's' : ''} produced and queued`);
      setView('queue');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Compose failed');
    } finally {
      setBusy(false);
      setLiveLabel('');
    }
  }

  async function produce(post: Post) {
    setBusyId(post.id);
    setTrail([]);
    setView('console');
    setLiveLabel(`Re-running ${post.title || post.topic}`);
    try {
      const { post: updated } = await api<{ post: Post }>(`/posts/${post.id}/produce`, {
        method: 'POST',
      });
      setTrail(updated.trail);
      await load();
      notify('ok', 'Post regenerated');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Produce failed');
    } finally {
      setBusyId(null);
      setLiveLabel('');
    }
  }

  async function publish(post: Post) {
    setBusyId(post.id);
    try {
      const result = await api<{
        ok: boolean;
        manual: boolean;
        error?: string;
        post: Post;
        pack?: { caption: string; hashtags: string; imageUrl: string; reelScript?: string };
      }>(`/posts/${post.id}/publish`, { method: 'POST' });
      await load();
      if (result.ok) {
        notify('ok', 'Published to Instagram');
      } else if (result.manual) {
        notify(
          'error',
          'Instagram not connected — copy the caption and image from the queue (open the card image).',
        );
      } else {
        notify('error', result.error ?? 'Publish failed');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusyId(null);
    }
  }

  async function markPosted(post: Post) {
    try {
      await api(`/posts/${post.id}/mark-posted`, { method: 'POST' });
      await load();
      notify('ok', 'Marked as posted');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function remove(post: Post) {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      await load();
      notify('ok', 'Post deleted');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function saveSettings(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const data = await api<Bootstrap>('/settings', {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      setBoot(data);
      notify('ok', 'Settings saved');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function verifyIg(igUserId: string, igToken: string): Promise<string> {
    try {
      const result = await api<{ ok: boolean; username?: string; followers?: number; error?: string }>(
        '/instagram/verify',
        { method: 'POST', body: JSON.stringify({ igUserId, igToken }) },
      );
      await load();
      if (result.ok) return `Connected as @${result.username ?? 'account'} · ${result.followers ?? 0} followers`;
      return `Failed — ${result.error ?? 'unknown error'}`;
    } catch (err) {
      return err instanceof Error ? err.message : 'Verification failed';
    }
  }

  async function backup(): Promise<string> {
    try {
      const result = await api<{ ok: boolean; path?: string; error?: string }>('/backup', {
        method: 'POST',
      });
      await load();
      return result.ok ? `Saved ${result.path} to GitHub` : `Failed — ${result.error ?? 'unknown error'}`;
    } catch (err) {
      return err instanceof Error ? err.message : 'Backup failed';
    }
  }

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-mark" />
        <span>AUTOREEL ZEN</span>
      </div>
    );
  }

  if (!boot || !boot.authed) {
    return (
      <div className="login-page">
        <div className="aurora" aria-hidden="true" />
        <form className="login-card glass" onSubmit={login}>
          <div className="brand-mark">AZ</div>
          <span className="eyebrow">Private studio</span>
          <h1>AUTOREEL ZEN</h1>
          <p className="login-copy">
            {boot?.openMode
              ? 'No APP_PASSWORD is set, so this studio is open. Set the APP_PASSWORD secret before deploying it publicly.'
              : 'Enter the studio password to run the swarm.'}
          </p>
          {!boot?.openMode ? (
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                autoFocus
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
          ) : null}
          {loginError ? <p className="field-note error">{loginError}</p> : null}
          <button type="submit" className="btn btn-primary btn-lg">
            {boot?.openMode ? 'Open console' : 'Enter console'}
            <span className="btn-arrow">↗</span>
          </button>
          <p className="login-foot">
            {boot?.agents.length ?? 1000}+ agents · free model chain · GitHub backup
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true" />

      <aside className="rail">
        <div className="rail-logo" title="AUTOREEL ZEN">
          <span>AZ</span>
        </div>
        <nav className="rail-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rail-btn ${view === item.id ? 'is-active' : ''}`}
              onClick={() => setView(item.id)}
              title={item.label}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <span className={`rail-status ${autopilotOn ? 'is-on' : ''}`}>
            <i />
            {autopilotOn ? 'on' : 'off'}
          </span>
          {boot.settings?.passwordProtected ? (
            <button type="button" className="rail-logout" onClick={() => void logout()} title="Lock studio">
              ⏻
            </button>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{TITLES[view].eyebrow}</span>
            <h2 className="topbar-title">{TITLES[view].title}</h2>
          </div>
          <div className="topbar-right">
            <span className={`status-pill ${autopilotOn ? 'is-on' : ''}`}>
              <i />
              {autopilotOn ? 'Autopilot active' : 'Autopilot paused'}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={ticking}
              onClick={() => void runTick(false)}
            >
              {ticking ? 'Ticking…' : 'Run tick'}
            </button>
          </div>
        </header>

        {boot.openMode ? (
          <div className="warn-banner">
            Open mode — set <code>APP_PASSWORD</code> as a secret so nobody else can run your swarm.
          </div>
        ) : null}

        {view === 'console' ? (
          <ConsoleView
            boot={boot}
            busy={busy || !!busyId}
            trail={trail}
            liveLabel={liveLabel}
            onCompose={compose}
            onProduce={produce}
            onPublish={publish}
            onDelete={remove}
            onMarkPosted={markPosted}
          />
        ) : null}

        {view === 'queue' ? (
          <QueueView
            boot={boot}
            busyId={busyId}
            onProduce={produce}
            onPublish={publish}
            onDelete={remove}
            onMarkPosted={markPosted}
            onRefresh={() => void load()}
          />
        ) : null}

        {view === 'swarm' ? <SwarmView agents={boot.agents} posts={boot.posts} /> : null}

        {view === 'resources' ? <ResourcesView /> : null}

        {view === 'guide' ? <GuideView /> : null}

        {view === 'autopilot' ? (
          <AutopilotView
            boot={boot}
            saving={saving}
            ticking={ticking}
            tickResult={tickResult}
            onSave={saveSettings}
            onVerify={verifyIg}
            onBackup={backup}
            onTick={() => runTick(false)}
          />
        ) : null}
      </main>

      {toast ? (
        <div className={`toast ${toast.kind}`}>
          <span>{toast.kind === 'ok' ? '✓' : '!'}</span>
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
