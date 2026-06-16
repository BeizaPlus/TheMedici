import { useRef } from 'react';
import { neutralStackOrderName } from '../lib/stackDecoys.js';
import OrderResultSceneCard from './OrderResultSceneCard.jsx';

export default function OrderResultsLowerThird({
  resultRows = [],
  activeIvId = null,
  onSelectIvId,
  caseData,
  caseFlow,
  portraitSrc = '',
  onPrintStatus,
  teachMeMode = false,
}) {
  const railRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, left: 0, pid: null });
  if (!resultRows.length) return null;

  const activeRow =
    resultRows.find((row) => row.iv.id === activeIvId) || resultRows[resultRows.length - 1];

  const onRailPointerDown = (e) => {
    const rail = railRef.current;
    if (!rail) return;
    dragRef.current.active = true;
    dragRef.current.x = e.clientX;
    dragRef.current.left = rail.scrollLeft;
    dragRef.current.pid = e.pointerId;
    rail.setPointerCapture?.(e.pointerId);
    rail.classList.add('is-dragging');
  };

  const onRailPointerMove = (e) => {
    const rail = railRef.current;
    if (!rail || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    rail.scrollLeft = dragRef.current.left - dx;
  };

  const endRailDrag = () => {
    const rail = railRef.current;
    if (!rail) return;
    dragRef.current.active = false;
    if (dragRef.current.pid != null) {
      rail.releasePointerCapture?.(dragRef.current.pid);
    }
    dragRef.current.pid = null;
    rail.classList.remove('is-dragging');
  };

  return (
    <div className="order-results-lower-third" role="region" aria-label="Order results carousel">
      <div className="order-results-lower-third-head">
        <span>Results</span>
        <small>Drag chips sideways</small>
      </div>
      <div
        ref={railRef}
        className="order-results-lower-third-rail"
        onPointerDown={onRailPointerDown}
        onPointerMove={onRailPointerMove}
        onPointerUp={endRailDrag}
        onPointerCancel={endRailDrag}
      >
        {resultRows.map((row) => {
          const isActive = row.iv.id === activeRow?.iv.id;
          return (
            <button
              key={row.iv.id}
              type="button"
              className={`order-results-lower-third-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectIvId?.(row.iv.id)}
              title={neutralStackOrderName(row.iv.label)}
            >
              {neutralStackOrderName(row.iv.label)}
            </button>
          );
        })}
      </div>
      {activeRow && (
        <OrderResultSceneCard
          intervention={activeRow.iv}
          caseData={caseData}
          caseFlow={caseFlow}
          portraitSrc={portraitSrc}
          onPrintStatus={onPrintStatus}
          className="order-result-tab-card order-result-lower-third-card"
          hideClose
          teachMeMode={teachMeMode}
        />
      )}
    </div>
  );
}
