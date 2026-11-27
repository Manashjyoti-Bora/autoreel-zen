# Termux → the phone is optional

This page is only for running the studio **locally on Android**. Nothing here is needed for
24×7: that is **Cloudflare + GitHub**, and it builds and deploys without your phone
(see [README → Hands-free 24×7](README.md#hands-free-24x7)).

## Fix the exact errors from the screenshots

Your paste hit four errors in a row. They all come from one thing: an **old clone** (it said
`autoreel-zen@1.3.0`), from before the phone server existed. `node scripts/serve-local.mjs`
and `npm run serve` did not exist in that version, and `wrangler` was still a required
dependency, so `workerd`'s missing Android build aborted the install and `vite` never arrived.

| What you saw | Why | Fix |
| --- | --- | --- |
| `fatal: destination path 'autoreel-zen' already exists` | the folder was already cloned | do not clone again — update it (below) |
| `workerd/install.js … Unsupported platform: android arm64 LE` | old clone had `wrangler` as a required dependency | update to current `main`, where it is **optional** |
| `vite: not found` | `npm install` aborted before installing `vite` | update, then install again |
| `Missing script: "serve"` | the clone is from before `npm run serve` | update to current `main` |

Update the existing folder — no deleting, no re-cloning:

```bash
cd ~/autoreel-zen
git pull origin main
grep '"version"' package.json      # must not say 1.3.0
npm install
npm run build
```

`wrangler` is an **optional** dependency now, so on Termux npm skips the missing `workerd`
binary, prints a warning, and finishes installing everything the build needs. You do not
deploy from the phone, so that binary costs you nothing. If an old `node_modules` keeps
failing, remove only that folder and install again:

```bash
cd ~/autoreel-zen
rm -rf node_modules
npm install
```

`npm error enoent Could not read package.json` means `npm` ran outside the project folder.
`cd ~/autoreel-zen` first; `ls package.json` must list the file.

## Install and run the interface on the phone

`npm run serve` serves the built client with plain Node — no `wrangler`, no `workerd` — and
forwards `/api` to your deployed Worker. The Worker URL is **remembered**, so you type it once:

```bash
cd ~/autoreel-zen
git pull origin main
npm install
npm run build
npm run serve -- https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev
```

The URL is saved to `~/.autoreel-remote`. Every run after that is just:

```bash
cd ~/autoreel-zen && npm run serve
```

Open **http://localhost:3000** on the phone (or `http://<phone-ip>:3000` from the same Wi-Fi).
Useful extras:

```bash
npm run serve -- --help      # usage
npm run serve -- --forget    # forget the saved Worker URL
```

`AUTOREEL_REMOTE=https://… npm run serve` still works for a one-off URL and also replaces the
saved one. Without any URL the interface loads but `/api` answers 502 with a reminder.

`npm run start` (the `wrangler dev` path) cannot work on Android — `workerd` has no arm64
Termux build. Use `npm run serve` there; use `npm run start` only on a laptop.

## Keep the phone server alive 24×7

Termux is killed by Android's battery optimiser unless you hold a wake lock. One-time, inside
Termux:

```bash
pkg install termux-api
termux-wake-lock
mkdir -p ~/.shortcuts && cat > ~/.shortcuts/autoreel <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
export PATH="$PREFIX/bin:$PATH"
cd ~/autoreel-zen
exec node scripts/serve-local.mjs
SH
chmod +x ~/.shortcuts/autoreel
```

The `~/.shortcuts` script is what the Termux:Widget launcher tile runs, so one tap restarts it
after a reboot. To run it in the background instead (the saved URL means no long command):

```bash
cd ~/autoreel-zen
nohup npm run serve > ~/autoreel.log 2>&1 &
echo $! > ~/autoreel.pid
tail -f ~/autoreel.log
```

Stop it with the recorded pid, never a broad pattern:

```bash
kill "$(cat ~/autoreel.pid)" && rm -f ~/autoreel.pid
```

The phone server is a convenience screen. The thing that keeps publishing at 03:00 while the
phone is asleep is the Cloudflare Worker plus the hourly GitHub Actions tick — so the studio is
still 24×7 even when Termux is closed.

## The real phone-free path

Do this once from any machine, or skip it entirely and let GitHub do it:

```bash
npm run deploy       # creates D1 + R2, builds, deploys
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put GROQ_API_KEY    # optional, free tier
```

On the phone, do not run these — `workerd` has no Android build. Push to GitHub instead and
`.github/workflows/deploy.yml` does the same thing on a Linux runner:

1. GitHub → **Settings → Secrets and variables → Actions**
2. Add `CLOUDFLARE_API_TOKEN` (Workers + D1 + R2 edit permissions) and `CLOUDFLARE_ACCOUNT_ID`.
3. Add `APP_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET` and any model keys you use.
4. Push to `main`, or run **Actions → Deploy to Cloudflare → Run workflow**.

Then enable the hourly tick: add `AUTOREEL_BASE_URL` (your `*.workers.dev` origin) and
`AUTOREEL_CRON_SECRET` (same value as `CRON_SECRET`) as repository secrets, and enable
**Actions → Autopilot tick**.

---

## Honest limits

- Instagram publishing needs a **Business/Creator** account + Facebook Page + a long-lived
  token with `instagram_content_publish`. There is no free bypass.
- Reels need a finished 9:16 mp4 at a public https URL. The app writes the shot list, cover and
  caption; it does not render video.
- Carousels publish 2–10 real slide images through the Graph API carousel flow. The slide text
  is written by the swarm, but the app does not typeset that text onto the images.
- Without a model key the deterministic draft engine writes the posts. They are readable but
  repetitive — a free Groq or Gemini key changes that a lot.
- No tool can guarantee virality. The score in the UI is a heuristic, not a prediction.
