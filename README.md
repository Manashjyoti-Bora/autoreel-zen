# AUTOREEL ZEN

Hands-free Instagram studio: type one topic — or paste a real reel link — and a 1,000-agent swarm writes it, designs the visual, scores it, schedules it, publishes it, and derives the next idea from the last one. Reels come first. Data lives in D1 and can be committed to GitHub. It runs on free model providers if you want, and ships a catalogue of 255 free / open-source building blocks.

## Run locally

```bash
npm install
npm run dev          # builds the client + worker, serves on http://localhost:3000
```

The repository on `main` contains the full source (client, worker, scripts, docs) — a fresh
`git clone` is enough to run it.

The first request creates the D1 tables and the default settings row automatically.

Phone / Termux? Use **[TERMUX.md](TERMUX.md)** — it explains the `ENOENT … package.json` error (you ran `npm` outside the project folder) and gives every command to copy. The same steps are inside the app under **Run guide**, each with a copy button. Termux is optional; 24×7 lives on Cloudflare.

## Reels first

Reels are the default format, not an afterthought. With **Format → Reel** the swarm adds
cover-frame, subtitles, loop-maker and audio-mood agents to the trace and produces:

- a timed shot list — `0-3s | on-screen text | what the camera shows`, six shots, loop point at the end
- a 4:5 cover frame (also used as the reel cover)
- a caption whose first line is the hook, plus the hashtag set
- a downloadable **reel kit** (`GET /api/posts/:id/reel-kit`, `PostCard → Reel kit`)

To publish, put the finished 9:16 mp4 at a public https URL, paste it into the card's video
field (`POST /api/posts/:id/video`), then Publish. The publisher calls the Graph API with
`media_type=REELS`, `video_url` and `cover_url`, waits for transcoding and publishes. No
video is rendered for you — the swarm writes the reel, the kit tells you exactly what to
shoot, and the same endpoint posts it hands-free once the URL exists. Without a video URL
Publish returns the reel kit instead of pretending something was posted.

## Remix a real post

Paste any public Instagram post, reel or IGTV link into **Console → Remix a real post**. The swarm reads the post text and returns five original angles — never a repost, never copied wording.

How the read works, honestly:

1. `POST /api/inspiration` fetches the public embed page (`/embed/captioned/`) and extracts the caption.
2. If Instagram blocks the server it tries a text mirror, and labels the result `text mirror` instead of pretending it read the post.
3. If both fail it says so and asks for the caption text — the box in the UI. Pasted text is the most reliable input.

Every result is labelled `read live`, `text mirror`, `your caption` or `link only`, so you always know what the model actually saw. Angles are model-written when a provider key is set and deterministic templates otherwise.

## Free stack

The **Free stack** view lists 255 verified free / open-source building blocks (models, agent frameworks, workflow tools, hosting, data, UI kits) plus the live state of the model fallback chain. `GET /api/resources` is public and cacheable.

## Secrets

Set these with `wrangler secret put NAME` (or in the Sites dashboard → Secrets) — never commit them.

| Name | What it does |
| --- | --- |
| `APP_PASSWORD` | Locks the studio. Without it the dashboard is open to anyone who finds the URL. |
| `SESSION_SECRET` | Optional separate signing key for the session cookie. |
| `CRON_SECRET` | Required header value for the hourly autopilot tick. |
| `APP_ORIGIN` | Public origin, used to build the public image URL Instagram fetches. |
| `OPENAI_API_KEY` | OpenAI-compatible key for copy generation. Without it a deterministic draft engine runs. |
| `OPENAI_BASE_URL` | Chat endpoint base, defaults to `https://freebuff.com/api/v1/paid`. |
| `IMAGE_API_KEY` | Optional separate key for `/images/generations`. Falls back to `OPENAI_API_KEY`. |
| `IMAGE_BASE_URL` | Image endpoint base. |
| `GROQ_API_KEY` | Free Groq developer tier. |
| `OPENROUTER_API_KEY` | Free OpenRouter `:free` models. |
| `GEMINI_API_KEY` | Free Google AI Studio quota. |
| `CEREBRAS_API_KEY` | Free Cerebras tier. |
| `MISTRAL_API_KEY` | Free Mistral experiment tier. |
| `TOGETHER_API_KEY` | Together's dedicated `-Free` endpoint. |
| `GITHUB_MODELS_TOKEN` | Free GitHub Models access. |
| `OLLAMA_BASE_URL` | Local Ollama server URL, e.g. `http://127.0.0.1:11434/v1` (no key, no bill). |
| `OLLAMA_MODEL` | Local model name, defaults to `llama3.2`. |

Without an image key the visual engine uses keyless stock photos and every card is labelled `stock visual`.

## Hands-free 24×7

Phone-free means **Cloudflare + GitHub, not the phone**: `wrangler deploy` puts the Worker and
its cron route online, and `.github/workflows/autopilot.yml` wakes it hourly. Add two repo
secrets and nothing of yours needs to be powered on:

| Secret | Value |
| --- | --- |
| `AUTOREEL_BASE_URL` | your deployed origin, no trailing slash |
| `AUTOREEL_CRON_SECRET` | same value as the Worker's `CRON_SECRET` |

Then enable the workflow under **Actions → Autopilot tick**.

```bash
npm install -g wrangler
wrangler login
wrangler d1 create autoreel-zen
wrangler r2 bucket create autoreel-zen-media   # paste the d1 id into wrangler.jsonc
npm run build
wrangler deploy
wrangler secret put APP_PASSWORD
wrangler secret put SESSION_SECRET
wrangler secret put CRON_SECRET
wrangler secret put APP_ORIGIN
```

Run those from a laptop or a phone — either works, and after the deploy neither has to stay on.

## Free model chain

Copy generation is provider-agnostic and free-first. Set any of the keys above and it joins the chain; the swarm tries each configured provider in order and moves to the next on a failed call (bad key, rate limit, timeout). With nothing configured it uses the deterministic draft engine, so the studio never breaks.

Order: Freebuff → Groq → OpenRouter → Google AI Studio → Cerebras → Mistral → Together → GitHub Models → Ollama.

**Free stack** in the sidebar shows which providers are live for this deployment, where to get each key, and the 255-resource catalogue below.

## Free stack catalogue

`shared/resources.ts` maps 255 real zero-cost options across eight lanes: free LLM APIs, agent frameworks, workflow engines, image/video/audio tooling, hosting, databases and storage, UI/design assets, and DevOps/observability. Each entry carries a `free` label — `Open source`, `Free tier`, `Free credits` or `Free & keyless` — so you know how it is free before clicking.

Nothing in the catalogue is installed or called. It is a map for extending this project, served at `GET /api/resources`.

## Instagram publishing

The publisher uses the Instagram Graph API content publishing flow (`/media` → poll → `/media_publish`). You need:

1. An Instagram Business or Creator account linked to a Facebook Page.
2. An app with `instagram_basic` + `instagram_content_publish`.
3. A long-lived access token, and the IG user id.

Enter both in **Autopilot → Instagram → Save & verify**. The image URL Instagram fetches is served from this app (`/api/media/…`), so the deployment must be publicly reachable over https. Until it is connected, pressing publish returns a manual package (caption + hashtags + image URL) and the post stays in the queue.

## Hands-free scheduling

`POST /api/autopilot/tick` with the header `x-cron-secret: $CRON_SECRET` publishes due posts, produces drafts, and queues a new topic derived from the last published post. The bundled workflow `.github/workflows/autopilot.yml` calls it hourly — set `AUTOREEL_BASE_URL` and `AUTOREEL_CRON_SECRET` as repository secrets.

While the dashboard is open it also ticks itself every five minutes.

## GitHub data backup

Add a fine-grained token with `contents: write` for the target repo, then press **Backup now**. The app commits `data/latest.json` plus `data/archive/YYYY-MM-DD.json` with posts, campaigns and stats. Tokens entered in the UI are stored in D1 in the single-tenant settings row; prefer `APP_PASSWORD` protection or keep the repo private.

## Notes

- The 1,000 agents are a real registry of 104 hand-written specialists plus 896 generated review lanes (8 departments × 125). Around two dozen entries make model calls; the rest are deterministic checks and transforms, and generated entries are marked `rule`. The trace panel shows exactly which ran, with real timings. A bigger roster is a better checklist, not more intelligence — 1,000 passing checks still cannot promise a viral post.
- The virality number is a rule-based heuristic, not a prediction. Nothing can guarantee a viral post.
- Cost guard: generated agents never spend tokens, and the copy chain stops at the first working provider, so adding more free keys cannot increase spend.
