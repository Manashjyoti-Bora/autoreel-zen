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
      'This is optional. Phone-free 24×7 means Cloudflare + GitHub (the first two tabs), not Termux. Your error was `ENOENT … open /data/data/com.termux/files/home/autoreel-zen/package.json`: the clone was empty because the repo only had a README. It now contains the full source, and the commands below `cd` into it for you.',
    steps: [
      {
        title: '1 · Install Node and git once',
        why: 'Termux ships without Node. nodejs-lts is the stable build that npm expects.',
        code: 'pkg update -y && pkg upgrade -y\npkg install -y nodejs-lts git\nnode -v && npm -v',
      },
      {
        title: '1b · If pkg fails with "Something wicked happened resolving termux.net"',
        why: 'That is a DNS/repo problem on the phone, not your project. Switch the Termux mirror once, then retry.',
        code: 'pkg update -y && pkg upgrade -y',
        note: 'turn the phone Wi-Fi/data off and on if it still fails. Node 26 already works.',
      },
      {
        title: '2 · Check where you are (this is the fix)',
        why: 'npm run always runs in your current folder. If `ls package.json` says "No such file", you are in the wrong place.',
        code: 'pwd\nls package.json || echo "WRONG FOLDER"',
      },
      {
        title: '3 · Get the project',
        why: 'Clone once. If you already cloned it, skip to step 4.',
        code: 'cd ~\ngit clone https://github.com/Manashjyoti-Bora/autoreel-zen.git\ncd autoreel-zen\nls package.json',
      },
      {
        title: '4 · Install and start',
        why: 'First install pulls the dependencies and serves on port 3000.',
        code: 'cd ~/autoreel-zen\nnpm install\nnpm run dev',
      },
    ],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare deploy',
    eyebrow: 'Free hosting',
    title: 'Put it online for 24×7 (no phone needed)',
    intro:
      'A laptop or phone can sleep. Deployed on Cloudflare Workers the studio keeps running even when your device is off — that is the "phone free" part.',
    steps: [
      {
        title: '1 · Log in and create the storage',
        why: 'D1 holds posts and settings, R2 holds images. Both have free tiers.',
        code: 'npx wrangler login\nnpx wrangler d1 create autoreel-zen\nnpx wrangler r2 bucket create autoreel-zen-media',
      },
      {
        title: '2 · Build and deploy',
        why: 'The build writes dist/client and dist/worker, which wrangler.jsonc points at.',
        code: 'npm run build\nnpx wrangler deploy',
      },
    ],
  },
  {
    id: 'hands-free',
    label: '24×7 autopilot',
    eyebrow: 'No human',
    title: 'Hands-free hourly ticks from GitHub',
    intro:
      'The repo ships .github/workflows/autopilot.yml. Add two repository secrets and GitHub calls your Worker every hour.',
    steps: [
      {
        title: '1 · Add the two secrets',
        why: 'Settings → Secrets and variables → Actions.',
        code: 'AUTOREEL_BASE_URL    = https://autoreel-zen.<sub>.workers.dev\nAUTOREEL_CRON_SECRET = <same as CRON_SECRET>',
      },
    ],
  },
  {
    id: 'reels',
    label: 'Reels',
    eyebrow: 'The main format',
    title: 'Reels are the default output',
    intro:
      'The swarm writes reels: a timed shot list, cover frame, hook-first caption and hashtags. It does not render video; the kit tells you what to shoot, then posts your mp4.',
    steps: [
      {
        title: '1 · Ask for a reel',
        why: 'Console → Format → Reel → dispatch a topic.',
        code: '# Console → Format: Reel → topic → Dispatch to swarm',
      },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    eyebrow: 'Real posting',
    title: 'Connect a real Instagram account',
    intro:
      'Automated publishing needs a Business/Creator account through the Graph API.',
    steps: [
      {
        title: '1 · Switch to Creator/Business',
        why: 'Instagram app → Settings → Account type and tools.',
        code: '# link a Facebook Page, then create an app with instagram_content_publish',
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
        {copied ? 'copied' : 'copy'}
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
          Phone-free means <strong>Cloudflare + GitHub, not the phone</strong>: deploy with wrangler, add two
          GitHub secrets, and the hourly workflow keeps writing while every device of yours is off.
        </p>
        <div className="guide-warning">
          Your clone had no package.json because the repo only held a README. The full source is on main now.
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
