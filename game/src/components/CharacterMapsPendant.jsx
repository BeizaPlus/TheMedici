import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ladyRefs from '../data/patientLadyRefs.json' with { type: 'json' };
import { STORAGE } from '../lib/storageKeys.js';

const LADY_REFS_KEY = 'schoonmaker_case_lady_ref';

function readCaseLadyRef(caseId) {
  try {
    const raw = localStorage.getItem(LADY_REFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[String(caseId)] || null;
  } catch {
    return null;
  }
}

function writeCaseLadyRef(caseId, slug) {
  try {
    const raw = localStorage.getItem(LADY_REFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (slug) {
      parsed[String(caseId)] = slug;
    } else {
      delete parsed[String(caseId)];
    }
    localStorage.setItem(LADY_REFS_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

const ENTRIES = Object.entries(ladyRefs.refs || {}).map(([slug, entry]) => ({
  slug,
  label: entry.label || slug,
  file: entry.file,
  publicUrl: `${ladyRefs.assetBase || '/assets/patient/ladies'}/${entry.file}`,
}));

export default function CharacterMapsPendant({ caseId, open, onClose, onSelect, selectedSlug, anchorRef }) {
  const [rect, setRect] = useState({ top: 120, right: 56 });

  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setRect({ top: Math.max(8, r.top - 8), right: window.innerWidth - r.left + 8 });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (e) => {
      if (e.target?.closest?.('.character-maps-popover')) return;
      onClose();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="character-maps-popover"
      role="dialog"
      aria-label="Character maps"
      style={{
        position: 'fixed',
        right: rect.right,
        top: rect.top,
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
        width: 320,
        zIndex: 10002,
      }}
    >
      <div className="character-maps-header">
        <h3>Character maps</h3>
        <span className="character-maps-subtitle">Pick a patient likeness for this case</span>
      </div>
      <div className="character-maps-grid">
        {ENTRIES.map(({ slug, label, publicUrl }) => (
          <button
            key={slug}
            type="button"
            className={`character-map-card${selectedSlug === slug ? ' selected' : ''}`}
            onClick={() => {
              if (selectedSlug === slug) {
                writeCaseLadyRef(caseId, null);
                onSelect(null);
              } else {
                writeCaseLadyRef(caseId, slug);
                onSelect(slug);
              }
            }}
            title={label}
          >
            <img src={publicUrl} alt={label} className="character-map-thumb" />
            <span className="character-map-label">{label}</span>
            {selectedSlug === slug && <span className="character-map-check">✓</span>}
          </button>
        ))}
      </div>
      <div className="character-maps-footer">
        <button
          type="button"
          className="character-maps-auto"
          onClick={() => {
            writeCaseLadyRef(caseId, null);
            onSelect(null);
            onClose();
          }}
        >
          Auto (rotation by region)
        </button>
      </div>
    </div>,
    document.body,
  );
}
