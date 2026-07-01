import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ladyRefs from '../data/patientLadyRefs.json' with { type: 'json' };
import uberRefs from '../data/patientUberRefs.json' with { type: 'json' };

const CASE_CHAR_REF_KEY = 'schoonmaker_case_char_ref';

function readCaseCharRef(caseId) {
  try {
    const raw = localStorage.getItem(CASE_CHAR_REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[String(caseId)] || null;
  } catch {
    return null;
  }
}

function writeCaseCharRef(caseId, slug) {
  try {
    const raw = localStorage.getItem(CASE_CHAR_REF_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (slug) {
      parsed[String(caseId)] = { slug, updatedAt: Date.now() };
    } else {
      delete parsed[String(caseId)];
    }
    localStorage.setItem(CASE_CHAR_REF_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

// --- Build entries from shipped assets ---

function buildLadyEntries() {
  return Object.entries(ladyRefs.refs || {}).map(([slug, entry]) => ({
    slug: `lady:${slug}`,
    label: entry.label || slug,
    publicUrl: `${ladyRefs.assetBase || '/assets/patient/ladies'}/${entry.file}`,
    category: 'ladies',
    sex: 'female',
  }));
}

function buildUberEntries() {
  return Object.entries(uberRefs.refs || {})
    .filter(([, entry]) => entry.mapFile && entry.characterMapStatus === 'approved' && !entry.label?.startsWith?.('BANK'))
    .map(([slug, entry]) => ({
      slug: `uber:${slug}`,
      label: entry.label || slug,
      publicUrl: `${uberRefs.assetBase || '/assets/patient/uber'}/${entry.mapFile}`,
      category: 'uber',
      sex: entry.sex || 'male',
    }));
}

function buildPedEntries() {
  // Shipped pediatric maps in public/assets/patient/pediatric/
  const shipped = [
    { slug: 'ped:ped-boy-laugh', label: 'Boy laughing', file: 'ped-boy-laugh-CHARACTER-MAP.png', sex: 'male' },
    { slug: 'ped:ped-boy-post-ictal', label: 'Boy post-ictal', file: 'ped-boy-post-ictal-CHARACTER-MAP.png', sex: 'male' },
    { slug: 'ped:ped-girl-disgust', label: 'Girl disgust', file: 'ped-girl-disgust-CHARACTER-MAP.png', sex: 'female' },
  ];
  return shipped.map((p) => ({
    slug: p.slug,
    label: p.label,
    publicUrl: `/assets/patient/pediatric/${p.file}`,
    category: 'pediatric',
    sex: p.sex,
  }));
}

const TABS = [
  { key: 'ladies', label: 'Ladies' },
  { key: 'uber', label: 'Uber' },
  { key: 'pediatric', label: 'Pediatric' },
  { key: 'paste', label: '+ New' },
];

const ALL_ENTRIES = {
  ladies: buildLadyEntries(),
  uber: buildUberEntries(),
  pediatric: buildPedEntries(),
};

export default function CharacterMapsPendant({ caseId, open, onClose, onSelect, selectedSlug, anchorRef }) {
  const [rect, setRect] = useState({ top: 120, right: 56 });
  const [activeTab, setActiveTab] = useState('ladies');
  const [pasteImage, setPasteImage] = useState(null);
  const [pasteDragOver, setPasteDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  // Keyboard paste (Ctrl+V)
  useEffect(() => {
    if (!open || activeTab !== 'paste') return undefined;
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type?.startsWith?.('image/')) {
          const blob = item.getAsFile();
          if (blob) handlePastedFile(blob);
          break;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open, activeTab]);

  const handlePastedFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPasteImage({
        dataUrl: reader.result,
        name: file.name || 'pasted-screenshot.png',
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setPasteDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.[0]?.type?.startsWith?.('image/')) {
      handlePastedFile(files[0]);
    }
  }, [handlePastedFile]);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handlePastedFile(file);
    e.target.value = '';
  }, [handlePastedFile]);

  const clearPasteImage = useCallback(() => {
    setPasteImage(null);
  }, []);

  const handleSelect = (slug) => {
    if (selectedSlug === slug) {
      writeCaseCharRef(caseId, null);
      onSelect(null);
    } else {
      writeCaseCharRef(caseId, slug);
      onSelect(slug);
    }
  };

  if (!open) return null;

  const currentEntries = activeTab === 'paste' ? [] : (ALL_ENTRIES[activeTab] || []);

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
        width: 340,
        zIndex: 10002,
      }}
    >
      <div className="character-maps-header">
        <h3>Character maps</h3>
        <span className="character-maps-subtitle">Pick a patient likeness — or paste a screenshot</span>
      </div>

      {/* Tabs */}
      <div className="character-maps-tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`character-maps-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {key === 'paste' ? '＋' : ''}{label}
          </button>
        ))}
      </div>

      {/* Grid (non-paste tabs) */}
      {activeTab !== 'paste' && (
        <div className="character-maps-grid">
          {currentEntries.length === 0 && (
            <div className="character-maps-empty">No maps in this category yet</div>
          )}
          {currentEntries.map(({ slug, label, publicUrl }) => (
            <button
              key={slug}
              type="button"
              className={`character-map-card${selectedSlug === slug ? ' selected' : ''}`}
              onClick={() => handleSelect(slug)}
              title={label}
            >
              <img src={publicUrl} alt={label} className="character-map-thumb" />
              <span className="character-map-label">{label}</span>
              {selectedSlug === slug && <span className="character-map-check">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Paste tab */}
      {activeTab === 'paste' && (
        <div className="character-maps-paste">
          {!pasteImage ? (
            <div
              className={`character-maps-dropzone${pasteDragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setPasteDragOver(true); }}
              onDragLeave={() => setPasteDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="character-maps-dropzone-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 8h.01" />
                  <path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z" />
                  <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" />
                  <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" />
                </svg>
              </div>
              <span className="character-maps-dropzone-text">Drop or paste a screenshot</span>
              <span className="character-maps-dropzone-hint">
                Ctrl+V or drag an image — we'll generate a character map from it
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFilePick}
              />
            </div>
          ) : (
            <div className="character-maps-preview">
              <img src={pasteImage.dataUrl} alt="Pasted screenshot" className="character-maps-preview-img" />
              <div className="character-maps-preview-name">{pasteImage.name}</div>
              <div className="character-maps-preview-actions">
                <button
                  type="button"
                  className="character-maps-btn character-maps-btn-primary"
                  onClick={() => {
                    // TODO: trigger Magnific MCP character-map generation
                    alert('Character map generation coming — Magnific MCP will create a multi-angle contact sheet, then an ED baseplate portrait.');
                  }}
                >
                  Generate character map
                </button>
                <button
                  type="button"
                  className="character-maps-btn"
                  onClick={clearPasteImage}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="character-maps-footer">
        <button
          type="button"
          className="character-maps-auto"
          onClick={() => {
            writeCaseCharRef(caseId, null);
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
