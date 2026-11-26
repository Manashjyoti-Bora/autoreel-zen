# AUTOREEL ZEN

Hands-free Instagram studio: type one topic, a 104-agent swarm writes it, designs the visual, scores it, schedules it, publishes it, and derives the next idea from the last one. Data lives in D1 and is committed to this repository as JSON snapshots.

## Run locally

```bash
npm install
npm run dev          # builds the client + worker, serves on http://localhost:3000
```

The first request creates the D1 tables and the default settings row automatically.

## Secrets

Set these with `wrangler secret put NAME` (or in the hosting dashboard) — never commit them.

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

Without an image key the visual engine uses keyless stock photos and every card is labelled `stock visual`.

## Instagram publishing

The publisher uses the Instagram Graph API content publishing flow (`/media` -> poll -> `/media_publish`). You need:

1. An Instagram Business or Creator account linked to a Facebook Page.
2. An app with `instagram_basic` + `instagram_content_publish`.
3. A long-lived access token, and the IG user id.

Enter both in **Autopilot -> Instagram -> Save & verify**. The image URL Instagram fetches is served from this app (`/api/media/...`), so the deployment must be publicly reachable over https. Until it is connected, pressing publish returns a manual package (caption + hashtags + image URL) and the post stays in the queue.

Reels (actual video) are not generated: the pipeline produces photo, carousel and quote posts. A video provider would need to be added for reels.

## Hands-free scheduling

`POST /api/autopilot/tick` with the header `x-cron-secret: $CRON_SECRET` publishes due posts, produces drafts, and queues a new topic derived from the last published post. The bundled workflow `.github/workflows/autopilot.yml` calls it hourly — set `AUTOREEL_BASE_URL` and `AUTOREEL_CRON_SECRET` as repository secrets.

While the dashboard is open it also ticks itself every five minutes.

## GitHub data backup

Add a fine-grained token with `contents: write` for the target repo, then press **Backup now**. The app commits `data/latest.json` plus `data/archive/YYYY-MM-DD.json` with posts, campaigns and stats.

## Notes

- The 104 agents are a real registry: a subset runs as model calls, the rest are deterministic checks and transforms. The trace panel shows exactly which ran, with real timings.
- The virality number is a rule-based heuristic, not a prediction. Nothing can guarantee a viral post.
