import type { AgentDef, Dept } from '../../shared/types';

/**
 * The hand-written roster is deliberately small and specific. Everything beyond
 * it is generated from craft lanes so the studio can show a real 1000+ agent
 * catalogue without pretending that every entry makes its own model call.
 *
 * Generated agents are `rule` agents: they are deterministic review lanes that
 * the pipeline can cite in a trace. Only `ai` agents spend tokens.
 */

const DEPT_ORDER: Dept[] = ['insight', 'strategy', 'words', 'visual', 'edit', 'growth', 'guard', 'ops'];

const LANES: Record<Dept, string[]> = {
  insight: [
    'Audience', 'Trend', 'Culture', 'Competitor', 'Keyword', 'Sentiment', 'Season', 'Platform',
    'Persona', 'Story', 'Analytics', 'Feedback', 'Research', 'Community', 'Comment', 'DM',
    'Save', 'Share', 'Search', 'Hashtag', 'Niche', 'Region', 'Language', 'Creator', 'Market',
  ],
  strategy: [
    'Brief', 'Angle', 'Series', 'Calendar', 'Funnel', 'CTA', 'Positioning', 'Idea', 'Variety',
    'Sequence', 'Retention', 'Goal', 'Refresh', 'Pillar', 'Campaign', 'Launch', 'Evergreen',
    'Crosspost', 'Repurpose', 'Narrative', 'Arc', 'Test', 'Priority', 'Roadmap', 'Concept',
  ],
  words: [
    'Hook', 'Caption', 'Microcopy', 'Story', 'Carousel', 'Quote', 'One-Liner', 'Longform',
    'Question', 'Punchline', 'Assamese', 'English', 'Hinglish', 'Headline', 'Subtitle', 'Bio',
    'Comment', 'DM', 'Newsletter', 'Thread', 'Poem', 'Slogan', 'Script', 'Alt', 'Summary',
  ],
  visual: [
    'Art', 'Palette', 'Composition', 'Type', 'Photo', 'Texture', 'Generative', 'Poster',
    'Carousel', 'Icon', 'Mockup', 'Style', 'Brand', 'Frame', 'Light', 'Color', 'Layout', 'Grid',
    'Crop', 'Backdrop', 'Prop', 'Mood', 'Motion', 'Cover', 'Thumbnail',
  ],
  edit: [
    'Cut', 'Sequence', 'Transition', 'Beat', 'Subtitle', 'B-Roll', 'Rhythm', 'Cover', 'Audio',
    'Loop', 'Speed', 'Color', 'Thumbstop', 'Pacing', 'Grade', 'Trim', 'Montage', 'Stitch',
    'Sync', 'Loudness', 'Frame', 'Export', 'Preview', 'Timing', 'Flow',
  ],
  growth: [
    'Hashtag', 'SEO', 'Alt', 'Timing', 'Hook', 'Split', 'Engagement', 'Reply', 'DM', 'Collab',
    'Crosspost', 'Trend', 'Virality', 'Caption', 'Comment', 'Follow', 'Save', 'Share', 'Story',
    'Reach', 'Retention', 'Profile', 'Bio', 'Link', 'Community',
  ],
  guard: [
    'Policy', 'Fact', 'Tone', 'Spell', 'Originality', 'Sensitivity', 'Brand', 'Claim',
    'Copyright', 'Spam', 'Clarity', 'CTA', 'Metadata', 'Consent', 'Privacy', 'Disclosure',
    'Safety', 'Bias', 'Accuracy', 'Plagiarism', 'Accessibility', 'Legal', 'Risk', 'Crisis',
    'Compliance',
  ],
  ops: [
    'Schedule', 'Publish', 'Retry', 'Archive', 'Database', 'GitHub', 'Media', 'Token',
    'Metrics', 'Error', 'Cost', 'Queue', 'Digest', 'Backup', 'Deploy', 'Log', 'Alert', 'Health',
    'Sync', 'Cache', 'Storage', 'Cleanup', 'Report', 'Rollback', 'Uptime',
  ],
};

const ROLES: Record<Dept, string[]> = {
  insight: ['Scout', 'Analyst', 'Mapper', 'Watcher', 'Reader'],
  strategy: ['Planner', 'Architect', 'Strategist', 'Editor', 'Lead'],
  words: ['Writer', 'Editor', 'Polisher', 'Smith', 'Voice'],
  visual: ['Director', 'Designer', 'Curator', 'Maker', 'Stylist'],
  edit: ['Editor', 'Cutter', 'Mixer', 'Grader', 'Timer'],
  growth: ['Operator', 'Tester', 'Optimizer', 'Hunter', 'Builder'],
  guard: ['Auditor', 'Reviewer', 'Sentinel', 'Guard', 'Filter'],
  ops: ['Runner', 'Keeper', 'Engineer', 'Monitor', 'Agent'],
};

const CRAFT: Record<Dept, string> = {
  insight: 'reads audience signals',
  strategy: 'shapes the plan',
  words: 'refines the language',
  visual: 'refines the frame',
  edit: 'refines the cut',
  growth: 'refines reach',
  guard: 'checks the post',
  ops: 'keeps the run healthy',
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeAgent(dept: Dept, lane: string, role: string): AgentDef {
  const id = `${dept}-${slug(lane)}-${slug(role)}`.slice(0, 64);
  return {
    id,
    name: `${lane} ${role}`,
    dept,
    mode: 'rule',
    directive: `${lane} ${role} — ${CRAFT[dept]} in the ${dept} lane (deterministic review step, no token spend)`,
  };
}

export function expandAgents(curated: AgentDef[], target = 1000): AgentDef[] {
  const agents = [...curated];
  const ids = new Set(agents.map((agent) => agent.id));
  const names = new Set(agents.map((agent) => agent.name.toLowerCase()));
  const goal = Math.max(target, agents.length);
  const perDept = Math.ceil(Math.max(0, goal - agents.length) / DEPT_ORDER.length);

  const add = (dept: Dept, lane: string, role: string): boolean => {
    const agent = makeAgent(dept, lane, role);
    if (ids.has(agent.id) || names.has(agent.name.toLowerCase())) return false;
    ids.add(agent.id);
    names.add(agent.name.toLowerCase());
    agents.push(agent);
    return true;
  };

  // Pass 1 — even coverage across the eight departments.
  for (const dept of DEPT_ORDER) {
    let added = 0;
    for (const lane of LANES[dept]) {
      for (const role of ROLES[dept]) {
        if (added >= perDept) break;
        if (add(dept, lane, role)) added += 1;
      }
      if (added >= perDept) break;
    }
  }

  // Pass 2 — top up if name collisions with the curated roster left us short.
  let cursor = 0;
  while (agents.length < goal && cursor < DEPT_ORDER.length * 25 * 5 * 2) {
    const dept = DEPT_ORDER[cursor % DEPT_ORDER.length];
    const lane = LANES[dept][Math.floor(cursor / DEPT_ORDER.length) % LANES[dept].length];
    const role = ROLES[dept][Math.floor(cursor / (DEPT_ORDER.length * LANES[dept].length)) % ROLES[dept].length];
    add(dept, lane, role);
    cursor += 1;
  }

  return agents;
}
