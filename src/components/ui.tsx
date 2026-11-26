import type { ReactNode } from 'react';
import type { Dept } from '@shared/types';

export const DEPT_COLOR: Record<Dept, string> = {
  insight: '#8FB4FF',
  strategy: '#C9A6FF',
  words: '#FFD98F',
  visual: '#5EEAD4',
  edit: '#9BE86B',
  growth: '#FF8FB1',
  guard: '#FFB08F',
  ops: '#9A9AA8',
};

export const DEPT_LABEL: Record<Dept, string> = {
  insight: 'Insight',
  strategy: 'Strategy',
  words: 'Words',
  visual: 'Visual',
  edit: 'Edit',
  growth: 'Growth',
  guard: 'Guard',
  ops: 'Ops',
};

export function Pill({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'lime' | 'violet' | 'cyan' | 'pink' | 'muted' | 'warn';
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  foot,
  accent,
}: {
  label: string;
  value: ReactNode;
  foot?: string;
  accent?: string;
}) {
  return (
    <div className="stat glass">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      {foot ? <span className="stat-foot">{foot}</span> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className={`toggle-row ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-copy">
        <span className="toggle-label">{label}</span>
        {hint ? <span className="toggle-hint">{hint}</span> : null}
      </span>
      <span className="toggle">
        <span className="toggle-knob" />
      </span>
    </button>
  );
}

export function SectionHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {right ? <div className="section-right">{right}</div> : null}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
