import { useMemo, useState, useCallback } from 'react';
import {
  IconStethoscope,
  IconCircleCheck,
  IconRefresh,
  IconX,
} from './sceneToolbar/SceneToolbarIcons.jsx';
import '../styles/timelineMode.css';

// "Arrange the Timeline" — sequencing mode. Pick a step-piece from the tray,
// drop it into an ordered slot. No scroll: tray + track are on screen together.
// Tap-to-pick / tap-to-drop (the mechanic Steve chose). Drag is also supported.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TimelineMode({ timeline, onClose, onComplete }) {
  const steps = timeline?.steps || [];
  const slotCount = steps.length;

  const [placements, setPlacements] = useState({}); // slotIndex -> pieceId
  const [selectedId, setSelectedId] = useState(null);
  const [misses, setMisses] = useState(0);
  const [nudge, setNudge] = useState(null);
  const [wrongSlot, setWrongSlot] = useState(null);
  const [seed, setSeed] = useState(0); // bump to re-shuffle for a fresh attempt

  const reshuffle = useCallback(() => {
    setPlacements({});
    setSelectedId(null);
    setMisses(0);
    setNudge(null);
    setWrongSlot(null);
    setSeed((s) => s + 1);
  }, []);

  const pieces = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => shuffle([...(timeline?.steps || []), ...(timeline?.distractors || [])]),
    [timeline, seed],
  );
  const pieceById = useMemo(() => Object.fromEntries(pieces.map((p) => [p.id, p])), [pieces]);

  const placedIds = useMemo(() => new Set(Object.values(placements)), [placements]);
  const filledCount = Object.keys(placements).length;
  const done = filledCount === slotCount && slotCount > 0;
  const nextIndex = useMemo(() => {
    for (let i = 0; i < slotCount; i += 1) {
      if (placements[i] == null) return i;
    }
    return -1;
  }, [placements, slotCount]);

  const placePiece = useCallback(
    (slotIndex, pieceId) => {
      const piece = pieceById[pieceId];
      if (!piece || placements[slotIndex] != null) return;
      const position = slotIndex + 1;
      if (piece.order === position) {
        setPlacements((p) => {
          const next = { ...p, [slotIndex]: pieceId };
          if (Object.keys(next).length === slotCount) onComplete?.();
          return next;
        });
        setSelectedId(null);
        setNudge(null);
      } else {
        setMisses((m) => m + 1);
        let text;
        if (piece.order == null) text = piece.nudge || timeline?.nudges?._default;
        else if (piece.order > position) text = timeline?.nudges?.early;
        else text = timeline?.nudges?.late;
        setNudge(text || timeline?.nudges?._default || 'Wrong order.');
        setWrongSlot(slotIndex);
        window.setTimeout(() => setWrongSlot(null), 420);
      }
    },
    [pieceById, placements, slotCount, timeline, onComplete],
  );

  const onSlotClick = (slotIndex) => {
    if (selectedId) placePiece(slotIndex, selectedId);
  };

  const trayPieces = pieces.filter((p) => !placedIds.has(p.id));

  return (
    <div className="timeline-overlay" role="dialog" aria-label={timeline?.title}>
      <div className="timeline-frame">
        <header className="timeline-head">
          <div>
            <div className="timeline-kicker">{timeline?.title}</div>
            <h2 className="timeline-title">{timeline?.subtitle}</h2>
          </div>
          <div className="timeline-stats">
            <span className="timeline-progress">{filledCount}/{slotCount} placed</span>
            <span className="timeline-misses">{misses} miss{misses === 1 ? '' : 'es'}</span>
            <button
              type="button"
              className="timeline-refresh"
              onClick={reshuffle}
              title="Re-shuffle — fresh attempt"
              aria-label="Re-shuffle timeline"
            >
              <IconRefresh />
            </button>
            <button type="button" className="timeline-close" onClick={onClose} aria-label="Close timeline">
              <IconX />
            </button>
          </div>
        </header>

        {/* The ordered track — a connecting line, colored nodes, #notes */}
        <div className={`timeline-track ${done ? 'is-complete' : ''}`}>
          <span className="timeline-rail" aria-hidden="true" />
          {Array.from({ length: slotCount }).map((_, i) => {
            const pieceId = placements[i];
            const piece = pieceId ? pieceById[pieceId] : null;
            const isNext = i === nextIndex;
            const nodeState = piece ? 'is-filled' : isNext ? 'is-next' : 'is-empty';
            return (
              <div key={i} className="timeline-lane">
                <span className={`timeline-node ${nodeState} ${wrongSlot === i ? 'is-wrong' : ''}`}>
                  {piece ? <IconCircleCheck /> : null}
                </span>
                <span className="timeline-note">#{i + 1}</span>
                <div
                  className={`timeline-slot ${piece ? 'filled' : ''} ${wrongSlot === i ? 'wrong' : ''} ${
                    selectedId && !piece ? 'droppable' : ''
                  } ${isNext && selectedId ? 'is-next' : ''}`}
                  onClick={() => onSlotClick(i)}
                  onDragOver={(e) => !piece && e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/piece');
                    if (id) placePiece(i, id);
                  }}
                >
                  {piece ? piece.text : <span className="timeline-slot-empty">drop step {i + 1}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {nudge && (
          <div className="timeline-nudge" role="status">
            <IconStethoscope />
            <span>{nudge}</span>
          </div>
        )}
        {done && (
          <div className="timeline-done">
            <IconCircleCheck />
            <span>{timeline?.done}</span>
          </div>
        )}

        {/* Piece tray */}
        <div className="timeline-tray">
          {trayPieces.length === 0 && !done && <div className="timeline-tray-empty">Tray empty.</div>}
          {trayPieces.map((piece) => (
            <button
              type="button"
              key={piece.id}
              className={`timeline-piece ${selectedId === piece.id ? 'selected' : ''} ${
                piece.order == null ? 'is-distractor' : ''
              }`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/piece', piece.id)}
              onClick={() => setSelectedId((id) => (id === piece.id ? null : piece.id))}
            >
              {piece.text}
            </button>
          ))}
        </div>
        <p className="timeline-tip">Tap a step, then tap the slot where it belongs — or drag it up.</p>
      </div>
    </div>
  );
}
