import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AP_PHASES,
  AP_SVG_PERM_BASELINE_MV,
  AP_SVG_PHASE_T,
  AP_THRESHOLD_MV,
  membranePotentialMv,
  phaseById,
  sampleActionPotentialCurves,
} from '../lib/actionPotentialModel.js';
import { AP_SVG_LABELS, AP_SVG_REF, AP_SVG_Y_ANCHORS, mvToSvgY, svgTToX } from '../lib/actionPotentialSvgCurves.js';
import {
  hyperkMembraneState,
  lerpMembraneState,
  orderLogHasCalcium,
} from '../lib/hyperkPhysiologyModel.js';
import { computeTrajectoryState } from '../lib/clinicalTrajectory/engine.js';
import { getTrajectorySpec } from '../lib/clinicalTrajectory/index.js';
import { loadNaAlign, naPeakDisplay, saveNaAlign, formatNaAlignReadout } from '../lib/naCurveAlign.js';
import ApGraphRoleSegment from './ApGraphRoleSegment.jsx';
import ActionPotentialChannelDiagram from './ActionPotentialChannelDiagram.jsx';

const GRAPH_ROLE_KEY = 'ap-graph-role-v1';

function loadGraphRole() {
  try {
    const v = localStorage.getItem(GRAPH_ROLE_KEY);
    return v === 'attending' ? 'attending' : 'patient';
  } catch (_e) {
    return 'patient';
  }
}

function saveGraphRole(role) {
  try {
    localStorage.setItem(GRAPH_ROLE_KEY, role);
  } catch (_e) {
    /* ignore */
  }
}

const GRAPH_W = AP_SVG_REF.viewW;
const GRAPH_H = AP_SVG_REF.viewH;
const PAD_L = AP_SVG_REF.padL;
const PAD_R = AP_SVG_REF.padR;
const PAD_T = AP_SVG_REF.padT;
const PAD_B = AP_SVG_REF.padB;

const PHASE_BANDS = [
  { id: 1, t0: 0, t1: AP_SVG_PHASE_T[2] * 0.55, className: 'ap-phase-band--rest' },
  { id: 2, t0: AP_SVG_PHASE_T[1] * 0.85, t1: AP_SVG_PHASE_T[2] + 0.04, className: 'ap-phase-band--depol' },
  { id: 3, t0: AP_SVG_PHASE_T[2] - 0.02, t1: AP_SVG_PHASE_T[3] + 0.04, className: 'ap-phase-band--repol' },
  { id: 4, t0: AP_SVG_PHASE_T[3] - 0.02, t1: 0.72, className: 'ap-phase-band--hyper' },
];

const DEFAULT_VIS = { mv: true, na: true, k: true, rest: true };

function mvToY(mv) {
  return mvToSvgY(mv);
}

function tToX(t) {
  return svgTToX(t);
}

function xToT(x) {
  return (x - PAD_L) / AP_SVG_REF.graphW;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
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

function CurveToggles({ vis, onToggle, onShowAll }) {
  const allOn = vis.mv && vis.na && vis.k && vis.rest;
  return (
    <div className="ap-graph-toolbar" role="toolbar" aria-label="Curve visibility">
      <span className="ap-graph-toolbar-lbl">Curves</span>
      {[
        { key: 'mv', cls: 'tog-mv', label: 'Vm' },
        { key: 'na', cls: 'tog-na', label: 'Na⁺' },
        { key: 'k', cls: 'tog-k', label: 'K⁺ perm' },
        { key: 'rest', cls: 'tog-rest', label: 'Rest Vm' },
      ].map(({ key, cls, label }) => (
        <button
          key={key}
          type="button"
          className={`ap-tog ${cls}${vis[key] ? '' : ' off'}`}
          aria-pressed={vis[key]}
          onClick={() => onToggle(key)}
        >
          <span className="ap-tog-dot" />
          {label}
        </button>
      ))}
      {!allOn ? (
        <button type="button" className="ap-tog ap-tog-showall" onClick={onShowAll}>
          Show all
        </button>
      ) : null}
    </div>
  );
}

export default function HyperkMembranePhysiologyPanel({
  caseId,
  orderLog = [],
  trajectorySnapshots = null,
  compact = false,
  embedded = false,
  studentView = false,
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
  const [showIntro, setShowIntro] = useState(!studentView);
  const [vis, setVis] = useState(DEFAULT_VIS);
  const [naAlign, setNaAlign] = useState(() => loadNaAlign());
  const [graphRole, setGraphRole] = useState(() => loadGraphRole());
  const [copyOk, setCopyOk] = useState(false);
  const [draggingNa, setDraggingNa] = useState(false);
  const svgRef = useRef(null);
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
    if (!playing || studentView) return undefined;
    let idx = 0;
    playRef.current = window.setInterval(() => {
      idx = (idx + 1) % AP_PHASES.length;
      setActivePhaseId(AP_PHASES[idx].id);
    }, 1400);
    return () => {
      if (playRef.current) window.clearInterval(playRef.current);
    };
  }, [playing, studentView]);

  const restingOffsetMv = display.restingMv - -75;
  const curves = useMemo(
    () => sampleActionPotentialCurves({ steps: 96, restingOffsetMv, naAlign }),
    [restingOffsetMv, naAlign],
  );

  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const sp = pt.matrixTransform(ctm.inverse());
    return { x: sp.x, y: sp.y };
  }, []);

  const onNaDragMove = useCallback(
    (clientX) => {
      const pt = clientToSvg(clientX, 0);
      if (!pt) return;
      const next = { ...naAlign, peakT: clamp(xToT(pt.x), 0, 1) };
      setNaAlign(next);
      saveNaAlign(next);
    },
    [clientToSvg, naAlign],
  );

  useEffect(() => {
    if (!draggingNa) return undefined;
    const onMove = (e) => onNaDragMove(e.clientX);
    const onUp = () => setDraggingNa(false);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [draggingNa, onNaDragMove]);

  if (!spec) return null;

  const activePhase = phaseById(activePhaseId);
  const markerMv = membranePotentialMv(activePhase.t, { restingOffsetMv });
  const markerX = tToX(activePhase.t);
  const markerY = mvToY(markerMv);
  const permBaselineY = mvToY(AP_SVG_PERM_BASELINE_MV);
  const latestLabel =
    trajectorySnapshots?.length > 0
      ? trajectorySnapshots[trajectorySnapshots.length - 1]?.label
      : 'Baseline';
  const thresholdY = mvToY(display.thresholdMv);
  const shiftedRestY = mvToY(-75 + restingOffsetMv);
  const graphBottom = AP_SVG_REF.graphBottom;
  const membranePath = smoothCurveFromSeries(curves.membrane, 'mv', mvToY);
  const membraneFill = filledAreaFromSeries(curves.membrane, 'mv', mvToY, graphBottom);
  const naPath = smoothCurveFromSeries(curves.na, 'mv', mvToY);
  const kPath = smoothCurveFromSeries(curves.k, 'mv', mvToY);
  const naFill = filledAreaFromSeries(curves.na, 'mv', mvToY, permBaselineY);
  const kFill = filledAreaFromSeries(curves.k, 'mv', mvToY, permBaselineY);
  const gapTop = Math.min(shiftedRestY, thresholdY);
  const gapHeight = Math.abs(thresholdY - shiftedRestY) || 2;
  const naPeak = naPeakDisplay(naAlign);
  const naAlignReadout = formatNaAlignReadout(naAlign);
  const graphAttendingMode = studentView && graphRole === 'attending';

  const copyAlignJson = useCallback(() => {
    const text = naAlignReadout.json;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopyOk(true);
        window.setTimeout(() => setCopyOk(false), 2000);
      },
      () => {},
    );
  }, [naAlignReadout.json]);

  const onGraphRoleChange = useCallback((role) => {
    setGraphRole(role);
    saveGraphRole(role);
    setCopyOk(false);
  }, []);
  const naHandleX = tToX(naPeak.t);
  const naHandleY = mvToY(naPeak.mv);

  const dismissIntro = () => setShowIntro(false);
  const toggleVis = (key) => setVis((v) => ({ ...v, [key]: !v[key] }));
  const showAllCurves = () => setVis({ ...DEFAULT_VIS });

  const svgGraph = (
    <svg
      ref={svgRef}
      className={`hyperk-physiology-svg ap-graph-svg ap-graph-svg--light${studentView ? ' ap-graph-svg--student' : ''}`}
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      role="img"
    >
      <rect x={0} y={0} width={GRAPH_W} height={GRAPH_H} className="ap-graph-bg" />
      <rect
        x={PAD_L}
        y={PAD_T}
        width={GRAPH_W - PAD_L - PAD_R}
        height={GRAPH_H - PAD_T - PAD_B}
        className="ap-graph-plot-bg"
      />
      <defs>
        <linearGradient id="ap-membrane-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(28, 78, 122, 0.22)" />
          <stop offset="100%" stopColor="rgba(28, 78, 122, 0.02)" />
        </linearGradient>
        <linearGradient id="ap-na-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13, 27, 62, 0.22)" />
          <stop offset="100%" stopColor="rgba(13, 27, 62, 0.02)" />
        </linearGradient>
        <linearGradient id="ap-k-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(200, 136, 0, 0.28)" />
          <stop offset="100%" stopColor="rgba(200, 136, 0, 0.03)" />
        </linearGradient>
      </defs>

      {!studentView
        ? PHASE_BANDS.map((band) => (
            <rect
              key={band.id}
              x={tToX(band.t0)}
              y={PAD_T}
              width={tToX(band.t1) - tToX(band.t0)}
              height={GRAPH_H - PAD_T - PAD_B}
              className={`ap-phase-band ${band.className}${activePhaseId === band.id ? ' is-active' : ''}`}
            />
          ))
        : null}

      <text x={PAD_L - 6} y={PAD_T - 4} className="hyperk-physiology-axis-label">
        mV
      </text>
      <text x={GRAPH_W - PAD_R} y={GRAPH_H - 6} textAnchor="end" className="hyperk-physiology-axis-label">
        Time →
      </text>
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={graphBottom} className="hyperk-physiology-axis" />
      <line x1={PAD_L} y1={graphBottom} x2={GRAPH_W - PAD_R} y2={graphBottom} className="hyperk-physiology-axis" />

      {AP_SVG_Y_ANCHORS.map(({ mv, y }) => (
        <g key={mv}>
          <line
            x1={PAD_L}
            y1={y}
            x2={GRAPH_W - PAD_R}
            y2={y}
            className={`ap-grid-line${mv === -55 || mv === -75 ? ' ap-grid-line--major' : ''}`}
          />
          <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="ap-grid-label">
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

      {vis.k ? <path d={kFill} className="ap-curve-fill ap-curve-fill--k" fill="url(#ap-k-fill)" /> : null}
      {vis.na ? <path d={naFill} className="ap-curve-fill ap-curve-fill--na" fill="url(#ap-na-fill)" /> : null}
      {vis.mv ? (
        <path d={membraneFill} className="ap-curve-fill ap-curve-fill--membrane" fill="url(#ap-membrane-fill)" />
      ) : null}
      {vis.k ? <path d={kPath} className="ap-curve ap-curve--k ap-curve--light" fill="none" /> : null}
      {vis.na ? <path d={naPath} className="ap-curve ap-curve--na ap-curve--light" fill="none" /> : null}
      {vis.mv ? <path d={membranePath} className="ap-curve ap-curve--membrane ap-curve--light" fill="none" /> : null}

      {!studentView ? (
        <>
          <text x={AP_SVG_LABELS.membrane.x} y={AP_SVG_LABELS.membrane.y} className="ap-curve-label ap-curve-label--mv">
            Membrane potential
          </text>
          <text x={AP_SVG_LABELS.na.x} y={AP_SVG_LABELS.na.y} className="ap-curve-label ap-curve-label--na">
            Na⁺ relative permeability
          </text>
          <text x={AP_SVG_LABELS.k.x} y={AP_SVG_LABELS.k.y} className="ap-curve-label ap-curve-label--k">
            K⁺ relative permeability
          </text>
        </>
      ) : null}

      {vis.rest ? (
        <>
          <line
            x1={PAD_L}
            y1={shiftedRestY}
            x2={GRAPH_W - PAD_R}
            y2={shiftedRestY}
            className="hyperk-physiology-line hyperk-physiology-line--resting"
          />
          <text
            x={GRAPH_W - PAD_R - 2}
            y={shiftedRestY - 5}
            textAnchor="end"
            className="hyperk-physiology-line-label ap-line-label--rest"
          >
            Rest {Math.round(display.restingMv)} mV
          </text>
        </>
      ) : null}
      <line
        x1={PAD_L}
        y1={thresholdY}
        x2={GRAPH_W - PAD_R}
        y2={thresholdY}
        className={`hyperk-physiology-line hyperk-physiology-line--threshold${display.calciumStabilized ? ' is-calcium' : ''}`}
      />
      <text
        x={GRAPH_W - PAD_R - 2}
        y={thresholdY - 5}
        textAnchor="end"
        className={`hyperk-physiology-line-label ap-line-label--thr${display.calciumStabilized ? ' is-calcium' : ''}`}
      >
        Thr {Math.round(display.thresholdMv)} mV
      </text>

      {studentView && vis.na ? (
        <g className="ap-na-align-handle">
          <circle
            cx={naHandleX}
            cy={naHandleY}
            r={9}
            className="ap-na-align-handle-hit"
            onPointerDown={(e) => {
              e.preventDefault();
              setDraggingNa(true);
            }}
          />
          <circle cx={naHandleX} cy={naHandleY} r={5.5} className="ap-na-align-handle-dot" />
        </g>
      ) : null}

      {!studentView ? (
        <>
          <line x1={markerX} y1={PAD_T} x2={markerX} y2={graphBottom} className="ap-phase-vline" />
          <circle cx={markerX} cy={markerY} r={5.5} className="ap-phase-marker" />
          <text x={markerX + 8} y={markerY - 7} className="ap-phase-marker-label">
            {activePhase.id}
          </text>
        </>
      ) : null}
    </svg>
  );

  return (
    <div
      className={`hyperk-physiology-panel${compact ? ' hyperk-physiology-panel--dock' : ''}${embedded ? ' hyperk-physiology-panel--embedded' : ''}${studentView ? ' hyperk-physiology-panel--student' : ''}`}
      aria-label="Action potential — interactive physiology"
    >
      {showIntro && !studentView ? (
        <div className="ap-intro-overlay" role="dialog" aria-labelledby="ap-intro-title">
          <div className="ap-intro-card">
            <p className="ap-intro-kicker">How to use</p>
            <h3 id="ap-intro-title">Neuron action potential — interactive</h3>
            <ol className="ap-intro-steps">
              <li>
                <strong>Phase tabs (1–4)</strong> — jump to resting, depolarization, repolarization, or
                hyperpolarization.
              </li>
              <li>
                <strong>Play phases</strong> — auto-advance through all four gates in sequence.
              </li>
              <li>
                <strong>Channel diagram</strong> — shows Na⁺ / K⁺ gate states for the active phase.
              </li>
              <li>
                <strong>HyperK context</strong> — resting line shifts up as K⁺ rises; safety gap narrows.
              </li>
            </ol>
            <button type="button" className="ap-intro-dismiss" onClick={dismissIntro}>
              Got it — explore graph
            </button>
          </div>
        </div>
      ) : null}

      {!studentView ? (
        <div className="hyperk-physiology-head">
          <span className="hyperk-physiology-title">Neuron action potential</span>
          <span className="hyperk-physiology-k">K⁺ {display.k.toFixed(1)} mEq/L (normal 3.5–5.0)</span>
        </div>
      ) : null}

      {studentView ? (
        <div className="ap-student-graph-stack">
          <ApGraphRoleSegment
            role={graphRole}
            onRoleChange={onGraphRoleChange}
            alignReadout={graphAttendingMode ? naAlignReadout : null}
            onCopyAlign={copyAlignJson}
            copyOk={copyOk}
          />
          <div className="ap-graph-wrap ap-graph-wrap--student">{svgGraph}</div>
          <CurveToggles vis={vis} onToggle={toggleVis} onShowAll={showAllCurves} />
        </div>
      ) : (
        <div className="ap-interactive-layout">
          <div className="ap-graph-wrap">
            {svgGraph}
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
      )}

      {!studentView ? (
        <>
          <div className="ap-phase-tabs" role="tablist" aria-label="Action potential phases">
            {AP_PHASES.map((phase) => (
              <button
                key={phase.id}
                type="button"
                role="tab"
                aria-selected={activePhaseId === phase.id}
                className={`ap-phase-tab${activePhaseId === phase.id ? ' is-active' : ''}`}
                onClick={() => {
                  dismissIntro();
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
              onClick={() => {
                dismissIntro();
                setPlaying((v) => !v);
              }}
              aria-pressed={playing}
            >
              {playing ? 'Pause' : 'Play phases'}
            </button>
          </div>
          <p className="hyperk-physiology-caption">
            <strong>HyperK (this case):</strong> serum K⁺ <strong>{display.k.toFixed(1)} mEq/L</strong> · safety gap{' '}
            <strong>{display.gapMv.toFixed(1)} mV</strong> ({display.safetyPct}%)
            {display.danger ? ' — critical narrowing' : ''}
            {display.calciumStabilized ? ' · Ca²⁺ stabilized membrane' : ''}. Last order: {latestLabel}.
          </p>
        </>
      ) : null}
    </div>
  );
}
