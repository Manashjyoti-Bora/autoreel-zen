import type { Env } from './env';
import type { Settings } from '../shared/types';

/**
 * Free-first model routing. Every provider below speaks the OpenAI
 * `/chat/completions` shape, so one code path covers all of them. Add a key and
 * that provider joins the chain automatically — no code change needed.
 */

export interface LlmProvider {
  id: string;
  label: string;
  base: string;
  key: string;
  model: string;
  free: boolean;
  note: string;
  headers?: Record<string, string>;
}

export interface ProviderStatus {
  id: string;
  label: string;
  envKey: string;
  free: boolean;
  configured: boolean;
  model: string;
  note: string;
  url: string;
}

interface ProviderSeed {
  id: string;
  label: string;
  envKey: keyof Env;
  base: string;
  model: string;
  free: boolean;
  note: string;
  url: string;
  headers?: Record<string, string>;
}

const SEEDS: ProviderSeed[] = [
  {
    id: 'freebuff',
    label: 'Freebuff API',
    envKey: 'OPENAI_API_KEY',
    base: 'https://freebuff.com/api/v1/paid',
    model: 'gpt-4o-mini',
    free: false,
    note: 'Owner-funded OpenAI-compatible endpoint',
    url: 'https://freebuff.com/account/api',
  },
  {
    id: 'groq',
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    base: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    free: true,
    note: 'Free developer tier, very fast',
    url: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    base: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    free: true,
    note: '`:free` model variants, many providers',
    url: 'https://openrouter.ai/keys',
    headers: { 'x-title': 'Autoreel Zen' },
  },
  {
    id: 'gemini',
    label: 'Google AI Studio',
    envKey: 'GEMINI_API_KEY',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    free: true,
    note: 'Free tier with a daily request quota',
    url: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    envKey: 'CEREBRAS_API_KEY',
    base: 'https://api.cerebras.ai/v1',
    model: 'llama-3.3-70b',
    free: true,
    note: 'Free tier, extremely low latency',
    url: 'https://cloud.cerebras.ai',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    base: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    free: true,
    note: 'Free experiment tier',
    url: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'together',
    label: 'Together AI',
    envKey: 'TOGETHER_API_KEY',
    base: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    free: true,
    note: 'Dedicated free model endpoint',
    url: 'https://api.together.ai/settings/api-keys',
  },
  {
    id: 'github',
    label: 'GitHub Models',
    envKey: 'GITHUB_MODELS_TOKEN',
    base: 'https://models.inference.ai.azure.com',
    model: 'gpt-4o-mini',
    free: true,
    note: 'Free with a GitHub account, rate limited',
    url: 'https://github.com/settings/tokens',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    envKey: 'OLLAMA_BASE_URL',
    base: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    free: true,
    note: 'Runs on your own machine, no key or bill',
    url: 'https://ollama.com/download',
  },
];

export function providerStatus(env: Env): { providers: ProviderStatus[]; configured: number } {
  const providers = SEEDS.map((seed) => {
    const configured = !!(env[seed.envKey] || '').toString().trim();
    return {
      id: seed.id,
      label: seed.label,
      envKey: String(seed.envKey),
      free: seed.free,
      configured,
      model: configured && seed.id === 'ollama' ? env.OLLAMA_MODEL || seed.model : seed.model,
      note: seed.note,
      url: seed.url,
    };
  });
  return { providers, configured: providers.filter((provider) => provider.configured).length };
}

export function hasLlmKey(env: Env): boolean {
  return providerStatus(env).configured > 0;
}

export function providerCandidates(env: Env, settings: Settings): LlmProvider[] {
  const list: LlmProvider[] = [];
  for (const seed of SEEDS) {
    const key = ((env[seed.envKey] || '') as string).trim();
    if (!key) continue;
    const isOllama = seed.id === 'ollama';
    const base = isOllama ? key.replace(/\/+$/, '') : seed.base;
    const model =
      seed.id === 'freebuff'
        ? settings.llmModel || seed.model
        : seed.id === 'ollama'
          ? env.OLLAMA_MODEL || seed.model
          : seed.model;
    list.push({
      id: seed.id,
      label: seed.label,
      base,
      key: isOllama ? 'ollama' : key,
      model,
      free: seed.free,
      note: seed.note,
      headers: seed.headers,
    });
  }
  return list;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 25_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
