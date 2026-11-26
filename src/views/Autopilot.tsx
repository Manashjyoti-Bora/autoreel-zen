import { useEffect, useState } from 'react';
import type { Bootstrap, Format, Lang, Tone } from '@shared/types';
import { Pill, Toggle } from '../components/ui';
import { shortDate } from '../lib/api';

const OFFSETS = [
  { value: 330, label: 'IST · +05:30' },
  { value: 0, label: 'UTC · +00:00' },
  { value: 480, label: 'SGT · +08:00' },
  { value: 60, label: 'CET · +01:00' },
  { value: -300, label: 'EST · −05:00' },
  { value: -480, label: 'PST · −08:00' },
];

export function AutopilotView({
  boot,
  saving,
  ticking,
  tickResult,
  onSave,
  onVerify,
  onBackup,
  onTick,
}: {
  boot: Bootstrap;
  saving: boolean;
  ticking: boolean;
  tickResult: string | null;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onVerify: (igUserId: string, igToken: string) => Promise<string>;
  onBackup: () => Promise<string>;
  onTick: () => Promise<void>;
}) {
  const settings = boot.settings!;
  const [autopilot, setAutopilot] = useState(settings.autopilot);
  const [autoContinue, setAutoContinue] = useState(settings.autoContinue);
  const [postsPerDay, setPostsPerDay] = useState(settings.postsPerDay);
  const [slots, setSlots] = useState(settings.slots.join(', '));
  const [offset, setOffset] = useState(settings.utcOffsetMinutes);
  const [tone, setTone] = useState<Tone>(settings.defaultTone);
  const [format, setFormat] = useState<Format>(settings.defaultFormat);
  const [language, setLanguage] = useState<Lang>(settings.defaultLanguage);
  const [seedTopic, setSeedTopic] = useState(settings.seedTopic);
  const [brand, setBrand] = useState(settings.brand);
  const [vision, setVision] = useState(settings.vision);
  const [igUserId, setIgUserId] = useState(settings.igUserId);
  const [igToken, setIgToken] = useState('');
  const [igMessage, setIgMessage] = useState<string | null>(null);
  const [ghRepo, setGhRepo] = useState(settings.ghRepo);
  const [ghToken, setGhToken] = useState('');
  const [ghMessage, setGhMessage] = useState<string | null>(null);
  const [formNote, setFormNote] = useState<string | null>(null);

  useEffect(() => {
    setAutopilot(settings.autopilot);
    setAutoContinue(settings.autoContinue);
    setPostsPerDay(settings.postsPerDay);
    setSlots(settings.slots.join(', '));
    setOffset(settings.utcOffsetMinutes);
    setTone(settings.defaultTone);
    setFormat(settings.defaultFormat);
    setLanguage(settings.defaultLanguage);
    setSeedTopic(settings.seedTopic);
    setBrand(settings.brand);
    setVision(settings.vision);
    setIgUserId(settings.igUserId);
    setGhRepo(settings.ghRepo);
  }, [settings]);

  const tickUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/autopilot/tick`;

  async function saveCadence(event: React.FormEvent) {
    event.preventDefault();
    setFormNote(null);
    await onSave({
      autopilot,
      autoContinue,
      postsPerDay,
      utcOffsetMinutes: Number(offset),
      slots: slots
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      defaultTone: tone,
      defaultFormat: format,
      defaultLanguage: language,
      seedTopic,
      brand,
      vision,
    });
    setFormNote('Cadence saved.');
  }

  async function verify() {
    setIgMessage('Checking with Instagram…');
    const message = await onVerify(igUserId.trim(), igToken.trim());
    setIgMessage(message);
    setIgToken('');
  }

  async function backup() {
    setGhMessage('Pushing snapshot…');
    const message = await onBackup();
    setGhMessage(message);
    setGhToken('');
  }

  return (
    <div className="view view-autopilot">
      <div className="queue-head">
        <div>
          <span className="eyebrow">Autopilot</span>
          <h1>Hands-free controls</h1>
        </div>
        <div className="filter-row">
          <Pill tone={settings.autopilot ? 'lime' : 'muted'}>
            {settings.autopilot ? 'running' : 'paused'}
          </Pill>
          <button type="button" className="btn btn-primary" disabled={ticking} onClick={() => void onTick()}>
            {ticking ? 'Ticking…' : 'Run tick now'}
          </button>
        </div>
      </div>

      {tickResult ? (
        <div className="note-strip glass">
          <span className="eyebrow">Last tick</span>
          <p>{tickResult}</p>
        </div>
      ) : null}

      <div className="settings-grid">
        <form className="settings-card glass" onSubmit={saveCadence}>
          <span className="eyebrow">Cadence</span>
          <h3>How the swarm ships</h3>

          <Toggle
            checked={autopilot}
            onChange={setAutopilot}
            label="Autopilot"
            hint="Generate, schedule and publish on its own"
          />
          <Toggle
            checked={autoContinue}
            onChange={setAutoContinue}
            label="Self-continue"
            hint="Derives the next topic from the last post"
          />

          <div className="field-row">
            <label className="field">
              <span>Posts per day</span>
              <input
                type="number"
                min={1}
                max={10}
                value={postsPerDay}
                onChange={(event) => setPostsPerDay(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Timezone offset</span>
              <select value={offset} onChange={(event) => setOffset(Number(event.target.value))}>
                {OFFSETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Posting slots (24h, comma separated)</span>
            <input
              type="text"
              value={slots}
              onChange={(event) => setSlots(event.target.value)}
              placeholder="09:30, 13:30, 19:30"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Default tone</span>
              <select value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
                {['zen', 'bold', 'poetic', 'meme', 'story', 'gyaan'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Default format</span>
              <select value={format} onChange={(event) => setFormat(event.target.value as Format)}>
                {['reel', 'photo', 'carousel', 'quote'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Lang)}>
                <option value="as">অসমীয়া</option>
                <option value="en">English</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Seed topic (used when the queue is empty)</span>
            <input
              type="text"
              value={seedTopic}
              onChange={(event) => setSeedTopic(event.target.value)}
              placeholder="e.g. শান্ত ৰাতিপুৱাৰ অভ্যাস"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Brand name</span>
              <input type="text" value={brand} onChange={(event) => setBrand(event.target.value)} />
            </label>
            <label className="field">
              <span>Account vision</span>
              <input type="text" value={vision} onChange={(event) => setVision(event.target.value)} />
            </label>
          </div>

          <div className="settings-foot">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save cadence'}
            </button>
            {formNote ? <span className="field-note">{formNote}</span> : null}
          </div>
        </form>

        <div className="settings-stack">
          <section className="settings-card glass">
            <span className="eyebrow">Instagram</span>
            <h3>Content publishing API</h3>
            <p className="card-copy">
              Needs a Business/Creator account linked to a Facebook Page, and a long-lived token with
              <code> instagram_content_publish</code>. Without it, posts stay in manual mode and the
              package is ready to copy.
            </p>
            <div className="field-row">
              <label className="field">
                <span>IG user id</span>
                <input
                  type="text"
                  value={igUserId}
                  onChange={(event) => setIgUserId(event.target.value)}
                  placeholder="17841400000000000"
                />
              </label>
            </div>
            <label className="field">
              <span>Access token</span>
              <input
                type="password"
                value={igToken}
                onChange={(event) => setIgToken(event.target.value)}
                placeholder={settings.igTokenSet ? 'saved — leave blank to keep' : 'EAAG…'}
              />
            </label>
            <div className="settings-foot">
              <button type="button" className="btn btn-ghost" onClick={() => void verify()}>
                Save & verify
              </button>
              <Pill tone={settings.igUsername ? 'lime' : 'muted'}>
                {settings.igUsername ? `@${settings.igUsername}` : 'not connected'}
              </Pill>
            </div>
            {igMessage ? <p className="field-note">{igMessage}</p> : null}
          </section>

          <section className="settings-card glass">
            <span className="eyebrow">GitHub</span>
            <h3>Data snapshot</h3>
            <p className="card-copy">
              Every backup commits <code>data/latest.json</code> and a dated archive file into your
              repo, so the content history lives in Git and can go open source later.
            </p>
            <label className="field">
              <span>Repository (owner/name)</span>
              <input
                type="text"
                value={ghRepo}
                onChange={(event) => setGhRepo(event.target.value)}
                placeholder="yourname/autoreel-data"
              />
            </label>
            <label className="field">
              <span>Fine-grained token (contents: write)</span>
              <input
                type="password"
                value={ghToken}
                onChange={(event) => setGhToken(event.target.value)}
                placeholder={settings.ghTokenSet ? 'saved — leave blank to keep' : 'github_pat_…'}
              />
            </label>
            <div className="settings-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  void (async () => {
                    await onSave({ ghRepo });
                    setGhMessage('Repo saved — now back up.');
                  })()
                }
              >
                Save repo
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void backup()}>
                Backup now
              </button>
              <Pill tone={settings.lastBackup ? 'lime' : 'muted'}>
                {settings.lastBackup ? shortDate(settings.lastBackup) : 'never'}
              </Pill>
            </div>
            {ghMessage ? <p className="field-note">{ghMessage}</p> : null}
          </section>

          <section className="settings-card glass">
            <span className="eyebrow">Always on</span>
            <h3>Cron endpoint</h3>
            <p className="card-copy">
              The bundled GitHub Action calls this every hour so posts go out even when no browser is
              open. Add <code>CRON_SECRET</code> as a Worker secret, then set the same value as an
              Actions secret.
            </p>
            <div className="code-block">
              <code>POST {tickUrl}</code>
              <code>x-cron-secret: $CRON_SECRET</code>
            </div>
            <div className="settings-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void navigator.clipboard?.writeText(tickUrl)}
              >
                Copy URL
              </button>
              <span className="field-note">
                Set <code>APP_PASSWORD</code> so the dashboard is not public.
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
