import { useMemo, useRef, useEffect } from 'react';
import {
  buildBareEssentialsRows,
  groupTeachCompareRowsByTier,
} from '../lib/caseBareEssentials.js';
import {
  buildTeachCompareRows,
  teachCompareStatusLabel,
} from '../lib/teachMeCompare.js';

function formatElapsed(at, sessionStartedAt) {
  if (!sessionStartedAt || !at) return '—';
  const delta = Math.max(0, at - sessionStartedAt);
  const sec = Math.floor(delta / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `T+${m}:${String(s).padStart(2, '0')}`;
}

function stepClass(status) {
  return `tc-land-step status-${status || 'pending'}`;
}

function renderFlowStep(row, onFocusStep) {
  return (
    <button
      key={row.id}
      type="button"
      className={stepClass(row.status)}
      onClick={() => onFocusStep?.(row.id)}
      title={row.label}
    >
      <span className="tc-land-step-num">{row.expectedSeq}</span>
      <span className="tc-land-step-label">{row.label}</span>
      <span className="tc-land-step-badge">{teachCompareStatusLabel(row.status)}</span>
      {row.yourSeq != null && (
        <span className="tc-land-step-yours">Yours #{row.yourSeq}</span>
      )}
    </button>
  );
}

export default function TeachMeCompareLandscape({
  caseData,
  interventions = [],
  interventionById = {},
  placementOrder = [],
  placed = {},
  nextExpectedId = null,
  reviewResults = null,
  orderTimelineEvents = [],
  sessionStartedAt = null,
  portraitSrc = '',
  vitals = {},
  doneCount = 0,
  total = 0,
  careUnit = 'ER',
  onFocusStep,
  onLayoutToggle,
  exportActions = null,
  footSlot = null,
}) {
  const stdTrackRef = useRef(null);
  const yoursTrackRef = useRef(null);

  const { rows, extras } = useMemo(
    () =>
      buildTeachCompareRows({
        interventions,
        interventionById,
        placementOrder,
        placed,
        nextExpectedId,
        reviewResults,
      }),
    [
      interventions,
      interventionById,
      placementOrder,
      placed,
      nextExpectedId,
      reviewResults,
    ],
  );

  const timeline = useMemo(
    () =>
      [...orderTimelineEvents]
        .filter((ev) => ev.kind === 'order' || ev.kind === 'extra' || !ev.kind)
        .sort((a, b) => (a.at || 0) - (b.at || 0)),
    [orderTimelineEvents],
  );

  const critical = useMemo(
    () => buildBareEssentialsRows({ caseData, interventions, placed }),
    [caseData, interventions, placed],
  );

  const flowTiers = useMemo(
    () => groupTeachCompareRowsByTier({ rows, caseData, interventions }),
    [rows, caseData, interventions],
  );

  const counts = useMemo(() => {
    const onSeq = rows.filter((r) => r.status === 'match').length;
    const outOfOrder = rows.filter((r) => r.status === 'order-off').length;
    const pending = rows.filter((r) => ['pending', 'next', 'missed'].includes(r.status)).length;
    return {
      onSeq,
      outOfOrder,
      pending,
      extras: extras.length,
      totalStandard: rows.length,
    };
  }, [rows, extras]);

  const nextLabel =
    nextExpectedId && interventionById[nextExpectedId]
      ? interventionById[nextExpectedId].label
      : 'All core stacks placed';

  useEffect(() => {
    const el = yoursTrackRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [timeline.length]);

  const vitalsLine = `HR ${vitals.hr ?? '—'} · BP ${vitals.sbp ?? '—'}/${vitals.dbp ?? '—'} · SpO₂ ${vitals.spo2 ?? '—'}%`;

  return (
    <div className="teach-compare-landscape" aria-label="Landscape compare — standard flow vs your orders">
      <div
        className="tc-land-bg"
        style={portraitSrc ? { backgroundImage: `url(${portraitSrc})` } : undefined}
        aria-hidden
      />
      <div className="tc-land-scrim" aria-hidden />

      <header className="tc-land-chrome">
        <div className="tc-land-chrome-left">
          <span className="tc-land-case-cat">{caseData?.category || 'Clinical case'}</span>
          <h2 className="tc-land-case-title">{caseData?.title || 'Case'}</h2>
          <p className="tc-land-case-meta">
            Case #{caseData?.ccsNumber ?? caseData?.id} · {careUnit}
          </p>
        </div>
        <div className="tc-land-pills">
          <span className="tc-land-pill good">
            On sequence: <strong>{counts.onSeq}/{counts.totalStandard}</strong>
          </span>
          <span className="tc-land-pill warn">
            Out of order: <strong>{counts.outOfOrder}</strong>
          </span>
          <span className="tc-land-pill">
            Not placed: <strong>{counts.pending}</strong>
          </span>
          <span className="tc-land-pill">
            Progress: <strong>{doneCount}/{total}</strong>
          </span>
          <span className="tc-land-vitals">{vitalsLine}</span>
        </div>
        <div className="tc-land-chrome-actions">
          <div className="teach-compare-export-actions">{exportActions}</div>
          <button
            type="button"
            className="tc-land-layout-btn"
            onClick={onLayoutToggle}
            title="Switch to vertical stack view"
          >
            Vertical
          </button>
        </div>
      </header>

      <div className="tc-land-rails">
        {critical.total > 0 && (
          <section className="tc-land-critical" aria-label={critical.title}>
            <div className="tc-land-critical-head">
              <span className="tc-land-critical-title">{critical.title}</span>
              <span className="tc-land-critical-count">
                {critical.doneCount}/{critical.total}
              </span>
            </div>
            <div className="tc-land-critical-chips">
              {critical.rows.map((row) => (
                <span
                  key={row.id}
                  className={`tc-land-critical-chip${row.isDone ? ' is-done' : ''}`}
                  title={row.why || row.label}
                >
                  <span className="tc-land-critical-mark" aria-hidden>
                    {row.isDone ? '✓' : '○'}
                  </span>
                  <span className="tc-land-critical-chip-label">{row.shortLabel}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="tc-land-rail tc-land-rail-standard" aria-label="Standard flow">
          <div className="tc-land-rail-head">
            <span>Standard flow</span>
            <span className="tc-land-next">
              Next: <strong>{nextLabel}</strong>
            </span>
          </div>
          <div className="tc-land-rail-track tc-land-rail-track-tiers" ref={stdTrackRef}>
            {flowTiers.map((tier) => (
              <div key={tier.id} className={`tc-land-tier-block tier-${tier.id}`}>
                <div className="tc-land-tier-cap">
                  {tier.label} · {tier.placedCount}/{tier.total}
                </div>
                <div className="tc-land-tier-scroll">
                  {tier.rows.map((row) => renderFlowStep(row, onFocusStep))}
                </div>
              </div>
            ))}
            {extras.length > 0 && (
              <div className="tc-land-tier-block tier-extra">
                <div className="tc-land-tier-cap">Outside set · {extras.length}</div>
                <div className="tc-land-tier-scroll">
                  {extras.map((row) => (
                    <div
                      key={row.id}
                      className={`${stepClass('extra')} tc-land-step-static`}
                      title={row.label}
                    >
                      <span className="tc-land-step-num tc-land-step-extra-dot">·</span>
                      <span className="tc-land-step-label">{row.label}</span>
                      <span className="tc-land-step-badge">Extra #{row.yourSeq}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="tc-land-rail tc-land-rail-yours" aria-label="Your order timeline">
          <div className="tc-land-rail-head">
            <span>Your orders · this patient</span>
            <span className="tc-land-rail-count">{timeline.length}</span>
          </div>
          <div className="tc-land-rail-track tc-land-rail-track-yours" ref={yoursTrackRef}>
            {timeline.length === 0 ? (
              <p className="tc-land-empty">Orders appear here as you treat the patient.</p>
            ) : (
              timeline.map((ev) => (
                <div
                  key={ev.id}
                  className={`tc-land-timeline-step kind-${ev.kind || 'order'}`}
                >
                  <time className="tc-land-timeline-time">
                    {formatElapsed(ev.at, sessionStartedAt)}
                  </time>
                  <span className="tc-land-timeline-label">{ev.label}</span>
                  {ev.orderIndex != null && (
                    <span className="tc-land-timeline-seq">#{ev.orderIndex}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {footSlot && <div className="tc-land-foot">{footSlot}</div>}
    </div>
  );
}
