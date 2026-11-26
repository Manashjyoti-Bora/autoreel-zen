import { useMemo, useState } from 'react';
import type { AgentDef, Dept, Post, TrailStep } from '@shared/types';
import { DEPARTMENTS } from '../lib/departments';
import { DEPT_COLOR, Pill } from '../components/ui';
import { shortDate } from '../lib/api';

const PAGE = 12;

export function SwarmView({ agents, posts }: { agents: AgentDef[]; posts: Post[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Dept | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter((agent) =>
      `${agent.name} ${agent.directive} ${agent.dept}`.toLowerCase().includes(needle),
    );
  }, [agents, query]);

  const grouped = useMemo(() => {
    const map = new Map<Dept, AgentDef[]>();
    for (const dept of DEPARTMENTS) map.set(dept.id, []);
    for (const agent of filtered) {
      const list = map.get(agent.dept);
      if (list) list.push(agent);
    }
    return map;
  }, [filtered]);

  const recentRuns = useMemo(() => {
    const runs: Array<TrailStep & { post: string; at: string }> = [];
    for (const post of posts) {
      for (const step of post.trail) {
        runs.push({ ...step, post: post.title || post.topic, at: post.createdAt });
      }
      if (runs.length > 40) break;
    }
    return runs.slice(0, 14);
  }, [posts]);

  const aiCount = agents.filter((agent) => agent.mode === 'ai').length;

  return (
    <div className="view">
      <div className="queue-head">
        <div>
          <span className="eyebrow">The swarm</span>
          <h1>{agents.length} agents · {DEPARTMENTS.length} departments</h1>
        </div>
        <div className="filter-row">
          <Pill tone="violet">{aiCount} model agents</Pill>
          <Pill tone="muted">{agents.length - aiCount} review agents</Pill>
        </div>
      </div>

      <div className="swarm-tools">
        <label className="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5 21 21" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${agents.length} agents…`}
            aria-label="Search agents"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          ) : null}
        </label>
        <span className="search-count">
          {filtered.length === agents.length ? 'full roster' : `${filtered.length} matching`}
        </span>
      </div>

      <div className="swarm-layout">
        <div className="dept-list">
          {DEPARTMENTS.map((dept) => {
            const list = grouped.get(dept.id) ?? [];
            if (!list.length) return null;
            const open = expanded === dept.id || !!query;
            const shown = open ? list : list.slice(0, PAGE);
            return (
              <section className="dept glass" key={dept.id}>
                <header className="dept-head">
                  <span className="dept-mark" style={{ background: DEPT_COLOR[dept.id] }} />
                  <div>
                    <h3>{dept.label}</h3>
                    <span className="dept-tagline">{dept.tagline}</span>
                  </div>
                  <span className="dept-count">{list.length}</span>
                </header>
                <div className="agent-grid">
                  {shown.map((agent) => (
                    <div className="agent" key={agent.id} title={agent.directive}>
                      <span className={`agent-dot ${agent.mode}`} style={{ background: DEPT_COLOR[dept.id] }} />
                      <span className="agent-name">{agent.name}</span>
                      <span className="agent-model">{agent.mode}</span>
                    </div>
                  ))}
                </div>
                {list.length > PAGE && !query ? (
                  <button
                    type="button"
                    className="agent-more"
                    onClick={() => setExpanded(open ? null : dept.id)}
                  >
                    {open ? 'Show less' : `Show all ${list.length}`}
                  </button>
                ) : null}
              </section>
            );
          })}
        </div>

        <aside className="activity glass">
          <div className="next-up-head">
            <span className="eyebrow">Recent activity</span>
            <Pill tone="cyan">live</Pill>
          </div>
          {recentRuns.length === 0 ? (
            <p className="empty-note">No runs yet. Produce a post to see agent traces here.</p>
          ) : (
            <ul className="activity-list">
              {recentRuns.map((run, index) => (
                <li key={`${run.agent}-${index}`} className="activity-item">
                  <span className="activity-dot" style={{ background: DEPT_COLOR[run.dept] }} />
                  <div>
                    <span className="activity-agent">{run.name}</span>
                    <p>{run.note}</p>
                    <span className="activity-meta">
                      {run.post} · {run.ms} ms · {shortDate(run.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
