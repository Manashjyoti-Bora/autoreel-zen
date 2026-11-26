export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  APP_NAME?: string;
  APP_ORIGIN?: string;
  APP_PASSWORD?: string;
  SESSION_SECRET?: string;
  CRON_SECRET?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  IMAGE_API_KEY?: string;
  IMAGE_BASE_URL?: string;
  // Free-first model providers. Set any one and it joins the fallback chain.
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  TOGETHER_API_KEY?: string;
  GITHUB_MODELS_TOKEN?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
}
