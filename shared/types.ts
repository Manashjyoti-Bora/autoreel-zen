export type Dept =
  | 'insight'
  | 'strategy'
  | 'words'
  | 'visual'
  | 'edit'
  | 'growth'
  | 'guard'
  | 'ops';

export type PostStatus =
  | 'draft'
  | 'producing'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';

export type Tone = 'zen' | 'bold' | 'poetic' | 'meme' | 'story' | 'gyaan';
export type Format = 'reel' | 'photo' | 'carousel' | 'quote';
export type Lang = 'as' | 'en' | 'hinglish';

export interface Settings {
  autopilot: boolean;
  postsPerDay: number;
  slots: string[];
  utcOffsetMinutes: number;
  defaultTone: Tone;
  defaultFormat: Format;
  defaultLanguage: Lang;
  autoContinue: boolean;
  seedTopic: string;
  brand: string;
  vision: string;
  igUserId: string;
  igToken: string;
  igTokenSet: boolean;
  igUsername: string;
  ghRepo: string;
  ghToken: string;
  ghTokenSet: boolean;
  lastBackup: string;
  lastTick: string;
  llmModel: string;
  imageModel: string;
  passwordProtected: boolean;
  aiReady: boolean;
  imageReady: boolean;
}

/** One image of a carousel post. `mediaKey` points into R2 (served at /api/media/…). */
export interface Slide {
  mediaKey: string;
  caption: string;
  altText: string;
}

export interface Post {
  id: string;
  campaignId: string;
  topic: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  visualPrompt: string;
  visualBrief: string;
  mediaKey: string;
  mediaUrl: string;
  visualSource: string;
  reelScript: string;
  videoUrl: string;
  /** 2–10 slides for a carousel post; empty for every other format. */
  slides: Slide[];
  format: Format;
  tone: Tone;
  language: Lang;
  status: PostStatus;
  virality: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  igMediaId: string;
  permalink: string;
  error: string;
  source: 'topic' | 'derived';
  nextAngle: string;
  trail: TrailStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  topic: string;
  tone: Tone;
  format: Format;
  language: Lang;
  count: number;
  status: string;
  source: string;
  createdAt: string;
}

export interface TrailStep {
  agent: string;
  name: string;
  dept: Dept;
  status: 'ok' | 'warn' | 'skip';
  note: string;
  ms: number;
}

export interface AgentDef {
  id: string;
  name: string;
  dept: Dept;
  directive: string;
  mode: 'ai' | 'rule';
}

export interface Stats {
  queue: number;
  published: number;
  drafts: number;
  failed: number;
  streak: number;
  avgVirality: number;
  nextAt: string | null;
  todayCount: number;
}

export interface Bootstrap {
  authed: boolean;
  needsPassword: boolean;
  openMode: boolean;
  settings: Settings | null;
  posts: Post[];
  campaigns: Campaign[];
  stats: Stats | null;
  agents: AgentDef[];
  serverTime: string;
}

export interface InspirationIdea {
  angle: string;
  topic: string;
  hook: string;
  why: string;
  tone: Tone;
  format: Format;
}

export interface InspirationResult {
  ok: boolean;
  link: string;
  shortcode: string;
  kind: 'post' | 'reel' | 'tv' | 'unknown';
  author: string;
  caption: string;
  source: 'live' | 'mirror' | 'caption' | 'link';
  engine: 'ai' | 'offline';
  note: string;
  keywords: string[];
  ideas: InspirationIdea[];
}

export interface ComposeInput {
  topic: string;
  tone: Tone;
  format: Format;
  language: Lang;
  count: number;
  autoSchedule: boolean;
}
