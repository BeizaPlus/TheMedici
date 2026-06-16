import { useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE } from '../lib/storageKeys.js';
import PlayNotesSessionFoot from './PlayNotesSessionFoot.jsx';

function formatElapsed(at, sessionStartedAt) {
  if (!sessionStartedAt || !at) return '—';
  const delta = Math.max(0, at - sessionStartedAt);
  const sec = Math.floor(delta / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `T+${m}:${String(s).padStart(2, '0')}`;
}

function readCollapsed() {
  try {
    const raw = localStorage.getItem(STORAGE.timelineCollapsed);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export default function PatientOrderTimeline({
  events = [],
  sessionStartedAt = null,
  footProps = null,
  toolbar = null,
  footOnly = false,
}) {
  const trackRef = useRef(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const sorted = useMemo(
    () => [...events].sort((a, b) => (a.at || 0) - (b.at || 0)),
    [events],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el || collapsed) return;
    el.scrollTop = el.scrollHeight;
  }, [sorted.length, collapsed]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE.timelineCollapsed, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (footOnly) {
    if (!footProps) return null;
    return (
      <div className="patient-order-timeline-foot-only" aria-label="Session controls">
        <PlayNotesSessionFoot {...footProps} toolbar={toolbar} />
      </div>
    );
  }

  return (
    <aside
      className={`patient-order-timeline${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Patient order timeline"
    >
      <header className="patient-order-timeline-head">
        <button
          type="button"
          className="patient-order-timeline-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
        >
          <span className="patient-order-timeline-title">Orders · this patient</span>
          <span className="patient-order-timeline-count">{sorted.length}</span>
          <span className="patient-order-timeline-chevron" aria-hidden>
            {collapsed ? '▴' : '▾'}
          </span>
        </button>
      </header>
      {!collapsed && (
        <>
          <div className="patient-order-timeline-track" ref={trackRef}>
            {sorted.length === 0 ? (
              <p className="patient-order-timeline-empty">
                Orders appear here as you treat the patient — oldest at the bottom, newest above.
              </p>
            ) : (
              <ol className="patient-order-timeline-list">
                <li className="patient-order-timeline-spine" aria-hidden />
                {sorted.map((ev) => (
                  <li
                    key={ev.id}
                    className={`patient-order-timeline-item kind-${ev.kind || 'order'}`}
                  >
                    <span className="patient-order-timeline-dot" aria-hidden />
                    <div className="patient-order-timeline-body">
                      <time
                        className="patient-order-timeline-time"
                        dateTime={new Date(ev.at).toISOString()}
                      >
                        {formatElapsed(ev.at, sessionStartedAt)}
                      </time>
                      <span className="patient-order-timeline-label">{ev.label}</span>
                      {ev.orderIndex != null && (
                        <span className="patient-order-timeline-seq">#{ev.orderIndex}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {footProps && (
            <div className="patient-order-timeline-foot">
              <PlayNotesSessionFoot {...footProps} toolbar={toolbar} />
            </div>
          )}
        </>
      )}
    </aside>
  );
}
