import { ECG_STAGE_LABELS } from '../lib/clinicalTrajectory/ecgStages.js';

const METRIC_META = {
  k: { label: 'K⁺ (mEq/L)', color: '#f59e0b', refLow: 3.5, refHigh: 5.0, criticalHigh: 6.5 },
  ecgStage: { label: 'ECG severity', color: '#ef4444', refLow: 0, refHigh: 1, max: 5 },
};

function scaleY(value, min, max, height, pad) {
  const t = (value - min) / (max - min || 1);
  return pad + height - t * height;
}

export default function LabTrendGraphPanel({ points = [], metric = 'k', onMetricChange }) {
  const meta = METRIC_META[metric] || METRIC_META.k;
  const values = points.map((p) => p[metric]).filter((v) => v != null);
  if (values.length < 2) return null;

  const min =
    metric === 'ecgStage'
      ? 0
      : Math.min(meta.refLow, ...values) - 0.5;
  const max =
    metric === 'ecgStage'
      ? meta.max
      : Math.max(meta.criticalHigh || meta.refHigh, ...values) + 0.3;

  const w = 320;
  const h = 140;
  const pad = 24;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * innerW;
    const y = scaleY(p[metric] ?? min, min, max, innerH, pad);
    return { x, y, point: p };
  });

  const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="lab-trend-graph-panel">
      <div className="lab-trend-graph-head">
        <span className="lab-trend-graph-title">Trend</span>
        <div className="lab-trend-graph-metric-toggle" role="tablist" aria-label="Trend metric">
          {Object.entries(METRIC_META).map(([key, m]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metric === key}
              className={metric === key ? 'active' : ''}
              onClick={() => onMetricChange?.(key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <svg className="lab-trend-graph-svg" viewBox={`0 0 ${w} ${h}`} aria-label={`${meta.label} trend`}>
        <line
          x1={pad}
          y1={scaleY(meta.refHigh, min, max, innerH, pad)}
          x2={w - pad}
          y2={scaleY(meta.refHigh, min, max, innerH, pad)}
          className="lab-trend-ref-line"
        />
        <polyline points={poly} className="lab-trend-line" style={{ stroke: meta.color }} />
        {coords.map((c) => (
          <g key={c.point.id}>
            <circle cx={c.x} cy={c.y} r={4} className="lab-trend-dot" style={{ fill: meta.color }} />
            <text x={c.x} y={h - 4} textAnchor="middle" className="lab-trend-x-label">
              {c.point.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="lab-trend-graph-caption">
        {metric === 'ecgStage'
          ? `Latest: ${ECG_STAGE_LABELS[points[points.length - 1]?.ecgStage] || '—'}`
          : `Latest K⁺: ${points[points.length - 1]?.k ?? '—'} mEq/L`}
      </p>
    </div>
  );
}
