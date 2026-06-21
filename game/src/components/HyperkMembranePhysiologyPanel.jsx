import { useEffect, useMemo, useRef, useState } from 'react';
import {
  hyperkMembraneState,
  lerpMembraneState,
  orderLogHasCalcium,
} from '../lib/hyperkPhysiologyModel.js';
import { computeTrajectoryState } from '../lib/clinicalTrajectory/engine.js';
import { getTrajectorySpec } from '../lib/clinicalTrajectory/index.js';

const GRAPH_W = 320;
const GRAPH_H = 120;
const PAD = 20;

function mvToY(mv, minMv, maxMv) {
  const t = (mv - minMv) / (maxMv - minMv || 1);
  return PAD + (1 - t) * (GRAPH_H - PAD * 2);
}

export default function HyperkMembranePhysiologyPanel({
  caseId,
  orderLog = [],
  trajectorySnapshots = null,
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
  const animRef = useRef(null);
  const fromRef = useRef(display);

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

  if (!spec) return null;

  const minMv = -95;
  const maxMv = -55;
  const restingY = mvToY(display.restingMv, minMv, maxMv);
  const thresholdY = mvToY(display.thresholdMv, minMv, maxMv);

  const latestLabel =
    trajectorySnapshots?.length > 0
      ? trajectorySnapshots[trajectorySnapshots.length - 1]?.label
      : 'Baseline';

  return (
    <div className="hyperk-physiology-panel" aria-label="Membrane potential — live physiology">
      <div className="hyperk-physiology-head">
        <span className="hyperk-physiology-title">Action potential — live</span>
        <span className="hyperk-physiology-k">K⁺ {display.k.toFixed(1)}</span>
      </div>
      <svg className="hyperk-physiology-svg" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} role="img">
        <text x={PAD} y={12} className="hyperk-physiology-axis-label">
          mV
        </text>
        <line x1={PAD} y1={PAD} x2={PAD} y2={GRAPH_H - PAD} className="hyperk-physiology-axis" />
        <line
          x1={PAD}
          y1={GRAPH_H - PAD}
          x2={GRAPH_W - PAD}
          y2={GRAPH_H - PAD}
          className="hyperk-physiology-axis"
        />
        <rect
          x={PAD + 8}
          y={Math.min(restingY, thresholdY)}
          width={GRAPH_W - PAD * 2 - 16}
          height={Math.abs(thresholdY - restingY) || 2}
          className={`hyperk-physiology-gap${display.danger ? ' is-danger' : ''}`}
          rx={3}
        />
        <line
          x1={PAD}
          y1={restingY}
          x2={GRAPH_W - PAD}
          y2={restingY}
          className="hyperk-physiology-line hyperk-physiology-line--resting"
        />
        <text x={GRAPH_W - PAD - 4} y={restingY - 4} textAnchor="end" className="hyperk-physiology-line-label">
          Resting {Math.round(display.restingMv)} mV
        </text>
        <line
          x1={PAD}
          y1={thresholdY}
          x2={GRAPH_W - PAD}
          y2={thresholdY}
          className={`hyperk-physiology-line hyperk-physiology-line--threshold${display.calciumStabilized ? ' is-calcium' : ''}`}
        />
        <text x={GRAPH_W - PAD - 4} y={thresholdY - 4} textAnchor="end" className="hyperk-physiology-line-label">
          Threshold {Math.round(display.thresholdMv)} mV
          {display.calciumStabilized ? ' · Ca²⁺' : ''}
        </text>
      </svg>
      <p className="hyperk-physiology-caption">
        Safety gap <strong>{display.gapMv.toFixed(1)} mV</strong> ({display.safetyPct}%)
        {display.calciumStabilized
          ? ' — calcium raised threshold; K⁺ unchanged.'
          : ' — high K⁺ narrows the gap toward arrest.'}{' '}
        Last order: {latestLabel}.
      </p>
    </div>
  );
}
