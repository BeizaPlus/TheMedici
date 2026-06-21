import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AP_MV_MAX,
  AP_MV_MIN,
  AP_PHASES,
  AP_THRESHOLD_MV,
  membranePotentialMv,
  phaseById,
  sampleActionPotentialCurves,
} from '../lib/actionPotentialModel.js';
import {
  hyperkMembraneState,
  lerpMembraneState,
  orderLogHasCalcium,
} from '../lib/hyperkPhysiologyModel.js';
import { computeTrajectoryState } from '../lib/clinicalTrajectory/engine.js';
import { getTrajectorySpec } from '../lib/clinicalTrajectory/index.js';
import ActionPotentialChannelDiagram from './ActionPotentialChannelDiagram.jsx';

const GRAPH_W = 360;
const GRAPH_H = 168;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 26;

const PHASE_BANDS = [
  { id: 1, t0: 0, t1: 0.1, className: 'ap-phase-band--rest' },
  { id: 2, t0: 0.1, t1: 0.22, className: 'ap-phase-band--depol' },
  { id: 3, t0: 0.22, t1: 0.42, className: 'ap-phase-band--repol' },
  { id: 4, t0: 0.42, t1: 0.72, className: 'ap-phase-band--hyper' },
];

function mvToY(mv) {
  const t = (mv - AP_MV_MIN) / (AP_MV_MAX - AP_MV_MIN || 1);
  return PAD_T + (1 - t) * (GRAPH_H - PAD_T - PAD_B);
}

function tToX(t) {
  return PAD_L + t * (GRAPH_W - PAD_L - PAD_R);
}

function cardinalSplinePath(points, tension = 0.42) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function smoothCurveFromSeries(series, yKey, yScale) {
  const points = series.map((pt) => ({ x: tToX(pt.t), y: yScale(pt[yKey]) }));
  return cardinalSplinePath(points);
}

function filledAreaFromSeries(series, yKey, yScale, baselineY) {
  if (!series.length) return '';
  const top = smoothCurveFromSeries(series, yKey, yScale);
  const x0 = tToX(series[0].t);
  const x1 = tToX(series[series.length - 1].t);
  return `${top} L ${x1.toFixed(2)} ${baselineY} L ${x0.toFixed(2)} ${baselineY} Z`;
}

export default function HyperkMembranePhysiologyPanel({
  caseId,
  orderLog = [],
  trajectorySnapshots = null,
  compact = false,
}) {
  const spec = useMemo(() => getTrajectorySpec(caseId), [caseId]);
  const targetState = useMemo(() => {
    if (!spec) return null;
    const traj = computeTrajectoryState(spec, orderLog, orderLog.length - 1);
    if (!traj) return null;
    return hyperkMembraneState({
      k: traj.k,
      calciumStabilized: orderLogHasCalcium(orderLog),
    });
  }, [spec, orderLog]);

  const [display, setDisplay] = useState(() => targetState || hyperkMembraneState({ k: 6.8 }));
  const [activePhaseId, setActivePhaseId] = useState(1);
  const [playing, setPlaying] = useState(false);
  const animRef = useRef(null);
  const fromRef = useRef(display);
  const playRef = useRef(null);

  useEffect(() => {
    if (!targetState) return undefined;
    const from = fromRef.current;
    const to = targetState;
    const start = performance.now();
    const duration = 900;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const frame = lerpMembraneState(from, to, eased);
      setDisplay(frame);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetState]);

  useEffect(() => {
    if (!playing) return undefined;
    let idx = 0;
    playRef.current = window.setInterval(() => {
      idx = (idx + 1) % AP_PHASES.length;
      setActivePhaseId(AP_PHASES[idx].id);
    }, 1400);
    return () => {
      if (playRef.current) window.clearInterval(playRef.current);
    };
  }, [playing]);

  const restingOffsetMv = display.restingMv - -75;
  const curves = useMemo(
    () => sampleActionPotentialCurves({ steps: 96, restingOffsetMv }),
    [restingOffsetMv],
  );

  if (!spec) return null;

  const activePhase = phaseById(activePhaseId);
  const markerMv = membranePotentialMv(activePhase.t, { restingOffsetMv });
  const markerX = tToX(activePhase.t);
  const markerY = mvToY(markerMv);

  const permScale = (p) => PAD_T + (GRAPH_H - PAD_T - PAD_B) * (1 - p * 0.82);
  const permBaselineY = GRAPH_H - PAD_B;

  const latestLabel =
    trajectorySnapshots?.length > 0
      ? trajectorySnapshots[trajectorySnapshots.length - 1]?.label
      : 'Baseline';

  const thresholdY = mvToY(display.thresholdMv);
  const shiftedRestY = mvToY(-75 + restingOffsetMv);
  const graphBottom = GRAPH_H - PAD_B;
  const membranePath = smoothCurveFromSeries(curves.membrane, 'mv', mvToY);
  const membraneFill = filledAreaFromSeries(curves.membrane, 'mv', mvToY, graphBottom);
  const naPath = smoothCurveFromSeries(curves.na, 'p', permScale);
  const kPath = smoothCurveFromSeries(curves.k, 'p', permScale);
  const naFill = filledAreaFromSeries(curves.na, 'p', permScale, permBaselineY);
  const kFill = filledAreaFromSeries(curves.k, 'p', permScale, permBaselineY);
  const gapTop = Math.min(shiftedRestY, thresholdY);
  const gapHeight = Math.abs(thresholdY - shiftedRestY) || 2;

  return (
    <div
      className={`hyperk-physiology-panel${compact ? ' hyperk-physiology-panel--dock' : ''}`}
      aria-label="Action potential — interactive physiology"
    >
      <div className="hyperk-physiology-head">
        <span className="hyperk-physiology-title">Neuron action potential</span>
        <span className="hyperk-physiology-k">K⁺ {display.k.toFixed(1)} mEq/L</span>
      </div>

      <div className="ap-interactive-layout">
        <div className="ap-graph-wrap">
          <svg className="hyperk-physiology-svg ap-graph-svg" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} role="img">
            <defs>
              <linearGradient id="ap-membrane-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(248, 250, 252, 0.22)" />
                <stop offset="100%" stopColor="rgba(248, 250, 252, 0.02)" />
              </linearGradient>
              <linearGradient id="ap-na-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(96, 165, 250, 0.35)" />
                <stop offset="100%" stopColor="rgba(96, 165, 250, 0.04)" />
              </linearGradient>
              <linearGradient id="ap-k-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(251, 191, 36, 0.32)" />
                <stop offset="100%" stopColor="rgba(251, 191, 36, 0.04)" />
              </linearGradient>
            </defs>

            {PHASE_BANDS.map((band) => (
              <rect
                key={band.id}
                x={tToX(band.t0)}
                y={PAD_T}
                width={tToX(band.t1) - tToX(band.t0)}
                height={GRAPH_H - PAD_T - PAD_B}
                className={`ap-phase-band ${band.className}${activePhaseId === band.id ? ' is-active' : ''}`}
              />
            ))}

            <text x={PAD_L - 6} y={PAD_T - 4} className="hyperk-physiology-axis-label">
              mV
            </text>
            <text x={GRAPH_W - PAD_R} y={GRAPH_H - 6} textAnchor="end" className="hyperk-physiology-axis-label">
              Time →
            </text>
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={graphBottom} className="hyperk-physiology-axis" />
            <line x1={PAD_L} y1={graphBottom} x2={GRAPH_W - PAD_R} y2={graphBottom} className="hyperk-physiology-axis" />

            {[-100, -75, -55, 0, 40].map((mv) => (
              <g key={mv}>
                <line
                  x1={PAD_L}
                  y1={mvToY(mv)}
                  x2={GRAPH_W - PAD_R}
                  y2={mvToY(mv)}
                  className={`ap-grid-line${mv === -55 || mv === -75 ? ' ap-grid-line--major' : ''}`}
                />
                <text x={PAD_L - 6} y={mvToY(mv) + 3} textAnchor="end" className="ap-grid-label">
                  {mv > 0 ? `+${mv}` : mv}
                </text>
              </g>
            ))}

            <rect
              x={PAD_L + 2}
              y={gapTop}
              width={GRAPH_W - PAD_L - PAD_R - 4}
              height={gapHeight}
              className={`hyperk-physiology-gap${display.danger ? ' is-danger' : ''}`}
              rx={3}
            />

            <path d={naFill} className="ap-curve-fill ap-curve-fill--na" fill="url(#ap-na-fill)" />
            <path d={kFill} className="ap-curve-fill ap-curve-fill--k" fill="url(#ap-k-fill)" />
            <path d={membraneFill} className="ap-curve-fill ap-curve-fill--membrane" fill="url(#ap-membrane-fill)" />

            <path d={naPath} className="ap-curve ap-curve--na" fill="none" />
            <path d={kPath} className="ap-curve ap-curve--k" fill="none" />
            <path d={membranePath} className="ap-curve ap-curve--membrane" fill="none" />

            <line
              x1={PAD_L}
              y1={shiftedRestY}
              x2={GRAPH_W - PAD_R}
              y2={shiftedRestY}
              className="hyperk-physiology-line hyperk-physiology-line--resting"
            />
            <text x={GRAPH_W - PAD_R - 2} y={shiftedRestY - 5} textAnchor="end" className="hyperk-physiology-line-label">
              Rest {Math.round(display.restingMv)} mV
            </text>
            <line
              x1={PAD_L}
              y1={thresholdY}
              x2={GRAPH_W - PAD_R}
              y2={thresholdY}
              className={`hyperk-physiology-line hyperk-physiology-line--threshold${display.calciumStabilized ? ' is-calcium' : ''}`}
            />
            <text x={GRAPH_W - PAD_R - 2} y={thresholdY - 5} textAnchor="end" className="hyperk-physiology-line-label">
              Thr {Math.round(display.thresholdMv)} mV
            </text>

            <line
              x1={markerX}
              y1={PAD_T}
              x2={markerX}
              y2={graphBottom}
              className="ap-phase-vline"
            />
            <circle cx={markerX} cy={markerY} r={5.5} className="ap-phase-marker" />
            <text x={markerX + 8} y={markerY - 7} className="ap-phase-marker-label">
              {activePhase.id}
            </text>
          </svg>

          <div className="ap-curve-legend" aria-hidden>
            <span className="ap-legend-item ap-legend-item--mv">Membrane potential</span>
            <span className="ap-legend-item ap-legend-item--na">Na⁺ permeability</span>
            <span className="ap-legend-item ap-legend-item--k">K⁺ permeability</span>
          </div>
        </div>

        <div className="ap-channel-wrap">
          <p className="ap-channel-phase-title">{activePhase.label}</p>
          <ActionPotentialChannelDiagram phase={activePhase} compact />
          <p className="ap-channel-phase-desc">{activePhase.description}</p>
        </div>
      </div>

      <div className="ap-phase-tabs" role="tablist" aria-label="Action potential phases">
        {AP_PHASES.map((phase) => (
          <button
            key={phase.id}
            type="button"
            role="tab"
            aria-selected={activePhaseId === phase.id}
            className={`ap-phase-tab${activePhaseId === phase.id ? ' is-active' : ''}`}
            onClick={() => {
              setPlaying(false);
              setActivePhaseId(phase.id);
            }}
          >
            <span className="ap-phase-tab-num">{phase.id}</span>
            <span className="ap-phase-tab-label">{phase.short}</span>
          </button>
        ))}
        <button
          type="button"
          className={`ap-phase-play${playing ? ' is-playing' : ''}`}
          onClick={() => setPlaying((v) => !v)}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : 'Play phases'}
        </button>
      </div>

      <p className="hyperk-physiology-caption">
        <strong>HyperK (this case):</strong> safety gap{' '}
        <strong>{display.gapMv.toFixed(1)} mV</strong> ({display.safetyPct}%)
        {display.danger ? ' — critical narrowing' : ''}
        {display.calciumStabilized ? ' · Ca²⁺ stabilized membrane' : ''}. Resting shifted to{' '}
        <strong>{Math.round(display.restingMv)} mV</strong> (normal ~−75 mV; threshold ~{AP_THRESHOLD_MV} mV).
        Last order: {latestLabel}.
      </p>
    </div>
  );
}
