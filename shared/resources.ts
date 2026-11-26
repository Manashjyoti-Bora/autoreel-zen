/**
 * A curated catalogue of genuinely free resources: open-source projects you can
 * self-host and services with a real free tier. Every entry is a real project
 * with a real homepage. It is a map, not a dependency list — nothing here is
 * installed or called unless the owner wires it in.
 *
 * `free` describes how the project is free, so the label can be trusted:
 *   'Open source'      — source available, self-host at no licence cost
 *   'Free tier'        — hosted, no card required for the published free plan
 *   'Free credits'     — trial credit or free quota, not forever
 *   'Free & keyless'   — usable with no account at all
 *
 * Entries were checked against their project homepages in November 2026.
 */

export type ResourceKind =
  | 'llm'
  | 'agents'
  | 'workflow'
  | 'media'
  | 'hosting'
  | 'data'
  | 'ui'
  | 'devops';

export interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  url: string;
  description: string;
  free: string;
}

export interface ResourceKindDef {
  id: ResourceKind;
  label: string;
  blurb: string;
}

export const RESOURCE_KINDS: ResourceKindDef[] = [
  { id: 'llm', label: 'Free LLM APIs', blurb: 'chat + reasoning endpoints, most with an OpenAI-compatible URL' },
  { id: 'agents', label: 'Agent frameworks', blurb: 'swarms, tool use, memory, evaluation' },
  { id: 'workflow', label: 'Workflow engines', blurb: 'scheduling, queues, retries, durable runs' },
  { id: 'media', label: 'Image · video · audio', blurb: 'generation, editing, rendering, transcription' },
  { id: 'hosting', label: 'Hosting & deploy', blurb: 'free hosting, static, containers, PaaS' },
  { id: 'data', label: 'Data & storage', blurb: 'SQL, vector, object, realtime, search' },
  { id: 'ui', label: 'UI & design', blurb: 'components, motion, icons, images, charts' },
  { id: 'devops', label: 'DevOps & observability', blurb: 'CI, monitoring, errors, analytics' },
];

type Row = [string, ResourceKind, string, string, string];

const RAW: Row[] = [
  // ── Free / open LLM access ────────────────────────────────────────────────
  ['Groq', 'llm', 'https://console.groq.com', 'Free developer tier on custom LPU hardware; OpenAI-compatible chat completions.', 'Free tier'],
  ['OpenRouter', 'llm', 'https://openrouter.ai', 'One key for hundreds of models, including a rotating set of `:free` variants.', 'Free tier'],
  ['Google AI Studio', 'llm', 'https://aistudio.google.com', 'Gemini models with a free daily quota and an OpenAI-compatible endpoint.', 'Free tier'],
  ['Cerebras Inference', 'llm', 'https://cloud.cerebras.ai', 'Free tier with very high tokens-per-second on Llama models.', 'Free tier'],
  ['Mistral La Plateforme', 'llm', 'https://console.mistral.ai', 'Free experiment tier across the Mistral small models.', 'Free tier'],
  ['Together AI', 'llm', 'https://api.together.ai', 'Hosts dedicated `-Free` Llama endpoints alongside paid serverless models.', 'Free tier'],
  ['GitHub Models', 'llm', 'https://github.com/marketplace/models', 'Free, rate-limited access to hosted models with a GitHub account.', 'Free tier'],
  ['Cloudflare Workers AI', 'llm', 'https://developers.cloudflare.com/workers-ai/', 'Daily free neuron allocation for LLMs, images and embeddings at the edge.', 'Free tier'],
  ['Hugging Face Inference', 'llm', 'https://huggingface.co/docs/api-inference', 'Serverless inference for thousands of open models, free monthly credits.', 'Free credits'],
  ['NVIDIA NIM', 'llm', 'https://build.nvidia.com', 'Free API credits for NIM-hosted open models including Llama and Qwen.', 'Free credits'],
  ['SambaNova Cloud', 'llm', 'https://cloud.sambanova.ai', 'Free tier for fast open-model inference.', 'Free tier'],
  ['Hyperbolic', 'llm', 'https://hyperbolic.xyz', 'Open-model inference with starter credits and cheap per-token pricing.', 'Free credits'],
  ['Novita AI', 'llm', 'https://novita.ai', 'Model and image APIs with trial credits for new accounts.', 'Free credits'],
  ['Alibaba Model Studio', 'llm', 'https://www.alibabacloud.com/product/modelstudio', 'Qwen models with a free quota for new accounts.', 'Free credits'],
  ['Zhipu BigModel', 'llm', 'https://open.bigmodel.cn', 'GLM models; the flash variants are free to call.', 'Free tier'],
  ['Ollama', 'llm', 'https://ollama.com', 'Run open models locally with one command and an OpenAI-compatible server.', 'Open source'],
  ['llama.cpp', 'llm', 'https://github.com/ggml-org/llama.cpp', 'The reference C/C++ inference engine behind most local model runners.', 'Open source'],
  ['vLLM', 'llm', 'https://github.com/vllm-project/vllm', 'High-throughput serving engine for open models, PagedAttention.', 'Open source'],
  ['LM Studio', 'llm', 'https://lmstudio.ai', 'Desktop app for running local models with a local API server.', 'Free tier'],
  ['GPT4All', 'llm', 'https://gpt4all.io', 'Offline desktop chat over local models, no account.', 'Open source'],
  ['Jan', 'llm', 'https://jan.ai', 'Open-source, offline-first ChatGPT alternative with a local server.', 'Open source'],
  ['LocalAI', 'llm', 'https://localai.io', 'Drop-in OpenAI replacement you can self-host on modest hardware.', 'Open source'],
  ['llamafile', 'llm', 'https://github.com/Mozilla-Ocho/llamafile', 'Single-file executables that bundle a model and its runtime.', 'Open source'],
  ['text-generation-webui', 'llm', 'https://github.com/oobabooga/text-generation-webui', 'The long-standing local UI for GGUF, EXL2 and Transformers models.', 'Open source'],
  ['Unsloth', 'llm', 'https://github.com/unslothai/unsloth', 'Faster, lower-memory fine-tuning of open models on a single GPU.', 'Open source'],
  ['Open WebUI', 'llm', 'https://github.com/open-webui/open-webui', 'Self-hosted chat UI that speaks to Ollama and any OpenAI-compatible API.', 'Open source'],
  ['LibreChat', 'llm', 'https://github.com/danny-avila/LibreChat', 'Multi-provider chat front end with agents, plugins and presets.', 'Open source'],
  ['Ax', 'llm', 'https://github.com/ax-llm/ax', 'TypeScript framework for typed LLM programs and agent pipelines.', 'Open source'],

  // ── Agent frameworks ──────────────────────────────────────────────────────
  ['LangChain', 'agents', 'https://github.com/langchain-ai/langchain', 'The broadest ecosystem of model, tool and retriever integrations.', 'Open source'],
  ['LangGraph', 'agents', 'https://github.com/langchain-ai/langgraph', 'Stateful graph runtime for multi-actor agents with checkpoints.', 'Open source'],
  ['LlamaIndex', 'agents', 'https://github.com/run-llama/llama_index', 'Data framework for retrieval, indexing and document agents.', 'Open source'],
  ['CrewAI', 'agents', 'https://github.com/crewAIInc/crewAI', 'Role-based agent crews with tasks and delegation.', 'Open source'],
  ['AutoGen', 'agents', 'https://github.com/microsoft/autogen', 'Microsoft multi-agent conversation framework.', 'Open source'],
  ['AG2', 'agents', 'https://github.com/ag2ai/ag2', 'Community continuation of AutoGen with group chats and tool use.', 'Open source'],
  ['OpenAI Agents SDK', 'agents', 'https://github.com/openai/openai-agents-python', 'Small, provider-agnostic agent loop with handoffs and guardrails.', 'Open source'],
  ['PydanticAI', 'agents', 'https://github.com/pydantic/pydantic-ai', 'Typed agent framework with structured outputs and dependency injection.', 'Open source'],
  ['Mastra', 'agents', 'https://github.com/mastra-ai/mastra', 'TypeScript agent framework with workflows, RAG and evals.', 'Open source'],
  ['Semantic Kernel', 'agents', 'https://github.com/microsoft/semantic-kernel', 'Microsoft SDK for plugins, planners and agents across languages.', 'Open source'],
  ['Haystack', 'agents', 'https://github.com/deepset-ai/haystack', 'Production RAG and agent pipelines with evaluation built in.', 'Open source'],
  ['smolagents', 'agents', 'https://github.com/huggingface/smolagents', 'Minimal code-writing agents from Hugging Face.', 'Open source'],
  ['Agno', 'agents', 'https://github.com/agno-agi/agno', 'Fast, lightweight multi-agent runtime with memory and toolkits.', 'Open source'],
  ['Google ADK', 'agents', 'https://github.com/google/adk-python', 'Agent Development Kit with multi-agent orchestration and tooling.', 'Open source'],
  ['Strands Agents', 'agents', 'https://github.com/strands-agents/sdk-python', 'Model-driven agent SDK with a small core.', 'Open source'],
  ['MetaGPT', 'agents', 'https://github.com/geekan/MetaGPT', 'Assigns software-company roles to agents for end-to-end builds.', 'Open source'],
  ['ChatDev', 'agents', 'https://github.com/OpenBMB/ChatDev', 'Role-play virtual company of agents that ships small apps.', 'Open source'],
  ['OpenHands', 'agents', 'https://github.com/All-Hands-AI/OpenHands', 'Open platform for software agents that run tools and edit code.', 'Open source'],
  ['Aider', 'agents', 'https://github.com/Aider-AI/aider', 'Terminal pair programmer with repo-aware edits and git commits.', 'Open source'],
  ['Cline', 'agents', 'https://github.com/cline/cline', 'Editor agent that can read, edit and run your project.', 'Open source'],
  ['Roo Code', 'agents', 'https://github.com/RooCodeInc/Roo-Code', 'Cline-derived agent with modes and custom instructions.', 'Open source'],
  ['Continue', 'agents', 'https://github.com/continuedev/continue', 'Open-source IDE assistant with pluggable models and context.', 'Open source'],
  ['Goose', 'agents', 'https://github.com/block/goose', 'Local, extensible engineering agent from Block.', 'Open source'],
  ['SWE-agent', 'agents', 'https://github.com/SWE-agent/SWE-agent', 'Research agent that turns issues into patches.', 'Open source'],
  ['Open Interpreter', 'agents', 'https://github.com/OpenInterpreter/open-interpreter', 'Natural-language interface that writes and runs code locally.', 'Open source'],
  ['Browser Use', 'agents', 'https://github.com/browser-use/browser-use', 'Lets agents drive a real browser through the DOM.', 'Open source'],
  ['Stagehand', 'agents', 'https://github.com/browserbase/stagehand', 'Composable browser automation primitives for AI agents.', 'Open source'],
  ['Skyvern', 'agents', 'https://github.com/Skyvern-AI/skyvern', 'Browser agents for form-heavy, visual workflows.', 'Open source'],
  ['Composio', 'agents', 'https://github.com/ComposioHQ/composio', 'Tool integrations and auth for agents across 100+ apps.', 'Open source'],
  ['Model Context Protocol', 'agents', 'https://github.com/modelcontextprotocol', 'Open standard for connecting models to tools and data.', 'Open source'],
  ['FastMCP', 'agents', 'https://github.com/jlowin/fastmcp', 'Ergonomic Python/TS server framework for MCP tools.', 'Open source'],
  ['Langflow', 'agents', 'https://github.com/langflow-ai/langflow', 'Visual builder for agent and RAG flows.', 'Open source'],
  ['Flowise', 'agents', 'https://github.com/FlowiseAI/Flowise', 'Drag-and-drop LLM app builder you can self-host.', 'Open source'],
  ['Dify', 'agents', 'https://github.com/langgenius/dify', 'LLMOps platform: agents, workflows, datasets, publishing.', 'Open source'],
  ['Letta', 'agents', 'https://github.com/letta-ai/letta', 'Stateful agents with long-term memory (formerly MemGPT).', 'Open source'],
  ['Mem0', 'agents', 'https://github.com/mem0ai/mem0', 'Memory layer that persists user and session context.', 'Open source'],
  ['Semantic Router', 'agents', 'https://github.com/aurelio-labs/semantic-router', 'Fast intent routing for agent decisions without a model call.', 'Open source'],
  ['Langfuse', 'agents', 'https://github.com/langfuse/langfuse', 'Open-source tracing, prompts and evals for LLM apps.', 'Open source'],
  ['Arize Phoenix', 'agents', 'https://github.com/Arize-ai/phoenix', 'Local-first tracing and evaluation for LLM and agent runs.', 'Open source'],
  ['AgentOps', 'agents', 'https://github.com/AgentOps-AI/agentops', 'Session replays and cost tracking for agents.', 'Open source'],
  ['Helicone', 'agents', 'https://github.com/Helicone/helicone', 'Proxy that logs, caches and rate-limits LLM traffic.', 'Open source'],
  ['OpenLLMetry', 'agents', 'https://github.com/traceloop/openllmetry', 'OpenTelemetry instrumentation for LLM calls.', 'Open source'],
  ['Promptfoo', 'agents', 'https://github.com/promptfoo/promptfoo', 'Test and red-team prompts and agent flows from the CLI.', 'Open source'],

  // ── Workflow, queues, scheduling ──────────────────────────────────────────
  ['n8n', 'workflow', 'https://github.com/n8n-io/n8n', 'Fair-code automation with 400+ nodes and native AI steps.', 'Open source'],
  ['Temporal', 'workflow', 'https://github.com/temporalio/temporal', 'Durable execution for long-running, retryable workflows.', 'Open source'],
  ['Apache Airflow', 'workflow', 'https://github.com/apache/airflow', 'The standard DAG scheduler for data and batch pipelines.', 'Open source'],
  ['Prefect', 'workflow', 'https://github.com/PrefectHQ/prefect', 'Python workflows with retries, caching and observability.', 'Open source'],
  ['Dagster', 'workflow', 'https://github.com/dagster-io/dagster', 'Asset-aware orchestration with strong local dev.', 'Open source'],
  ['Windmill', 'workflow', 'https://github.com/windmill-labs/windmill', 'Scripts and flows as internal tools, self-hosted.', 'Open source'],
  ['Activepieces', 'workflow', 'https://github.com/activepieces/activepieces', 'Open-source Zapier alternative with AI pieces.', 'Open source'],
  ['Node-RED', 'workflow', 'https://github.com/node-red/node-red', 'Low-code flow programming for events and APIs.', 'Open source'],
  ['Huginn', 'workflow', 'https://github.com/huginn/huginn', 'Agents that watch the web and act on changes.', 'Open source'],
  ['Kestra', 'workflow', 'https://github.com/kestra-io/kestra', 'Declarative YAML orchestrator for any language.', 'Open source'],
  ['Camunda', 'workflow', 'https://github.com/camunda/camunda', 'BPMN engine for business processes and human tasks.', 'Open source'],
  ['Restate', 'workflow', 'https://github.com/restatedev/restate', 'Durable handlers and virtual objects without a broker.', 'Open source'],
  ['Inngest', 'workflow', 'https://github.com/inngest/inngest', 'Event-driven functions with steps, retries and fan-out.', 'Open source'],
  ['Trigger.dev', 'workflow', 'https://github.com/triggerdotdev/trigger.dev', 'Background jobs and long tasks in TypeScript.', 'Open source'],
  ['Hatchet', 'workflow', 'https://github.com/hatchet-dev/hatchet', 'Task queue with durable workflows on Postgres.', 'Open source'],
  ['BullMQ', 'workflow', 'https://github.com/taskforcesh/bullmq', 'Redis-backed job queues for Node with retries and cron.', 'Open source'],
  ['River', 'workflow', 'https://github.com/riverqueue/river', 'Postgres-backed job queue for Go.', 'Open source'],
  ['Celery', 'workflow', 'https://github.com/celery/celery', 'Distributed Python task queue, battle-tested.', 'Open source'],
  ['Argo Workflows', 'workflow', 'https://github.com/argoproj/argo-workflows', 'Kubernetes-native container workflows.', 'Open source'],
  ['Flyte', 'workflow', 'https://github.com/flyteorg/flyte', 'Typed, reproducible data and ML pipelines.', 'Open source'],
  ['Kedro', 'workflow', 'https://github.com/kedro-org/kedro', 'Opinionated data pipeline framework with catalogues.', 'Open source'],
  ['StackStorm', 'workflow', 'https://github.com/StackStorm/st2', 'Event-driven ops automation with rules and packs.', 'Open source'],
  ['Apache NiFi', 'workflow', 'https://github.com/apache/nifi', 'Visual dataflow automation with provenance.', 'Open source'],
  ['Redpanda Connect', 'workflow', 'https://github.com/redpanda-data/connect', 'Declarative stream processing and connectors.', 'Open source'],
  ['GitHub Actions', 'workflow', 'https://github.com/features/actions', 'Free CI minutes on public repos; scheduled cron workflows.', 'Free tier'],
  ['cron-job.org', 'workflow', 'https://cron-job.org', 'Free HTTP cron scheduler for small jobs.', 'Free tier'],
  ['Upstash QStash', 'workflow', 'https://upstash.com/docs/qstash', 'Serverless message queue with schedules and retries.', 'Free tier'],
  ['Healthchecks.io', 'workflow', 'https://healthchecks.io', 'Cron and heartbeat monitoring with free checks.', 'Free tier'],
  ['Cloudflare Cron Triggers', 'workflow', 'https://developers.cloudflare.com/workers/configuration/cron-triggers/', 'Scheduled Workers on the free plan.', 'Free tier'],

  // ── Image, video, audio ───────────────────────────────────────────────────
  ['Stable Diffusion WebUI', 'media', 'https://github.com/AUTOMATIC1111/stable-diffusion-webui', 'The classic local image generation UI with extensions.', 'Open source'],
  ['ComfyUI', 'media', 'https://github.com/comfyanonymous/ComfyUI', 'Node-graph diffusion engine, the base for most local video work.', 'Open source'],
  ['Fooocus', 'media', 'https://github.com/lllyasviel/Fooocus', 'Simplified local image generation, quality defaults.', 'Open source'],
  ['InvokeAI', 'media', 'https://github.com/invoke-ai/InvokeAI', 'Polished local studio with canvas and layers.', 'Open source'],
  ['Diffusers', 'media', 'https://github.com/huggingface/diffusers', 'Python library for diffusion pipelines, easy to script.', 'Open source'],
  ['SD.Next', 'media', 'https://github.com/vladmandic/sdnext', 'Feature-rich fork with modern model support.', 'Open source'],
  ['Pollinations', 'media', 'https://pollinations.ai', 'Keyless image and text endpoints; availability varies, keep a fallback.', 'Free & keyless'],
  ['Wan', 'media', 'https://github.com/Wan-Video/Wan2.1', 'Open text-to-video models that run locally.', 'Open source'],
  ['LTX-Video', 'media', 'https://github.com/Lightricks/LTX-Video', 'Fast open video generation, real-time-ish on good GPUs.', 'Open source'],
  ['HunyuanVideo', 'media', 'https://github.com/Tencent/HunyuanVideo', 'Large open video generation model from Tencent.', 'Open source'],
  ['CogVideo', 'media', 'https://github.com/THUDM/CogVideo', 'Open text/image-to-video models.', 'Open source'],
  ['AnimateDiff', 'media', 'https://github.com/guoyww/AnimateDiff', 'Motion modules that animate diffusion images.', 'Open source'],
  ['Open-Sora', 'media', 'https://github.com/hpcaitech/Open-Sora', 'Open reproduction of Sora-style video generation.', 'Open source'],
  ['Remotion', 'media', 'https://github.com/remotion-dev/remotion', 'Programmatic video in React — the practical way to render reels.', 'Open source'],
  ['MoviePy', 'media', 'https://github.com/Zulko/moviepy', 'Python video editing: cuts, overlays, concatenation.', 'Open source'],
  ['FFmpeg', 'media', 'https://ffmpeg.org', 'The universal media transcoder and filter engine.', 'Open source'],
  ['Sharp', 'media', 'https://github.com/lovell/sharp', 'Fast Node image resizing, cropping and compositing.', 'Open source'],
  ['Satori', 'media', 'https://github.com/vercel/satori', 'JSX to SVG to PNG — generate quote cards in code.', 'Open source'],
  ['Whisper', 'media', 'https://github.com/openai/whisper', 'Open speech recognition, runs locally.', 'Open source'],
  ['faster-whisper', 'media', 'https://github.com/SYSTRAN/faster-whisper', 'CTranslate2 Whisper, much faster on CPU/GPU.', 'Open source'],
  ['Kokoro', 'media', 'https://github.com/hexgrad/kokoro', 'Tiny, high-quality open text-to-speech model.', 'Open source'],
  ['Piper', 'media', 'https://github.com/rhasspy/piper', 'Fast local neural TTS for many languages.', 'Open source'],
  ['Coqui TTS', 'media', 'https://github.com/coqui-ai/TTS', 'Voice cloning and multi-speaker TTS toolkit.', 'Open source'],
  ['Bark', 'media', 'https://github.com/suno-ai/bark', 'Expressive open TTS with music and laughter.', 'Open source'],
  ['AudioCraft', 'media', 'https://github.com/facebookresearch/audiocraft', 'MusicGen and AudioGen for generated music and sound.', 'Open source'],
  ['Stable Audio Tools', 'media', 'https://github.com/Stability-AI/stable-audio-tools', 'Open audio generation and processing models.', 'Open source'],
  ['Real-ESRGAN', 'media', 'https://github.com/xinntao/Real-ESRGAN', 'Practical image upscaling for low-res assets.', 'Open source'],
  ['rembg', 'media', 'https://github.com/danielgatis/rembg', 'Background removal as a library or CLI.', 'Open source'],
  ['Upscayl', 'media', 'https://github.com/upscayl/upscayl', 'Cross-platform desktop upscaler.', 'Open source'],

  // ── Hosting ───────────────────────────────────────────────────────────────
  ['Cloudflare Workers', 'hosting', 'https://workers.cloudflare.com', '100k requests/day free, global edge, cron and bindings.', 'Free tier'],
  ['Cloudflare Pages', 'hosting', 'https://pages.cloudflare.com', 'Static and full-stack hosting with free bandwidth.', 'Free tier'],
  ['Vercel Hobby', 'hosting', 'https://vercel.com', 'Free personal plan for frontends and serverless functions.', 'Free tier'],
  ['Netlify', 'hosting', 'https://netlify.com', 'Free static hosting, functions and form handling.', 'Free tier'],
  ['GitHub Pages', 'hosting', 'https://pages.github.com', 'Free static hosting straight from a repo.', 'Free tier'],
  ['Render', 'hosting', 'https://render.com', 'Free web services and static sites, sleeps when idle.', 'Free tier'],
  ['Fly.io', 'hosting', 'https://fly.io', 'Small always-on machines with a limited free allowance.', 'Free tier'],
  ['Koyeb', 'hosting', 'https://koyeb.com', 'Free instance for containers and functions.', 'Free tier'],
  ['Deno Deploy', 'hosting', 'https://deno.com/deploy', 'Free edge hosting for TypeScript with cron and KV.', 'Free tier'],
  ['Val Town', 'hosting', 'https://val.town', 'Free serverless functions and crons in the browser.', 'Free tier'],
  ['Surge', 'hosting', 'https://surge.sh', 'One-command static publishing, free tier.', 'Free tier'],
  ['Neocities', 'hosting', 'https://neocities.org', 'Free static hosting with a genuinely independent web feel.', 'Free tier'],
  ['Hugging Face Spaces', 'hosting', 'https://huggingface.co/spaces', 'Free CPU Spaces for demos, including Gradio and Streamlit.', 'Free tier'],
  ['StackBlitz', 'hosting', 'https://stackblitz.com', 'Full dev environment in the browser, free for public work.', 'Free tier'],
  ['CodeSandbox', 'hosting', 'https://codesandbox.io', 'Browser dev environments and instant previews.', 'Free tier'],
  ['Gitpod', 'hosting', 'https://gitpod.io', 'Ephemeral cloud dev environments, free hours.', 'Free tier'],
  ['Coolify', 'hosting', 'https://github.com/coollabsio/coolify', 'Self-hosted Heroku/Vercel replacement with a UI.', 'Open source'],
  ['Dokploy', 'hosting', 'https://github.com/Dokploy/dokploy', 'Open-source PaaS for apps, databases and cron.', 'Open source'],
  ['CapRover', 'hosting', 'https://github.com/caprover/caprover', 'One-click app deployment on your own VPS.', 'Open source'],
  ['Dokku', 'hosting', 'https://github.com/dokku/dokku', 'Tiny Heroku on a single server, git push deploys.', 'Open source'],
  ['Kamal', 'hosting', 'https://github.com/basecamp/kamal', 'Deploy containers anywhere without Kubernetes.', 'Open source'],
  ['Docker', 'hosting', 'https://www.docker.com', 'Container packaging, free for personal and small use.', 'Free tier'],
  ['Podman', 'hosting', 'https://podman.io', 'Daemonless container engine, fully open.', 'Open source'],
  ['Caddy', 'hosting', 'https://github.com/caddyserver/caddy', 'Automatic HTTPS reverse proxy in one binary.', 'Open source'],
  ['Traefik', 'hosting', 'https://github.com/traefik/traefik', 'Cloud-native router with automatic certificates.', 'Open source'],

  // ── Data & storage ────────────────────────────────────────────────────────
  ['Supabase', 'data', 'https://supabase.com', 'Postgres, auth, storage and realtime on a real free tier.', 'Free tier'],
  ['Neon', 'data', 'https://neon.com', 'Serverless Postgres with branching and a free plan.', 'Free tier'],
  ['Turso', 'data', 'https://turso.tech', 'SQLite at the edge with a generous free tier.', 'Free tier'],
  ['PocketBase', 'data', 'https://github.com/pocketbase/pocketbase', 'Single-file backend: SQLite, auth, files, realtime.', 'Open source'],
  ['Appwrite', 'data', 'https://github.com/appwrite/appwrite', 'Self-hosted auth, database, storage and functions.', 'Open source'],
  ['Directus', 'data', 'https://github.com/directus/directus', 'Instant API and admin over any SQL database.', 'Open source'],
  ['Strapi', 'data', 'https://github.com/strapi/strapi', 'Headless CMS with a free self-hosted tier.', 'Open source'],
  ['Firebase Spark', 'data', 'https://firebase.google.com', 'Free plan for Firestore, auth and hosting within quotas.', 'Free tier'],
  ['MongoDB Atlas', 'data', 'https://www.mongodb.com/atlas', 'Free 512 MB shared cluster, no card required.', 'Free tier'],
  ['Upstash Redis', 'data', 'https://upstash.com', 'Serverless Redis with a free request allowance.', 'Free tier'],
  ['Cloudflare D1', 'data', 'https://developers.cloudflare.com/d1/', 'SQLite at the edge, free daily rows read and written.', 'Free tier'],
  ['Cloudflare R2', 'data', 'https://developers.cloudflare.com/r2/', 'Object storage with free storage and zero egress fees.', 'Free tier'],
  ['Cloudflare KV', 'data', 'https://developers.cloudflare.com/kv/', 'Edge key-value store for config and sessions.', 'Free tier'],
  ['MinIO', 'data', 'https://github.com/minio/minio', 'S3-compatible object storage you can self-host.', 'Open source'],
  ['Garage', 'data', 'https://github.com/deuxfleurs-org/garage', 'Lightweight S3-compatible distributed storage.', 'Open source'],
  ['SQLite', 'data', 'https://sqlite.org', 'The most deployed database in the world, public domain.', 'Open source'],
  ['DuckDB', 'data', 'https://duckdb.org', 'In-process analytics database, superb for local reporting.', 'Open source'],
  ['PostgreSQL', 'data', 'https://www.postgresql.org', 'The default open relational database.', 'Open source'],
  ['pgvector', 'data', 'https://github.com/pgvector/pgvector', 'Vector similarity search inside Postgres.', 'Open source'],
  ['Qdrant', 'data', 'https://github.com/qdrant/qdrant', 'Vector database with filtering and hybrid search.', 'Open source'],
  ['Chroma', 'data', 'https://github.com/chroma-core/chroma', 'Developer-friendly embedding store for RAG.', 'Open source'],
  ['Weaviate', 'data', 'https://github.com/weaviate/weaviate', 'Vector search with modules for vectorisation.', 'Open source'],
  ['Milvus', 'data', 'https://github.com/milvus-io/milvus', 'Scalable vector database for large collections.', 'Open source'],
  ['LanceDB', 'data', 'https://github.com/lancedb/lancedb', 'Embedded vector store on Lance columnar format.', 'Open source'],
  ['Meilisearch', 'data', 'https://github.com/meilisearch/meilisearch', 'Instant, typo-tolerant search with a tiny footprint.', 'Open source'],
  ['Typesense', 'data', 'https://github.com/typesense/typesense', 'Fast open search with a clean API.', 'Open source'],
  ['OpenSearch', 'data', 'https://github.com/opensearch-project/OpenSearch', 'Apache-2.0 fork of Elasticsearch and Kibana.', 'Open source'],
  ['Prisma', 'data', 'https://github.com/prisma/prisma', 'Typed ORM with migrations for Node and TypeScript.', 'Open source'],
  ['Drizzle ORM', 'data', 'https://github.com/drizzle-team/drizzle-orm', 'SQL-first TypeScript ORM, edge friendly.', 'Open source'],
  ['Kysely', 'data', 'https://github.com/kysely-org/kysely', 'Type-safe SQL query builder for TypeScript.', 'Open source'],

  // ── UI, design, assets ────────────────────────────────────────────────────
  ['shadcn/ui', 'ui', 'https://ui.shadcn.com', 'Copy-in React components built on Radix and Tailwind.', 'Open source'],
  ['Radix Primitives', 'ui', 'https://www.radix-ui.com', 'Unstyled, accessible React primitives.', 'Open source'],
  ['Tailwind CSS', 'ui', 'https://tailwindcss.com', 'Utility-first CSS with a free open-source core.', 'Open source'],
  ['daisyUI', 'ui', 'https://daisyui.com', 'Tailwind component classes and themes.', 'Open source'],
  ['Headless UI', 'ui', 'https://headlessui.com', 'Unstyled accessible components from the Tailwind team.', 'Open source'],
  ['Mantine', 'ui', 'https://mantine.dev', 'Full React component library with hooks.', 'Open source'],
  ['Chakra UI', 'ui', 'https://chakra-ui.com', 'Accessible component system with theming.', 'Open source'],
  ['MUI', 'ui', 'https://mui.com', 'Material Design components for React.', 'Open source'],
  ['Ant Design', 'ui', 'https://ant.design', 'Enterprise React components and patterns.', 'Open source'],
  ['HeroUI', 'ui', 'https://www.heroui.com', 'Modern React UI built on Tailwind Variants.', 'Open source'],
  ['Aceternity UI', 'ui', 'https://ui.aceternity.com', 'Animated marketing sections and effects, copy-paste.', 'Free tier'],
  ['Magic UI', 'ui', 'https://magicui.design', 'Animated components for landing pages.', 'Open source'],
  ['21st.dev', 'ui', 'https://21st.dev', 'Community registry of shadcn-compatible components.', 'Free tier'],
  ['Origin UI', 'ui', 'https://originui.com', 'Large set of copy-paste Tailwind components.', 'Open source'],
  ['Float UI', 'ui', 'https://floatui.com', 'Tailwind templates and components.', 'Open source'],
  ['Framer Motion', 'ui', 'https://github.com/motiondivision/motion', 'The standard React animation library.', 'Open source'],
  ['GSAP', 'ui', 'https://gsap.com', 'Timeline animation engine, free for most uses.', 'Free tier'],
  ['Lenis', 'ui', 'https://github.com/darkroomengineering/lenis', 'Smooth scroll that does not fight accessibility.', 'Open source'],
  ['Three.js', 'ui', 'https://threejs.org', 'WebGL 3D in the browser.', 'Open source'],
  ['React Three Fiber', 'ui', 'https://github.com/pmndrs/react-three-fiber', 'React renderer for Three.js.', 'Open source'],
  ['Lucide', 'ui', 'https://lucide.dev', 'Clean, consistent open icon set.', 'Open source'],
  ['Phosphor Icons', 'ui', 'https://phosphoricons.com', 'Flexible icon family with weights.', 'Open source'],
  ['Tabler Icons', 'ui', 'https://tabler.io/icons', '5000+ stroke icons, MIT.', 'Open source'],
  ['Heroicons', 'ui', 'https://heroicons.com', 'Tailwind-made SVG icons.', 'Open source'],
  ['Fontsource', 'ui', 'https://fontsource.org', 'Self-hostable open fonts as npm packages.', 'Open source'],
  ['Google Fonts', 'ui', 'https://fonts.google.com', 'Free hosted open-source typefaces.', 'Free tier'],
  ['Fontshare', 'ui', 'https://fontshare.com', 'Free-for-commercial typefaces from Indian Type Foundry.', 'Free tier'],
  ['Unsplash', 'ui', 'https://unsplash.com/developers', 'Free photography with an API for demos.', 'Free tier'],
  ['Pexels', 'ui', 'https://www.pexels.com/api/', 'Free photos and video with an API key.', 'Free tier'],
  ['Pixabay', 'ui', 'https://pixabay.com/api/docs/', 'Free images, video and audio API.', 'Free tier'],
  ['unDraw', 'ui', 'https://undraw.co', 'Recolourable open illustrations.', 'Open source'],
  ['Storyset', 'ui', 'https://storyset.com', 'Free editable illustration sets.', 'Free tier'],
  ['Haikei', 'ui', 'https://haikei.app', 'Generate SVG blobs, waves and gradients.', 'Free tier'],
  ['Coolors', 'ui', 'https://coolors.co', 'Fast palette generation and contrast checking.', 'Free tier'],
  ['Realtime Colors', 'ui', 'https://realtimecolors.com', 'Preview palettes and type on a real layout.', 'Free tier'],
  ['Chart.js', 'ui', 'https://www.chartjs.org', 'Simple, dependency-free canvas charts.', 'Open source'],
  ['Recharts', 'ui', 'https://recharts.org', 'Composable React chart components.', 'Open source'],
  ['D3', 'ui', 'https://d3js.org', 'Data-driven documents, the foundation of most chart libs.', 'Open source'],
  ['Apache ECharts', 'ui', 'https://echarts.apache.org', 'Powerful charting with great defaults.', 'Open source'],
  ['Observable Plot', 'ui', 'https://observablehq.com/plot/', 'Concise grammar-of-graphics charts.', 'Open source'],
  ['uPlot', 'ui', 'https://github.com/leeoniya/uPlot', 'Tiny, extremely fast time-series charts.', 'Open source'],
  ['Lottie', 'ui', 'https://lottiefiles.com', 'Vector animations that render everywhere.', 'Free tier'],
  ['Rive', 'ui', 'https://rive.app', 'Interactive motion graphics with a free tier.', 'Free tier'],
  ['Bootstrap', 'ui', 'https://getbootstrap.com', 'Still the fastest way to a sane layout.', 'Open source'],
  ['Pico CSS', 'ui', 'https://picocss.com', 'Classless CSS for semantic HTML.', 'Open source'],
  ['Open Props', 'ui', 'https://open-props.style', 'CSS custom-property design tokens.', 'Open source'],
  ['Anime.js', 'ui', 'https://animejs.com', 'Lightweight animation library.', 'Open source'],

  // ── DevOps & observability ────────────────────────────────────────────────
  ['Sentry', 'devops', 'https://sentry.io', 'Error and performance monitoring with a free developer plan.', 'Free tier'],
  ['Grafana Cloud', 'devops', 'https://grafana.com', 'Free metrics, logs and dashboards tier.', 'Free tier'],
  ['Better Stack', 'devops', 'https://betterstack.com', 'Free uptime monitoring and log tailing tier.', 'Free tier'],
  ['Axiom', 'devops', 'https://axiom.co', 'Log ingestion with a free monthly allowance.', 'Free tier'],
  ['Uptime Kuma', 'devops', 'https://github.com/louislam/uptime-kuma', 'Self-hosted uptime monitor with alerts.', 'Open source'],
  ['Umami', 'devops', 'https://github.com/umami-software/umami', 'Privacy-first analytics you can self-host.', 'Open source'],
  ['PostHog', 'devops', 'https://posthog.com', 'Product analytics, funnels and session replay; free tier.', 'Free tier'],
  ['Matomo', 'devops', 'https://github.com/matomo-org/matomo', 'Self-hosted web analytics with GDPR care.', 'Open source'],
  ['Metabase', 'devops', 'https://github.com/metabase/metabase', 'Ask questions of your database without SQL.', 'Open source'],
  ['Apache Superset', 'devops', 'https://github.com/apache/superset', 'BI dashboards on SQL warehouses.', 'Open source'],
  ['OpenTelemetry', 'devops', 'https://opentelemetry.io', 'Vendor-neutral traces, metrics and logs.', 'Open source'],
  ['Prometheus', 'devops', 'https://prometheus.io', 'Metrics collection and alerting.', 'Open source'],
  ['Grafana Loki', 'devops', 'https://grafana.com/oss/loki/', 'Log aggregation that indexes labels, not text.', 'Open source'],
  ['Jaeger', 'devops', 'https://www.jaegertracing.io', 'Distributed tracing backend.', 'Open source'],
  ['SigNoz', 'devops', 'https://github.com/SigNoz/signoz', 'Open-source observability in one binary.', 'Open source'],
  ['Gitea', 'devops', 'https://github.com/go-gitea/gitea', 'Lightweight self-hosted Git service.', 'Open source'],
  ['Forgejo', 'devops', 'https://forgejo.org', 'Community-governed Git forge.', 'Open source'],
  ['Woodpecker CI', 'devops', 'https://github.com/woodpecker-ci/woodpecker', 'Simple self-hosted CI pipelines.', 'Open source'],
  ['Renovate', 'devops', 'https://github.com/renovatebot/renovate', 'Automated dependency updates, free on public repos.', 'Open source'],
  ['Trivy', 'devops', 'https://github.com/aquasecurity/trivy', 'Vulnerability and misconfiguration scanning.', 'Open source'],
  ['act', 'devops', 'https://github.com/nektos/act', 'Run GitHub Actions locally before pushing.', 'Open source'],
  ['Plausible CE', 'devops', 'https://github.com/plausible/analytics', 'Lightweight, cookie-free analytics community edition.', 'Open source'],
  ['Netdata', 'devops', 'https://github.com/netdata/netdata', 'Real-time server monitoring with per-second metrics.', 'Open source'],
  ['Watchtower', 'devops', 'https://github.com/containrrr/watchtower', 'Automatic container updates on your own host.', 'Open source'],
];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const RESOURCES: Resource[] = RAW.map(([name, kind, url, description, free]) => ({
  id: `${kind}-${slug(name)}`,
  name,
  kind,
  url,
  description,
  free,
}));

export function resourceCounts(): Record<ResourceKind, number> {
  const counts = {} as Record<ResourceKind, number>;
  for (const kind of RESOURCE_KINDS) counts[kind.id] = 0;
  for (const resource of RESOURCES) counts[resource.kind] += 1;
  return counts;
}
