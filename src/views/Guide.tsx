import { useState } from 'react';

interface Step {
  title: string;
  why: string;
  code: string;
  note?: string;
}

const ORDER = ['cloudflare', 'hands-free', 'reels', 'instagram', 'termux'];

const BLOCKS: Array<{ id: string; label: string; eyebrow: string; title: string; intro: string; steps: Step[] }> = [
  {
    id: 'termux',
    label: 'Termux (optional)',
    eyebrow: 'Only if you want a phone server',
    title: 'Run it on your phone with Termux',
    intro:
      'This is optional. Phone-free 24x7 means Cloudflare + GitHub (the first two tabs), not Termux. Your error was `ENOENT ... open /data/data/com.termux/files/home/autoreel-zen/package.json`: the clone was empty because the repo only had a README. It now contains the full source.',
    steps: [
      {
        title: '1 - Install Node and git once',
        why: 'Termux ships without Node. nodejs-lts is the stable build npm expects.',
        code: 'pkg update -y && pkg upgrade -y\npkg install -y nodejs-lts git\nnode -v && npm -v',
      },
      {
        title: '1b - If pkg fails resolving termux.net',
        why: 'That is a DNS/repo problem on the phone, not your project. Switch the mirror once, then retry.',
        code: 'termux-change-repo\n# choose: Main repository, then a mirror (Grimler or Tsinghua)\npkg update -y && pkg upgrade -y',
        note: 'Node 26 already works on your phone, so you can skip pkg entirely and go to step 2.',
      },
      {
        title: '2 - Check where you are',
        why: 'npm run always runs in your current folder.',
        code: 'pwd\nls package.json || echo "WRONG FOLDER"',
      },
      {
        title: '3 - Get the project',
        why: 'Clone once, or pull if you already cloned it.',
        code: 'cd ~\ngit clone https://github.com/Manashjyoti-Bora/autoreel-zen.git\ncd autoreel-zen\nls package.json',
      },
      {
        title: '4 - Install and start',
        why: 'npm run dev builds the client + worker and serves on port 3000.',
        code: 'cd ~/autoreel-zen\nnpm install\nnpm run dev',
      },
      {
        title: '5 - Keep it alive in the background',
        why: 'So closing Termux does not stop the server.',
        code: 'cd ~/autoreel-zen\nnohup npm run dev > ~/autoreel.log 2>&1 &\ntail -f ~/autoreel.log',
      },
    ],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare deploy',
    eyebrow: 'Free hosting',
    title: 'Put it online for 24x7 (no phone needed)',
    intro:
      'A laptop or phone can sleep. Deployed on Cloudflare Workers the studio keeps running even when your device is off. That is the phone-free part.',
    steps: [
      {
        title: '1 - Log in and create the storage',
        why: 'D1 holds posts and settings, R2 holds images. Both have free tiers.',
        code: 'cd ~/autoreel-zen\nnpx wrangler login\nnpx wrangler d1 create autoreel-zen\nnpx wrangler r2 bucket create autoreel-zen-media',
        note: 'Copy the printed database_id into wrangler.jsonc.',
      },
      {
        title: '2 - Build and deploy',
        why: 'The build writes dist/client and dist/worker, which wrangler.jsonc points at.',
        code: 'npm run build\nnpx wrangler deploy',
      },
      {
        title: '3 - Set the secrets',
        why: 'Never commit these. wrangler stores them encrypted.',
        code: 'npx wrangler secret put APP_PASSWORD\nnpx wrangler secret put SESSION_SECRET\nnpx wrangler secret put CRON_SECRET\nnpx wrangler secret put APP_ORIGIN',
        note: 'Add GROQ_API_KEY or GEMINI_API_KEY to use a real model; without one the deterministic draft engine writes.',
      },
    ],
  },
  {
    id: 'hands-free',
    label: '24x7 autopilot',
    eyebrow: 'No human',
    title: 'Hands-free hourly ticks from GitHub',
    intro:
      'The repo ships .github/workflows/autopilot.yml. Add two repository secrets and GitHub calls your Worker every hour.',
    steps: [
      {
        title: '1 - Add the two secrets',
        why: 'Settings, then Secrets and variables, then Actions.',
        code: 'AUTOREEL_BASE_URL    = https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev\nAUTOREEL_CRON_SECRET = the same value you gave CRON_SECRET',
      },
      {
        title: '2 - Enable the workflow',
        why: 'Scheduled workflows only run on the default branch.',
        code: '# Actions, then Autopilot tick, then Enable workflow, then Run workflow',
      },
    ],
  },
  {
    id: 'reels',
    label: 'Reels',
    eyebrow: 'The main format',
    title: 'Reels are the default output',
    intro:
      'The swarm writes a timed shot list with on-screen text, a cover frame, a hook-first caption and hashtags. It does not render video: the kit tells you what to shoot, then posts your mp4.',
    steps: [
      {
        title: '1 - Ask for a reel',
        why: 'Console, Format: Reel, then dispatch a topic. Cover, subtitles, loop and audio agents join the trace.',
        code: '# Console, Format: Reel, write a topic, Dispatch to swarm',
      },
      {
        title: '2 - Paste the video URL and publish',
        why: 'The card stores the URL and Publish calls the Graph API with media_type=REELS and the cover frame.',
        code: '# open the card, paste https://.../reel.mp4, press Publish',
        note: 'Without a video URL, Publish returns the reel kit instead of pretending something was posted.',
      },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    eyebrow: 'Real posting',
    title: 'Connect a real Instagram account',
    intro:
      'Instagram only allows automated publishing for Business/Creator accounts through the Graph API. There is no free way around that.',
    steps: [
      {
        title: '1 - Switch the account to Creator/Business',
        why: 'Instagram app, Settings, Account type and tools, then link a Facebook Page.',
        code: '# Instagram app, Settings, Account type and tools, Switch to professional',
      },
      {
        title: '2 - Get a long-lived token',
        why: 'Create an app with instagram_basic and instagram_content_publish, then paste the IG user id and token in Autopilot.',
        code: '# developers.facebook.com, your app, Graph API Explorer, permissions, long-lived token',
      },
    ],
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="cmd">
      <pre className="cmd-code">{code}</pre>
      <button type="button" className="cmd-copy" onClick={() => void copy()}>
        {copied ? 'copied ok' : 'copy'}
      </button>
    </div>
  );
}

export function GuideView() {
  const tabs = ORDER.map((id) => BLOCKS.find((block) => block.id === id)).filter(
    (block): block is (typeof BLOCKS)[number] => !!block,
  );
  const [tab, setTab] = useState(tabs[0].id);
  const active = tabs.find((block) => block.id === tab) ?? tabs[0];

  return (
    <div className="view view-guide">
      <section className="guide-hero glass">
        <span className="eyebrow">Personal run guide</span>
        <h1>Copy, paste, running.</h1>
        <p>
          Every command below is exactly what this project needs. Nothing is interactive unless it says so, and
          each block has its own copy button.
        </p>
        <div className="guide-warning">
          <strong>Phone-free means Cloudflare + GitHub, not the phone.</strong> Deploy with wrangler deploy, add two
          GitHub secrets, and the hourly workflow keeps writing and posting while every device of yours stays off.
          Termux is only a local test bench.
        </div>
        <div className="guide-warning">
          <strong>Why your clone had no package.json:</strong> the repository only contained a README until now. The
          full source is on main, so a fresh clone (or a git pull inside ~/autoreel-zen) now gives you a runnable
          project.
        </div>
      </section>

      <div className="guide-tabs" role="tablist">
        {tabs.map((block) => (
          <button
            key={block.id}
            type="button"
            role="tab"
            aria-selected={block.id === tab}
            className={`guide-tab ${block.id === tab ? 'is-active' : ''}`}
            onClick={() => setTab(block.id)}
          >
            {block.label}
          </button>
        ))}
      </div>

      <section className="guide-panel glass">
        <span className="eyebrow">{active.eyebrow}</span>
        <h2>{active.title}</h2>
        <p className="guide-intro">{active.intro}</p>

        <ol className="guide-steps">
          {active.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.why}</p>
              <CodeBlock code={step.code} />
              {step.note ? <p className="guide-note">{step.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
