import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import CaseRecordButton from './CaseRecordButton.jsx';
import PlayChatNotesTabPanel from './PlayChatNotesTabPanel.jsx';
import { IconMessage, IconStethoscope } from './sceneToolbar/SceneToolbarIcons.jsx';

const MIN_W = 320;
const MIN_H = 300;

export default function DifferentialFloatingChat({
  open,
  onClose,
  chat,
  caseData,
  caseId,
  caseRecording,
  notesVersion = 0,
  patientMode = false,
  defaultChatTarget = 'notes',
  onPatientModeChange,
  onNotesChanged,
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: 24, y: 96 });
  const [size, setSize] = useState(() => ({
    w: Math.min(420, window.innerWidth - 32),
    h: Math.min(560, window.innerHeight - 120),
  }));
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(null);
  const dragRef = useRef({ dx: 0, dy: 0 });
  const resizeRef = useRef({ sx: 0, sy: 0, sw: 0, sh: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const w = size.w;
    const h = size.h;
    const study = document.querySelector('.diff-study-panel');
    if (study) {
      const r = study.getBoundingClientRect();
      setPos({
        x: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
        y: Math.max(72, r.top - h - 10),
      });
      return;
    }
    setPos({
      x: Math.max(16, window.innerWidth - w - 16),
      y: Math.max(72, window.innerHeight - h - 140),
    });
  }, [open, caseId, size.w, size.h]);

  useEffect(() => {
    if (!open || !chat?.reloadHistory) return;
    void chat.reloadHistory();
  }, [open, chat?.reloadHistory, caseId]);

  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
  }, []);

  const onResizeStart = useCallback(
    (edge) => (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { sx: e.clientX, sy: e.clientY, sw: size.w, sh: size.h };
      setResizing(edge);
    },
    [size],
  );

  useEffect(() => {
    if (!dragging && !resizing) return undefined;

    const onMove = (e) => {
      if (dragging) {
        setPos((p) => ({
          x: Math.min(Math.max(0, e.clientX - dragRef.current.dx), window.innerWidth - size.w),
          y: Math.min(Math.max(0, e.clientY - dragRef.current.dy), window.innerHeight - size.h),
        }));
      }
      if (resizing) {
        const dx = e.clientX - resizeRef.current.sx;
        const dy = e.clientY - resizeRef.current.sy;
        setSize((s) => {
          let nw = s.w;
          let nh = s.h;
          if (resizing === 'e' || resizing === 'se') nw = Math.max(MIN_W, resizeRef.current.sw + dx);
          if (resizing === 's' || resizing === 'se') nh = Math.max(MIN_H, resizeRef.current.sh + dy);
          return { w: nw, h: nh };
        });
      }
    };

    const onUp = () => {
      setDragging(false);
      setResizing(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, resizing, size.w, size.h]);

  if (!open || !chat || !caseData) return null;

  return createPortal(
    <aside
      ref={panelRef}
      className={`case-chat-panel case-chat-panel--floating diff-floating-chat${dragging ? ' case-chat-dragging' : ''}${resizing ? ' case-chat-resizing' : ''}`}
      aria-label="Case chat"
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${size.w}px`, height: `${size.h}px` }}
    >
      <header
        className="case-chat-head case-chat-drag-handle"
        onPointerDown={onDragStart}
        title="Drag to move"
      >
        <div className="case-chat-head-text">
          <IconMessage />
          <span>Case chat</span>
          <span className="case-chat-case-id">#{caseData?.ccsNumber || caseId}</span>
        </div>
        <div className="case-chat-head-actions">
          <button
            type="button"
            className={`case-chat-patient-btn${patientMode ? ' is-active' : ''}`}
            title={
              patientMode
                ? 'Patient mode ON — simulated patient replies'
                : defaultChatTarget === 'tutor'
                  ? 'Tutor chat — click for patient interview mode'
                  : 'Notes mode — click for patient mode or type /pt'
            }
            aria-label={patientMode ? 'Patient mode on' : 'Turn on patient mode'}
            aria-pressed={patientMode}
            onClick={() => onPatientModeChange?.(!patientMode)}
          >
            <IconStethoscope className="toolbar-icon" />
          </button>
          {caseRecording && (
            <CaseRecordButton
              {...caseRecording}
              compact
              variant="toolbar"
              iconOnly
              chatMode={chat.available === true}
            />
          )}
          <button type="button" className="case-chat-close" onClick={onClose} aria-label="Hide case chat">
            <FiX aria-hidden />
          </button>
        </div>
      </header>

      <div className="diff-floating-chat-body">
        <PlayChatNotesTabPanel
          chat={chat}
          caseData={caseData}
          caseId={caseId}
          caseRecording={caseRecording}
          notesVersion={notesVersion}
          suppressHeader
          patientMode={patientMode}
          defaultChatTarget={defaultChatTarget}
          onPatientModeChange={onPatientModeChange}
          onTimelineNote={() => onNotesChanged?.()}
        />
      </div>

      <div className="chat-resize-handle chat-resize-e" onPointerDown={onResizeStart('e')} aria-hidden />
      <div className="chat-resize-handle chat-resize-s" onPointerDown={onResizeStart('s')} aria-hidden />
      <div className="chat-resize-handle chat-resize-se" onPointerDown={onResizeStart('se')} aria-hidden />
    </aside>,
    document.body,
  );
}
