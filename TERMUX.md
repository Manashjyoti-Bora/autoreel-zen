# Termux → running AUTOREEL ZEN on your phone

This whole page is optional. **Phone-free 24×7 means Cloudflare + GitHub, not the phone**; Termux is
only a local test bench. If you just want the studio online, read
[README → Hands-free 24×7](README.md#hands-free-24x7) instead.

## What your errors meant

```
npm error path /data/data/com.termux/files/home/autoreel-zen/package.json
npm error enoent Could not read package.json
```

`npm run` works in the folder you are standing in. That clone was empty because the repository
only held a README at the time — it is not a Termux problem, and there was nothing to run.

The repository now contains the full source. Pull it:

```bash
cd ~
ls package.json || git clone https://github.com/Manashjyoti-Bora/autoreel-zen.git
cd ~/autoreel-zen
git pull origin main
ls package.json worker src
```

You must see `package.json`, `worker/` and `src/` before going further.

```
Something wicked happened resolving 'termux.net:https' (7)
```

That is the phone's DNS or package mirror, not the project. Switch the mirror once:

```bash
termux-change-repo
# choose: Main repository → Mirror by Grimler or Tsinghua, confirm
pkg update -y && pkg upgrade -y
```

You already have Node 26 and npm 11, so you can skip `pkg install` entirely.

## 1. Install and run

```bash
cd ~/autoreel-zen
npm install
npm run dev
```

Open `http://localhost:3000` in the phone browser. On the same Wi-Fi, other devices can use
`http://<phone-ip>:3000`.

## 2. Keep it alive

Closing Termux stops the server:

```bash
cd ~/autoreel-zen
nohup npm run dev > ~/autoreel.log 2>&1 &
tail -f ~/autoreel.log
```

Stop it later with the recorded process, not a broad pattern:

```bash
pkill -f "wrangler dev"
```

## 3. When something breaks

```bash
cd ~/autoreel-zen
rm -rf node_modules package-lock.json
npm install
npm run build
```

`npm error ENOENT` → wrong folder.
`command not found: wrangler` → use `npx wrangler …`.
`EADDRINUSE` → something already uses port 3000; run `npm run start` with `--port 3001`.

## 4. The real "phone free" path: Cloudflare + GitHub

A phone is a bad server: it sleeps, the battery optimiser kills Termux, and mobile networks block
inbound traffic. Deploy once and nothing of yours needs to be switched on:

```bash
cd ~/autoreel-zen
npx wrangler login
npx wrangler d1 create autoreel-zen
npx wrangler r2 bucket create autoreel-zen-media
# paste the printed database_id into wrangler.jsonc
npm run build
npx wrangler deploy
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put APP_ORIGIN
npx wrangler secret put GROQ_API_KEY   # optional, free tier
```

Then in GitHub: **Settings → Secrets and variables → Actions** and add

| Secret | Value |
| --- | --- |
| `AUTOREEL_BASE_URL` | `https://autoreel-zen.<your-subdomain>.workers.dev` |
| `AUTOREEL_CRON_SECRET` | the same value you gave `CRON_SECRET` |

The workflow in `.github/workflows/autopilot.yml` calls `/api/autopilot/tick` every hour.
Enable it under **Actions → Autopilot tick → Enable workflow**.

That is the whole hands-free loop: GitHub wakes it up, the Worker writes, designs, scores,
schedules and publishes reels. Nothing of yours needs to be switched on.

---

## Honest limits

- Instagram publishing needs a **Business/Creator** account + Facebook Page + a long-lived
  token with `instagram_content_publish`. There is no free bypass.
- Reels need a finished 9:16 mp4 at a public https URL. The app writes the shot list, cover and
  caption; it does not render video.
- Without a model key the deterministic draft engine writes the posts. They are readable but
  repetitive — a free Groq or Gemini key changes that a lot.
- No tool can guarantee virality. The score in the UI is a heuristic, not a prediction.
