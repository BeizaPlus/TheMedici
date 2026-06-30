import { GRID_COLS, GRID_ROWS } from '../lib/sceneGrid.js';

/** Rectangular grid cell marker. Same-cell items auto-separate via repulsion offsets. */
export default function GridPlacedMarker({
  item,
  frame = { x: 0, y: 0, w: 1, h: 1 },
  cols = GRID_COLS,
  rows = GRID_ROWS,
  selected = false,
  offsetX = 0,
  offsetY = 0,
  onClick,
  onDoubleClick,
}) {
  const cellW = (frame.w / cols) * 100;
  const cellH = (frame.h / rows) * 100;
  const left = item.cx * 100;
  const top = item.cy * 100;

  const hasOffset = offsetX !== 0 || offsetY !== 0;

  return (
    <button
      type="button"
      className={`grid-placed-marker ${selected ? 'selected' : ''}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${cellW}%`,
        height: `${cellH}%`,
        ...(hasOffset ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : {}),
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={item.label}
    >
      <span className="grid-placed-marker-label">{item.label}</span>
    </button>
  );
}
