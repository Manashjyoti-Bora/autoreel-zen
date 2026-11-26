import type { Dept } from '@shared/types';

export const DEPARTMENTS: Array<{ id: Dept; label: string; tagline: string }> = [
  { id: 'insight', label: 'Insight', tagline: 'reads the room' },
  { id: 'strategy', label: 'Strategy', tagline: 'finds the angle' },
  { id: 'words', label: 'Words', tagline: 'writes the post' },
  { id: 'visual', label: 'Visual', tagline: 'directs the frame' },
  { id: 'edit', label: 'Edit', tagline: 'cuts and paces' },
  { id: 'growth', label: 'Growth', tagline: 'pushes reach' },
  { id: 'guard', label: 'Guard', tagline: 'keeps it safe' },
  { id: 'ops', label: 'Ops', tagline: 'ships it' },
];
