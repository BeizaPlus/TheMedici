import { useMemo } from 'react';
import SceneGridOverlay from './SceneGridOverlay.jsx';
import GridPlacedMarker from './GridPlacedMarker.jsx';
import { GRID_COLS, GRID_ROWS } from '../lib/sceneGrid.js';
import { itemAtCell } from '../lib/gridPlacement.js';

/** Collision-detection repulsion: auto-separate overlapping labels in the same cell. */
function cellKey(col, row) { return `${col}-${row}`; }

function computeRepulsionOffsets(items) {
  const offsets = {};
  // Group items by grid cell
  const cellGroups = {};
  for (const item of items) {
    const key = cellKey(item.col, item.row);
    if (!cellGroups[key]) cellGroups[key] = [];
    cellGroups[key].push(item);
  }

  // Approximate label dimensions in rendered px
  const CHAR_W = 6.2;
  const LABEL_H = 22;
  const LABEL_PAD = 12;
  const MIN_SEPARATION = 5;
  const FORCE_STRENGTH = 0.85;
  const VELOCITY_DAMPING = 0.7;
  const ITERATIONS = 20;

  for (const group of Object.values(cellGroups)) {
    if (group.length <= 1) {
      for (const item of group) offsets[item.id] = { x: 0, y: 0 };
      continue;
    }

    // Estimate bounding-box sizes from label length
    const sizes = group.map((item) => ({
      w: item.label.length * CHAR_W + LABEL_PAD * 2,
      h: LABEL_H,
    }));

    // Start positions near cell center with tiny random jitter to break symmetry
    const positions = group.map(() => ({
      x: (Math.random() - 0.5) * 3,
      y: (Math.random() - 0.5) * 3,
    }));
    const velocities = group.map(() => ({ x: 0, y: 0 }));

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const forces = group.map(() => ({ x: 0, y: 0 }));

      // Repulsion between every pair in this cell
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

          const half_i_w = sizes[i].w / 2 + MIN_SEPARATION;
          const half_i_h = sizes[i].h / 2 + MIN_SEPARATION;
          const half_j_w = sizes[j].w / 2 + MIN_SEPARATION;
          const half_j_h = sizes[j].h / 2 + MIN_SEPARATION;

          const overlapX = half_i_w + half_j_w - Math.abs(dx);
          const overlapY = half_i_h + half_j_h - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            // Force magnitude proportional to the smaller overlap axis
            const mag = FORCE_STRENGTH * Math.min(overlapX, overlapY);
            const nx = dx / dist;
            const ny = dy / dist;
            forces[i].x -= nx * mag;
            forces[i].y -= ny * mag;
            forces[j].x += nx * mag;
            forces[j].y += ny * mag;
          }
        }
      }

      // Integrate: apply forces → velocity with damping → position
      for (let i = 0; i < group.length; i++) {
        velocities[i].x = (velocities[i].x + forces[i].x) * VELOCITY_DAMPING;
        velocities[i].y = (velocities[i].y + forces[i].y) * VELOCITY_DAMPING;
        positions[i].x += velocities[i].x;
        positions[i].y += velocities[i].y;
      }
    }

    // Store final integer offsets per item
    for (let i = 0; i < group.length; i++) {
      offsets[group[i].id] = {
        x: Math.round(positions[i].x),
        y: Math.round(positions[i].y),
      };
    }
  }

  return offsets;
}

/**
 * Invisible grid + rectangular placed items.
 * Click cell (place mode): add item. Click item: select. Click cell with selection: move. Double-click item: remove.
 */
export default function GridPlacementLayer({
  items = [],
  frame = { x: 0, y: 0, w: 1, h: 1 },
  cols = GRID_COLS,
  rows = GRID_ROWS,
  visible = false,
  placeMode = false,
  selectedId = null,
  onPlaceCell,
  onSelect,
  onMove,
  onRemove,
  onItemClick,
}) {
  const repulsionOffsets = useMemo(() => computeRepulsionOffsets(items), [items]);

  const handleCell = (cell) => {
    if (selectedId && onMove) {
      const occupied = itemAtCell(items, cell.col, cell.row);
      if (!occupied || occupied.id === selectedId) {
        onMove(selectedId, cell);
      }
      return;
    }
    if (!placeMode || !onPlaceCell) return;
    if (itemAtCell(items, cell.col, cell.row)) return;
    onPlaceCell(cell);
  };

  return (
    <>
      <SceneGridOverlay
        frame={frame}
        cols={cols}
        rows={rows}
        visible={visible}
        placeMode={placeMode || Boolean(selectedId)}
        occupiedCells={items.map((it) => ({ col: it.col, row: it.row }))}
        onPlace={handleCell}
      />
      {items.map((item) => (
        <GridPlacedMarker
          key={item.id}
          item={item}
          frame={frame}
          cols={cols}
          rows={rows}
          selected={item.id === selectedId}
          offsetX={repulsionOffsets[item.id]?.x ?? 0}
          offsetY={repulsionOffsets[item.id]?.y ?? 0}
          onClick={(e) => {
            e.stopPropagation();
            if (onItemClick) {
              onItemClick(item);
              return;
            }
            onSelect?.(item.id === selectedId ? null : item.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
            if (selectedId === item.id) onSelect?.(null);
          }}
        />
      ))}
    </>
  );
}
