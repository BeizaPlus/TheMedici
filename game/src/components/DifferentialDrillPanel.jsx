import { useEffect, useRef, useState } from 'react';
import { fetchDifferentialExplain } from '../lib/differentialExplain.js';

/**
 * Slide-in bottom sheet that shows a clinical explainer for a missed diagnosis
 * and offers a "Drill it" button to jump to the next case containing that dx.
 *
 * Props:
 *   diagnosis       {string|null}  — the missed diagnosis to explain; null = closed
 *   topic           {string}       — chief complaint of the current case
 *   caseDiagnosis   {string}       — the case's primary diagnosis
 *   onClose         {() => void}
 *   onDrill         {() => void}   — called when user taps "Drill it"
 *   drillAvailable  {boolean}      — false when no other case contains this dx
 */
export default function DifferentialDrillPanel({
  diagnosis,
  topic,
  caseDiagnosis,
  onClose,
  onDrill,
  drillAvailable = true,
}) {
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastDxRef = useRef('');
  const panelRef = useRef(null);

  const open = Boolean(diagnosis);

  useEffect(() => {
    if (!open) {
      setExplain(null);
      setError('');
      return;
    }
    if (diagnosis === lastDxRef.current && explain) return;
    lastDxRef.current = diagnosis;
    setExplain(null);
    setError('');
    setLoading(true);
    fetchDifferentialExplain({ diagnosis, topic, caseDiagnosis })
      .then((data) => {
        setExplain(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Could not load explainer');
        setLoading(false);
      });
  }, [diagnosis, open, topic, caseDiagnosis]);

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Trap focus inside panel when open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ddrill-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Explainer: ${diagnosis}`}
    >
      <div className="ddrill-panel" ref={panelRef} tabIndex={-1}>
        {/* Handle bar */}
        <div className="ddrill-handle" />

        {/* Header */}
        <div className="ddrill-header">
          <div className="ddrill-header-left">
            <span className="ddrill-kicker">Missed diagnosis</span>
            <h2 className="ddrill-title">{diagnosis}</h2>
          </div>
          <button
            type="button"
            className="ddrill-close"
            onClick={onClose}
            aria-label="Close explainer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="ddrill-body">
          {loading && (
            <div className="ddrill-loading">
              <span className="ddrill-loading-dot" />
              <span className="ddrill-loading-dot" />
              <span className="ddrill-loading-dot" />
              <span className="ddrill-loading-text">Loading clinical explainer…</span>
            </div>
          )}

          {error && !loading && (
            <p className="ddrill-error">{error}</p>
          )}

          {explain && !loading && (
            <>
              {/* Hook */}
              <div className="ddrill-section ddrill-section--hook">
                <p className="ddrill-hook-text">{explain.hook}</p>
              </div>

              {/* Key features */}
              {Array.isArray(explain.features) && explain.features.length > 0 && (
                <div className="ddrill-section">
                  <h3 className="ddrill-section-title">Key distinguishing features</h3>
                  <ul className="ddrill-list">
                    {explain.features.map((f, i) => (
                      <li key={i} className="ddrill-list-item">{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Traps */}
              {Array.isArray(explain.traps) && explain.traps.length > 0 && (
                <div className="ddrill-section">
                  <h3 className="ddrill-section-title ddrill-section-title--trap">Common traps</h3>
                  <ul className="ddrill-list ddrill-list--trap">
                    {explain.traps.map((t, i) => (
                      <li key={i} className="ddrill-list-item">{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trigger clue */}
              {explain.clue && (
                <div className="ddrill-section ddrill-section--clue">
                  <h3 className="ddrill-section-title">Trigger clue</h3>
                  <p className="ddrill-clue-text">{explain.clue}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ddrill-footer">
          <button
            type="button"
            className="ddrill-btn ddrill-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
          {drillAvailable && (
            <button
              type="button"
              className="ddrill-btn ddrill-btn--primary"
              onClick={() => { onDrill?.(); onClose?.(); }}
              disabled={loading}
            >
              Drill it →
            </button>
          )}
          {!drillAvailable && (
            <span className="ddrill-no-drill">No other cases with this dx</span>
          )}
        </div>
      </div>
    </div>
  );
}
