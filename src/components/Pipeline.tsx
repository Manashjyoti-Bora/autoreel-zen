import type { TrailStep } from '@shared/types';
import { DEPT_COLOR, DEPT_LABEL, Spinner } from './ui';

export function Pipeline({
  trail,
  busy,
  label,
}: {
  trail: TrailStep[];
  busy: boolean;
  label: string;
}) {
  const total = trail.reduce((sum, step) => sum + step.ms, 0);
  return (
    <div className="pipeline glass">
      <div className="pipeline-head">
        <div>
          <span className="eyebrow">Swarm trace</span>
          <h3>{busy ? label || 'Agents working…' : trail.length ? 'Trace complete' : 'Standing by'}</h3>
        </div>
        <div className="pipeline-meta">
          {busy ? <Spinner /> : null}
          <span>{trail.length ? `${trail.length} agents · ${total} ms` : '104 agents idle'}</span>
        </div>
      </div>

      <div className="pipeline-body">
        {!trail.length && !busy ? <IdleSwarm /> : null}
        {busy && !trail.length ? <WorkingRows /> : null}
        {trail.map((step, index) => (
          <div
            className="step"
            key={`${step.agent}-${index}`}
            style={{ animationDelay: `${Math.min(index, 14) * 55}ms` }}
          >
            <span
              className={`step-dot ${step.status}`}
              style={{ background: DEPT_COLOR[step.dept] }}
            />
            <div className="step-main">
              <div className="step-top">
                <span className="step-name">{step.name}</span>
                <span className="step-dept">{DEPT_LABEL[step.dept]}</span>
                <span className="step-ms">{step.ms} ms</span>
              </div>
              <p className="step-note">{step.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdleSwarm() {
  const depts = ['insight', 'strategy', 'words', 'visual', 'edit', 'growth', 'guard', 'ops'] as const;
  return (
    <div className="idle-swarm">
      {depts.map((dept, index) => (
        <div className="idle-row" key={dept} style={{ animationDelay: `${index * 120}ms` }}>
          <span className="idle-dot" style={{ background: DEPT_COLOR[dept] }} />
          <span className="idle-label">{DEPT_LABEL[dept]}</span>
          <span className="idle-line" />
        </div>
      ))}
      <p className="idle-note">Send a topic and the chain lights up left to right.</p>
    </div>
  );
}

function WorkingRows() {
  const steps = ['Reading intent', 'Writing the brief', 'Sharpening the hook', 'Localising voice', 'Scoring tags', 'Directing the visual', 'Rendering media'];
  return (
    <div className="working-rows">
      {steps.map((step, index) => (
        <div className="working-row" key={step} style={{ animationDelay: `${index * 90}ms` }}>
          <span className="working-dot" />
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}
