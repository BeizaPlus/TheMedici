import { useMemo } from 'react';
import {
  buildTeachCompareRows,
  teachCompareStatusLabel,
} from '../lib/teachMeCompare.js';

function flowDotClass(row, focused) {
  const parts = ['teach-flow-dot'];
  if (row.isPlaced) parts.push('done');
  else {
    if (row.status === 'next') parts.push('next');
    if (row.status === 'order-off' || row.status === 'missed') parts.push('warn');
  }
  if (row.status === 'extra') parts.push('extra');
  if (focused) parts.push('focused');
  return parts.join(' ');
}

export default function TeachMeComparePanel({
  interventions = [],
  interventionById = {},
  placementOrder = [],
  placed = {},
  nextExpectedId = null,
  teachFocusId = null,
  reviewResults = null,
  onFocusStep,
  compact = false,
}) {
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
    [interventions, interventionById, placementOrder, placed, nextExpectedId, reviewResults],
  );

  const nextLabel =
    nextExpectedId && interventionById[nextExpectedId]
      ? interventionById[nextExpectedId].label
      : 'All core stacks placed';

  const renderRow = (row, keyPrefix = '', isExtra = false) => {
    const focused = !isExtra && teachFocusId === row.id;
    return (
      <li
        key={`${keyPrefix}${row.id}`}
        className={`teach-compare-row status-${row.status}${focused ? ' is-focused' : ''}`}
      >
        <button
          type="button"
          className="teach-compare-row-btn"
          onClick={() => {
            if (!isExtra) onFocusStep?.(row.id);
          }}
        >
          <span
            className={flowDotClass(row, focused)}
            aria-hidden={isExtra}
            title={isExtra ? undefined : `Step ${row.expectedSeq}`}
          >
            {isExtra ? '·' : row.expectedSeq}
          </span>
          <span className="teach-compare-label" title={row.label}>
            {row.label}
          </span>
          <span className="teach-compare-yours">
            {row.yourSeq != null ? `#${row.yourSeq}` : '—'}
          </span>
          <span className={`teach-compare-badge status-${row.status}`}>
            {teachCompareStatusLabel(row.status)}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className={`teach-compare-panel${compact ? ' teach-compare-panel--compact' : ''}`}>
      <p className="teach-compare-next">
        Next: <strong>{nextLabel}</strong>
      </p>
      <div className="teach-compare-head">
        <span className="teach-compare-col teach-compare-col-flow">Flow</span>
        <span className="teach-compare-col teach-compare-col-label">Order</span>
        <span className="teach-compare-col">Yours</span>
        <span className="teach-compare-col teach-compare-col-badge">Status</span>
      </div>
      <ul className="teach-compare-list" aria-label="Standard flow compared to your order timeline">
        {rows.map((row) => renderRow(row))}
      </ul>
      {extras.length > 0 && (
        <>
          <p className="teach-compare-extra-title">Outside standard set</p>
          <ul className="teach-compare-list teach-compare-list-extra" aria-label="Extra orders">
            {extras.map((row) => renderRow(row, 'extra-', true))}
          </ul>
        </>
      )}
      <p className="teach-compare-hint">Tap a row to jump to that stack — green dots are placed.</p>
    </div>
  );
}
