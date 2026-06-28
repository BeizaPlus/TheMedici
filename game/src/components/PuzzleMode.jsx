import { useMemo, useState, useCallback } from 'react';
import {
  IconStethoscope,
  IconPuzzle,
  IconRefresh,
  IconX,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import '../styles/puzzleMode.css';

// "Build the Picture" jigsaw mode. Drag/click finding-tiles into illness-script
// slots; each correct placement un-blurs a cell of the patient portrait.
// Self-contained overlay — owns its own state, calls onClose when dismissed.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PuzzleMode({ puzzle, portraitSrc, onClose, onComplete }) {
  const slots = puzzle?.slots || [];
  const cols = puzzle?.grid?.cols || 2;
  const rows = puzzle?.grid?.rows || 3;
  const cellCount = cols * rows;

  const [placements, setPlacements] = useState({}); // slotId -> tileId
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [misses, setMisses] = useState(0);
  const [nudge, setNudge] = useState(null); // { text, slotId }
  const [wrongSlot, setWrongSlot] = useState(null);
  const [seed, setSeed] = useState(0); // bump to re-shuffle the tray for a fresh attempt

  const reshuffle = useCallback(() => {
    setPlacements({});
    setSelectedTileId(null);
    setMisses(0);
    setNudge(null);
    setWrongSlot(null);
    setSeed((s) => s + 1);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const orderedTiles = useMemo(() => shuffle(puzzle?.tiles || []), [puzzle, seed]);
  const tileById = useMemo(
    () => Object.fromEntries((puzzle?.tiles || []).map((t) => [t.id, t])),
    [puzzle],
  );

  const placedTileIds = useMemo(() => new Set(Object.values(placements)), [placements]);
  const filledSlotIds = useMemo(() => new Set(Object.keys(placements)), [placements]);
  const revealedCells = useMemo(
    () => new Set(slots.map((s, i) => (filledSlotIds.has(s.id) ? i : -1)).filter((i) => i >= 0)),
    [slots, filledSlotIds],
  );
  const done = slots.length > 0 && slots.every((s) => filledSlotIds.has(s.id));

  const placeTile = useCallback(
    (slotId, tileId) => {
      const tile = tileById[tileId];
      if (!tile || filledSlotIds.has(slotId)) return;
      if (tile.correctSlot === slotId) {
        setPlacements((p) => {
          const next = { ...p, [slotId]: tileId };
          if (slots.every((s) => s.id === slotId || Object.prototype.hasOwnProperty.call(p, s.id))) {
            onComplete?.();
          }
          return next;
        });
        setSelectedTileId(null);
        setNudge(null);
      } else {
        setMisses((m) => m + 1);
        const key = tile.lure || slotId;
        const text = puzzle?.nudges?.[key] || puzzle?.nudges?._default || 'That piece fits elsewhere.';
        setNudge({ text, slotId });
        setWrongSlot(slotId);
        window.setTimeout(() => setWrongSlot(null), 420);
      }
    },
    [tileById, filledSlotIds, slots, puzzle, onComplete],
  );

  const onSlotClick = (slotId) => {
    if (selectedTileId) placeTile(slotId, selectedTileId);
  };
  const onSlotDrop = (e, slotId) => {
    e.preventDefault();
    const tileId = e.dataTransfer.getData('text/tile');
    if (tileId) placeTile(slotId, tileId);
  };

  const trayTiles = orderedTiles.filter((t) => !placedTileIds.has(t.id));

  return (
    <div className="puzzle-overlay" role="dialog" aria-label={`${puzzle?.title} — ${puzzle?.subtitle}`}>
      <div className="puzzle-frame">
        <header className="puzzle-head">
          <div>
            <div className="puzzle-kicker">Build the Picture</div>
            <h2 className="puzzle-title">{puzzle?.subtitle}</h2>
          </div>
          <div className="puzzle-stats">
            <span className="puzzle-progress">
              {filledSlotIds.size}/{slots.length} pieces
            </span>
            <span className="puzzle-misses">{misses} miss{misses === 1 ? '' : 'es'}</span>
            <button
              type="button"
              className="puzzle-refresh"
              onClick={reshuffle}
              title="Re-shuffle — fresh attempt"
              aria-label="Re-shuffle puzzle"
            >
              <IconRefresh />
            </button>
            <button type="button" className="puzzle-close" onClick={onClose} aria-label="Close puzzle">
              <IconX />
            </button>
          </div>
        </header>

        <div className="puzzle-body">
          {/* Reveal picture */}
          <div className="puzzle-picture-col">
            <div
              className={`puzzle-picture ${done ? 'is-complete' : ''}`}
              style={portraitSrc ? { backgroundImage: `url(${portraitSrc})` } : undefined}
            >
              {!portraitSrc && (
                <div className="puzzle-picture-fallback">{done ? <IconPuzzle /> : '?'}</div>
              )}
              <div
                className="puzzle-grid-cover"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
              >
                {Array.from({ length: cellCount }).map((_, i) => (
                  <div key={i} className={`puzzle-cell ${revealedCells.has(i) ? 'revealed' : ''}`} />
                ))}
              </div>
              {done && (
                <div className="puzzle-reveal-banner">
                  <span>The picture is complete</span>
                  <strong>{puzzle?.diagnosis}</strong>
                </div>
              )}
            </div>
            {nudge && (
              <div className="puzzle-nudge" role="status">
                <IconStethoscope />
                <span>{nudge.text}</span>
              </div>
            )}
          </div>

          {/* Board: slots + tray */}
          <div className="puzzle-board-col">
            <div className="puzzle-slots">
              {slots.map((slot) => {
                const tileId = placements[slot.id];
                const tile = tileId ? tileById[tileId] : null;
                return (
                  <div
                    key={slot.id}
                    className={`puzzle-slot ${tile ? 'filled' : ''} ${wrongSlot === slot.id ? 'wrong' : ''} ${
                      selectedTileId && !tile ? 'droppable' : ''
                    }`}
                    onClick={() => onSlotClick(slot.id)}
                    onDragOver={(e) => !tile && e.preventDefault()}
                    onDrop={(e) => onSlotDrop(e, slot.id)}
                  >
                    <span className="puzzle-slot-label">{slot.label}</span>
                    {tile ? (
                      <span className="puzzle-slot-tile">{tile.text}</span>
                    ) : (
                      <span className="puzzle-slot-hint">{slot.hint}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="puzzle-tray">
              {trayTiles.length === 0 && !done && <div className="puzzle-tray-empty">No tiles left.</div>}
              {trayTiles.map((tile) => (
                <button
                  type="button"
                  key={tile.id}
                  className={`puzzle-tile ${selectedTileId === tile.id ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/tile', tile.id)}
                  onClick={() => setSelectedTileId((id) => (id === tile.id ? null : tile.id))}
                >
                  {tile.text}
                </button>
              ))}
            </div>
            <p className="puzzle-tip">Tap a tile, then tap the slot it belongs to — or drag it across.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
