import { useEffect, useMemo, useState } from 'react';
import type { Resource, ResourceKind, ResourceKindDef } from '@shared/resources';
import { api } from '../lib/api';
import { Chip, Pill, Spinner } from '../components/ui';

interface Catalogue {
  resources: Resource[];
  kinds: ResourceKindDef[];
  count: number;
  checkedAt: string;
}

interface Providers {
  providers: Array<{
    id: string;
    label: string;
    envKey: string;
    free: boolean;
    configured: boolean;
    model: string;
    note: string;
    url: string;
  }>;
  configured: number;
  active: string | null;
  draftEngine: boolean;
}

export function ResourcesView() {
  const [data, setData] = useState<Catalogue | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void api<Catalogue>('/resources')
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Catalogue failed to load');
      });
    void api<Providers>('/providers')
      .then((result) => {
        if (alive) setProviders(result);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const items = data?.resources ?? [];
    const needle = query.trim().toLowerCase();
    return items.filter((resource) => {
      if (kind !== 'all' && resource.kind !== kind) return false;
      if (!needle) return true;
      return `${resource.name} ${resource.description} ${resource.free}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data, kind, query]);

  if (!data) {
    return (
      <div className="view">
        <div className="empty-state glass">
          {error ? <p>{error}</p> : <p><Spinner /> Loading the free stack…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="queue-head">
        <div>
          <span className="eyebrow">Zero-cost building blocks</span>
          <h1>{data.count} free resources · {data.kinds.length} lanes</h1>
        </div>
        <div className="filter-row">
          <Pill tone="lime">no card needed</Pill>
          <Pill tone="muted">checked {data.checkedAt}</Pill>
        </div>
      </div>

      <section className="provider-strip glass">
        <div className="provider-head">
          <span className="eyebrow">Your model chain</span>
          <span className="provider-active">
            {providers?.active
              ? `active: ${providers.providers.find((p) => p.id === providers.active)?.label}`
              : 'draft engine (no key set)'}
          </span>
        </div>
        <div className="provider-list">
          {(providers?.providers ?? []).map((provider) => (
            <a
              key={provider.id}
              className={`provider ${provider.configured ? 'is-on' : ''}`}
              href={provider.url}
              target="_blank"
              rel="noreferrer"
              title={`${provider.note} · set ${provider.envKey}`}
            >
              <span className="provider-dot" />
              <span className="provider-name">{provider.label}</span>
              <span className="provider-key">{provider.configured ? provider.model : provider.envKey}</span>
            </a>
          ))}
        </div>
        <p className="provider-foot">
          The swarm tries each configured provider in order and falls back to the next on a failed call.
          Free tiers are rate limited — add two keys so one failure never stops a post.
        </p>
      </section>

      <div className="swarm-tools">
        <label className="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5 21 21" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search frameworks, APIs, engines…"
            aria-label="Search free resources"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          ) : null}
        </label>
        <div className="filter-row">
          <Chip active={kind === 'all'} onClick={() => setKind('all')}>
            All {data.count}
          </Chip>
          {data.kinds.map((entry) => (
            <Chip key={entry.id} active={kind === entry.id} onClick={() => setKind(entry.id)}>
              {entry.label}
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state glass">
          <p>Nothing matches “{query}”.</p>
        </div>
      ) : (
        <div className="resource-grid">
          {visible.map((resource) => (
            <a
              key={resource.id}
              className="resource-card glass"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              <div className="resource-head">
                <span className="resource-name">{resource.name}</span>
                <span className={`resource-free ${resource.free === 'Open source' ? 'is-oss' : ''}`}>
                  {resource.free}
                </span>
              </div>
              <p className="resource-desc">{resource.description}</p>
              <span className="resource-foot">
                {data.kinds.find((entry) => entry.id === resource.kind)?.label}
                <span aria-hidden="true">↗</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
