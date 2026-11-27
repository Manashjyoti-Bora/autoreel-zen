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
        title: '4 - Install and build',
        why: 'wrangler is an optional dependency, so Android skips its workerd binary instead of aborting the install. The build only needs vite and esbuild.',
        code: 'cd ~/autoreel-zen\nnpm install\nnpm run check',
        note: 'The Unsupported platform: android arm64 error is expected and harmless. Deploy from GitHub, not the phone.',
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
    title: 'Put it online for 24x7 (GitHub deploys it)',
    intro:
      'A laptop or phone can sleep. .github/workflows/deploy.yml builds the Worker on GitHub, creates D1 + R2 if they are missing, and deploys it. Your phone never installs wrangler and never builds anything.',
    steps: [
      {
        title: '1 - Add the Cloudflare credentials',
        why: 'Cloudflare, My Profile, API Tokens, use the Edit Cloudflare Workers template. The account id is on the right side of any dashboard page.',
        code: 'GitHub, Settings, Secrets and variables, Actions\nCLOUDFLARE_API_TOKEN = <token with Workers + D1 + R2 edit>\nCLOUDFLARE_ACCOUNT_ID = <your account id>',
      },
      {
        title: '2 - Add the app secrets',
        why: 'The workflow pushes them to the Worker on every deploy. Never commit them.',
        code: 'APP_PASSWORD   = the studio password\nSESSION_SECRET = a random string\nCRON_SECRET    = a random string\nGROQ_API_KEY   = optional free model key',
        note: 'APP_ORIGIN is optional: the Worker uses the request origin when it is unset.',
      },
      {
        title: '3 - Push to main',
        why: 'Actions, Deploy to Cloudflare builds, creates autoreel-zen (D1) and autoreel-zen-media (R2), then deploys. Repeat pushes redeploy.',
        code: 'git add -A && git commit -m "deploy" && git push origin main\n# or: Actions, Deploy to Cloudflare, Run workflow',
        note: 'From a laptop you can run the same script: npm run deploy (needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or wrangler login once).',
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
          <strong>Phone-free means Cloudflare + GitHub, not the phone.</strong> Push to main and
          .github/workflows/deploy.yml builds, creates D1 + R2 and deploys; the hourly workflow then keeps posting
          while every device of yours stays off. Termux is only a local test bench, and it never needs wrangler.
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
