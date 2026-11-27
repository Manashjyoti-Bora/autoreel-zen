# Termux → the phone is optional

This page is only for running the studio **locally on Android**. Nothing here is needed for
24×7: that is **Cloudflare + GitHub**, and it builds and deploys without your phone
(see [README → Hands-free 24×7](README.md#hands-free-24x7)).

## The two errors you hit

### `npm error path …/node_modules/workerd/install.js` → `Unsupported platform: android arm64 LE`

`wrangler` ships a native binary (`workerd`) that does not exist for Android. It used to be a
normal dependency, so one missing Android build aborted the whole `npm install` and `vite`
never got installed — which is why `npm run build` then said `vite: not found`.

That is fixed: `wrangler` is now an **optional** dependency. On Termux npm skips it, prints a
warning, and finishes installing everything the build needs. You do not deploy from the phone,
so the missing binary costs you nothing.

### `npm error enoent Could not read package.json`

You ran `npm` outside the project folder, or the clone was empty. Check first:

```bash
cd ~/autoreel-zen
ls package.json
```

If that fails, clone again:

```bash
cd ~
rm -rf autoreel-zen
git clone https://github.com/Manashjyoti-Bora/autoreel-zen.git
cd autoreel-zen
```

## Install and run the interface on the phone

`npm run serve` serves the built client with plain Node — no `wrangler`, no `workerd`, so it
works on Android. It forwards `/api` to your deployed Worker, so the phone shows the real
interface with real data while the 24×7 engine stays on Cloudflare.

```bash
cd ~/autoreel-zen
git pull origin main
npm install                    # wrangler is skipped on Android — that warning is expected
npm run build                  # typecheck-free build, always works on Android
AUTOREEL_REMOTE=https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev npm run serve
```

Open **http://localhost:3000** on the phone (or `http://<phone-ip>:3000` from the same Wi-Fi).
Without `AUTOREEL_REMOTE` the interface still loads but `/api` answers 502 with a reminder.

`npm run start` (the `wrangler dev` path) cannot work on Android — `workerd` has no arm64 Termux
build. Use `npm run serve` there; use `npm run start` only on a laptop.

## Keep the phone server alive 24×7

Termux is killed by Android's battery optimiser unless you hold a wake lock. One-time, inside
Termux:

```bash
termux-wake-lock            # from the termux-api package: pkg install termux-api
mkdir -p ~/.shortcuts && cat > ~/.shortcuts/autoreel <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/autoreel-zen
export AUTOREEL_REMOTE=https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev
exec node scripts/serve-local.mjs
SH
chmod +x ~/.shortcuts/autoreel
```

The `~/.shortcuts` script is what the Termux:Widget launcher tile runs, so one tap restarts it
after a reboot. To run it in the background instead:

```bash
cd ~/autoreel-zen
export AUTOREEL_REMOTE=https://autoreel-zen.YOUR-SUBDOMAIN.workers.dev
nohup node scripts/serve-local.mjs > ~/autoreel.log 2>&1 &
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
- Without a model key the deterministic draft engine writes the posts. They are readable but
  repetitive — a free Groq or Gemini key changes that a lot.
- No tool can guarantee virality. The score in the UI is a heuristic, not a prediction.
