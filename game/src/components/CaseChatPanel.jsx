import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import { IconCopy, IconFileMedical, IconNotes, IconPlayerStop, IconVolume2 } from './sceneToolbar/SceneToolbarIcons.jsx';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { resolveOrderAutocomplete } from '../lib/orderCommandAutocomplete.js';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { readCaseNotes, writeCaseNotes } from '../lib/caseNotes.js';

function normCommandText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stackAliases(stack) {
  const label = String(stack?.label || '');
  const aliases = new Set([label, ...(Array.isArray(stack?.aliases) ? stack.aliases : [])]);
  label.split('/').forEach((part) => {
    const trimmed = part.trim();
    if (trimmed) aliases.add(trimmed);
  });
  label.split(':').forEach((part) => {
    const trimmed = part.trim();
    if (trimmed && trimmed.length > 2) aliases.add(trimmed);
  });
  return [...aliases].filter(Boolean);
}

const MIN_W = 340;
const MIN_H = 320;

export default function CaseChatPanel({
  chat,
  caseData,
  open,
  onClose,
  playSessionId,
  // order-related props
  interventions = [],
  decoyInterventions = [],
  placed = {},
  allMedicalOrders = [],
  onOrderPlaced,
}) {
  const {
    available,
    messages,
    busy,
    error,
    sessionId,
    sendMessage,
  } = chat;
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const caseId = caseData?.id;
  const [input, setInput] = useState('');
  const [readingIdx, setReadingIdx] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  // ── floating position & size ──
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, (window.innerWidth - 440) / 2),
    y: Math.max(64, (window.innerHeight - 520) / 2),
  }));
  const [size, setSize] = useState(() => ({
    w: Math.min(440, window.innerWidth - 32),
    h: Math.min(560, window.innerHeight - 96),
  }));

  // ── drag state ──
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ dx: 0, dy: 0 });

  // ── resize state ──
  const [resizing, setResizing] = useState(null); // 'e' | 's' | 'se'
  const resizeRef = useRef({ sx: 0, sy: 0, sw: 0, sh: 0 });

  // drag
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
  }, []);

  // resize
  const onResizeStart = useCallback((edge) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      sw: size.w,
      sh: size.h,
    };
    setResizing(edge);
  }, [size]);

  useEffect(() => {
    if (!dragging && !resizing) return;

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
  }, [dragging, resizing, size]);

  // ── order matching (same logic as treatment tab) ──
  const commandMatch = useMemo(() => {
    const t = normCommandText(input);
    if (t.length <= 2) return null;
    for (const s of interventions) {
      if (placed[s.id]) continue;
      for (const a of stackAliases(s)) {
        const alias = normCommandText(a);
        if (!alias) continue;
        if (t.includes(alias) || alias.includes(t)) return s;
      }
    }
    return null;
  }, [interventions, input, placed]);

  const decoyCommandMatch = useMemo(() => {
    const t = normCommandText(input);
    if (t.length <= 2) return null;
    for (const d of decoyInterventions) {
      if (placed[d.id]) continue;
      for (const a of stackAliases(d)) {
        const alias = normCommandText(a);
        if (!alias) continue;
        if (t.includes(alias) || alias.includes(t)) return d;
      }
    }
    return null;
  }, [decoyInterventions, input, placed]);

  const knownOrderMatch = useMemo(() => {
    const t = normCommandText(input);
    if (t.length <= 2 || commandMatch) return null;
    return (
      allMedicalOrders.find((order) => {
        const name = normCommandText(order.name);
        const firstWord = name.split(' ')[0];
        if (!name) return false;
        return name.includes(t) || t.includes(name) || (firstWord.length > 2 && t.includes(firstWord));
      }) || null
    );
  }, [commandMatch, input, allMedicalOrders]);

  const orderCommandHint = useMemo(() => {
    if (!input.trim()) return 'Matches unplaced stacks only';
    if (commandMatch) return `Match: ${commandMatch.label}`;
    if (decoyCommandMatch) return `Match: ${decoyCommandMatch.label}`;
    if (knownOrderMatch) return '';
    return 'Order not recognized';
  }, [input, commandMatch, decoyCommandMatch, knownOrderMatch]);

  const commandUiMatch = commandMatch || decoyCommandMatch;
  const isOrder = Boolean(commandUiMatch);

  const inputAutocomplete = useMemo(() => {
    if (commandUiMatch) return resolveOrderAutocomplete(input, commandUiMatch);
    if (knownOrderMatch) return resolveOrderAutocomplete(input, knownOrderMatch);
    return null;
  }, [input, commandUiMatch, knownOrderMatch]);

  const orderCommandHintDisplay = useMemo(() => {
    const base = orderCommandHint;
    if (inputAutocomplete && base && base !== 'Order not recognized') {
      return `${base} · Tab to complete`;
    }
    if (inputAutocomplete && knownOrderMatch && !base) {
      return `Match: ${knownOrderMatch.name} · Tab to complete`;
    }
    return base;
  }, [orderCommandHint, inputAutocomplete, knownOrderMatch]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!open) {
      stopCaseReader();
      setReadingIdx(null);
    }
  }, [open]);

  useEffect(() => () => {
    stopCaseReader();
  }, []);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    // If it matches an order, place it instead of chatting
    if (commandUiMatch) {
      if (onOrderPlaced) {
        onOrderPlaced(commandUiMatch, text);
      }
      setInput('');
      return;
    }

    if (!sessionId && available === false) return;
    setInput('');
    await sendMessage(text, { notesMode });
  }, [input, sessionId, busy, sendMessage, commandUiMatch, onOrderPlaced, notesMode, available]);

  const canSend = Boolean(
    available !== false && (sessionId || isOrder) && input.trim() && !busy,
  );

  const inputRef = useRef(null);

  // keep focus in input after submit / order
  useEffect(() => {
    if (!busy && open) {
      inputRef.current?.focus();
    }
  }, [busy, open]);

  if (!open) return null;

  return (
    <aside
        ref={panelRef}
        className={`case-chat-panel case-chat-panel--floating ${dragging ? 'case-chat-dragging' : ''} ${resizing ? 'case-chat-resizing' : ''}`}
        aria-label="Chat with case"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${size.w}px`,
          height: `${size.h}px`,
        }}
      >
        {/* ── drag handle header ── */}
        <header
          className="case-chat-head case-chat-drag-handle"
          onPointerDown={onDragStart}
          title="Drag to move"
        >
          <div className="case-chat-head-text">
            <IconFileMedical />
            <span>Case chat</span>
            <span className="case-chat-case-id">#{caseData?.ccsNumber || caseData?.id}</span>
          </div>
          <div className="case-chat-head-actions">
            <button
              type="button"
              className={`case-chat-notes-btn ${notesMode ? 'is-active' : ''}`}
              title={notesMode ? 'Notes mode: ON — replies append to case notes' : 'Notes mode: OFF — replies stay in chat only'}
              aria-label={notesMode ? 'Disable notes mode' : 'Enable notes mode'}
              aria-pressed={notesMode}
              onClick={() => setNotesMode((v) => !v)}
            >
              <IconNotes />
            </button>
            <button
              type="button"
              className="case-chat-copy-all-btn"
              title="Copy all messages"
              aria-label="Copy all messages"
              onClick={() => {
                const text = messages.map((m) => `[${m.role}] ${m.content}`).join('\n\n');
                navigator.clipboard.writeText(text).catch(() => {});
              }}
            >
              <IconCopy />
            </button>
            <button type="button" className="case-chat-close" onClick={onClose} aria-label="Close case chat">
              <FiX aria-hidden />
            </button>
          </div>
        </header>

        {available === false && (
          <p className="case-chat-banner bad">
            Add <code>DEEPSEEK_API_KEY</code> or <code>OPENAI_API_KEY</code> to <code>.env</code> in the project folder, then restart the API
            server.
          </p>
        )}
        {error && <p className="case-chat-banner bad">{error}</p>}

        <div className="case-chat-messages selectable-text" ref={listRef}>
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}-${m.content.slice(0, 24)}`} className={`case-chat-bubble ${m.role}`}>
              <span className="case-chat-bubble-text">{renderChatMarkdown(m.content)}</span>
              {m.role === 'assistant' && (
                <div className="case-chat-bubble-actions">
                  <button
                    type="button"
                    className={`case-chat-bubble-btn case-chat-read-btn ${readingIdx === i ? 'is-reading' : ''}`}
                    title={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                    aria-label={readingIdx === i ? 'Stop reading' : 'Read aloud'}
                    onClick={() => {
                      if (readingIdx === i) {
                        stopCaseReader();
                        setReadingIdx(null);
                      } else {
                        stopCaseReader();
                        setReadingIdx(i);
                        if (notesMode && caseId) {
                          const stamp = new Date().toLocaleTimeString();
                          writeCaseNotes(caseId, (readCaseNotes(caseId) + `\n\n---\n**Read · ${stamp}**\n${m.content}\n`).trimStart());
                        }
                        readCaseAloud({
                          caseId,
                          section: 'chat',
                          text: m.content,
                          onState: (state) => {
                            if (state === 'idle' || state === 'error') setReadingIdx(null);
                          },
                        });
                      }
                    }}
                  >
                    {readingIdx === i ? <IconPlayerStop /> : <IconVolume2 />}
                  </button>
                  <button
                    type="button"
                    className="case-chat-bubble-btn case-chat-copy-btn"
                    title="Copy message"
                    aria-label="Copy message"
                    onClick={() => {
                      navigator.clipboard.writeText(m.content).catch(() => {});
                    }}
                  >
                    <IconCopy />
                  </button>
                </div>
              )}
            </div>
          ))}
          {busy && <div className="case-chat-bubble assistant typing">Thinking…</div>}
        </div>

        {/* ── treatment-style command form ── */}
        <form
          className="case-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="case-chat-cmd-ui">
            <div className="case-chat-cmd-input-wrap">
              <IconFileMedical />
              <input
                ref={inputRef}
                type="text"
                className="case-chat-cmd-input"
                placeholder="Type an order or ask about this case…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && inputAutocomplete && !e.shiftKey) {
                    e.preventDefault();
                    setInput(inputAutocomplete);
                    requestAnimationFrame(() => {
                      const len = inputAutocomplete.length;
                      inputRef.current?.setSelectionRange(len, len);
                    });
                  }
                }}
                disabled={busy || (available === false && !isOrder)}
                aria-autocomplete="inline"
              />
            </div>
            <button
              type="submit"
              className={`btn-ghost case-chat-cmd-btn ${isOrder ? 'is-order' : ''}`}
              disabled={!canSend}
            >
              {isOrder ? 'Order' : <FiSend aria-hidden />}
            </button>
            <div
              className={`case-chat-cmd-hint ${commandUiMatch ? 'has-match' : knownOrderMatch ? 'known-order' : ''}`}
              aria-live="polite"
            >
              {orderCommandHintDisplay || ' '}
            </div>
          </div>
        </form>

        {/* ── resize handles ── */}
        <div className="chat-resize-handle chat-resize-e" onPointerDown={onResizeStart('e')} aria-hidden />
        <div className="chat-resize-handle chat-resize-s" onPointerDown={onResizeStart('s')} aria-hidden />
        <div className="chat-resize-handle chat-resize-se" onPointerDown={onResizeStart('se')} aria-hidden />
      </aside>
  );
}
