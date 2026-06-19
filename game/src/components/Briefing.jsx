import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/apiBase.js';
import PatientScene from './PatientScene.jsx';
import BriefingCasePicker from './BriefingCasePicker.jsx';
import CaseReviewFlagButton from './CaseReviewFlagButton.jsx';
import CaseContextPanel from './CaseContextPanel.jsx';
import { IconDoorExit } from './sceneToolbar/SceneToolbarIcons.jsx';
import {
  getPatientImagePayload,
  readVisionZones,
  writeVisionZones,
} from '../lib/patientImage.js';
import { getPresentationHistory } from '../lib/casePresentation.js';
import CasePortraitBriefControl from './CasePortraitBriefControl.jsx';
import { clinicalTextStyle, readClinicalTextPrefs } from '../lib/clinicalTextPrefs.js';
import { TEXT_PREFS_CHANGED } from '../lib/textPrefsSync.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import { unlockAmbience } from '../lib/audio.js';
import { getCaseFlow } from '../data/caseFlows.js';
import { getAllGameCases } from '../data/useCcsCatalog.js';
import { getBranding } from '../data/gameData.js';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import {
  getBriefingExam,
  getBriefingHpi,
  getBriefingNoteSections,
} from '../lib/caseBriefing.js';
import { isLearningMode, learnerFacingCaseTitle, formatCaseIdLabel } from '../lib/learningMode.js';
import { usePlayDockLayout } from '../hooks/usePlayDockLayout.js';
import { useCasePortraitSrc } from '../hooks/useCasePortraitSrc.js';
import PsychiatricLunaticIntro, {
  shouldSkipPsychiatricLunaticIntro,
} from './PsychiatricLunaticIntro.jsx';
import { resolvePsychiatricLunaticIntro } from '../lib/resolvePatientPsychiatricRef.js';
import { STORAGE } from '../lib/storageKeys.js';
import {
  BRIEFING_UI_ELEMENTS,
  briefingUiPositionStyle,
  defaultBriefingUiLayout,
  readBriefingUiLayout,
  sanitizeBriefingUiLayout,
  writeBriefingUiLayout,
} from '../lib/briefingUiLayout.js';

function clampZone(z) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const clampRange = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    cx: clamp01(z.cx),
    cy: clamp01(z.cy),
    w: clampRange(z.w, 0.05, 0.22),
    h: clampRange(z.h, 0.04, 0.18),
  };
}

function normalizeZones(zones) {
  const keys = ['zone-monitor', 'zone-iv-bag', 'zone-blood', 'zone-arm', 'zone-icu'];
  if (!zones || typeof zones !== 'object') return null;
  for (const k of keys) {
    if (!zones[k]) return null;
  }
  const out = {};
  for (const k of keys) out[k] = clampZone(zones[k]);
  return out;
}

function uiShellClass(id, entry, layoutStudio) {
  const hidden = layoutStudio && entry?.hidden;
  return [
    'briefing-ui-shell',
    `briefing-ui-${id}`,
    hidden ? 'briefing-ui-hidden' : '',
    layoutStudio ? 'briefing-ui-studio-target' : '',
    entry?.hidden && layoutStudio ? 'briefing-ui-marked-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function studioOnlyPosition(entry, layoutStudio) {
  return layoutStudio ? briefingUiPositionStyle(entry) : undefined;
}

export default function Briefing({ caseData, onBegin, onBack, onSelectCase, studioCapture = false }) {
  const brand = getBranding();
  const [pickerPreviewCase, setPickerPreviewCase] = useState(null);
  const displayCase = pickerPreviewCase || caseData;
  const psychIntro = useMemo(() => resolvePsychiatricLunaticIntro(displayCase), [displayCase]);
  const [lunaticIntroDone, setLunaticIntroDone] = useState(() =>
    shouldSkipPsychiatricLunaticIntro(displayCase?.id),
  );
  const { portraitForceSrc, clearPortraitSrc } = useCasePortraitSrc(displayCase, {
    preferUberPreviewPlate: true,
  });
  const { setPortraitSrc } = useCasePortraitSrc(caseData);
  const [portraitRegenBusy, setPortraitRegenBusy] = useState(false);
  const [portraitRegenMsg, setPortraitRegenMsg] = useState('');
  const [readState, setReadState] = useState('idle');
  const [readMsg, setReadMsg] = useState('');
  const [textPrefs, setTextPrefs] = useState(() => readClinicalTextPrefs());
  const [uiLayout, setUiLayout] = useState(() => sanitizeBriefingUiLayout(readBriefingUiLayout()));
  const [layoutStudio, setLayoutStudio] = useState(false);
  const [selectedUiId, setSelectedUiId] = useState('case-hero');
  const [uiDrag, setUiDrag] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');
  const { layout: dockLayout, startDrag: startDockDrag, resetLayout: resetDockLayout, isDragging: dockDragging } =
    usePlayDockLayout({ storageKey: STORAGE.briefingDockLayout });

  const persistUi = useCallback((next) => {
    setUiLayout(next);
    writeBriefingUiLayout(next);
  }, []);

  useEffect(() => {
    stopCaseReader();
    setReadState('idle');
    setReadMsg('');
  }, [caseData?.id]);

  useEffect(() => () => stopCaseReader(), []);

  useEffect(() => {
    const onPrefs = () => setTextPrefs(readClinicalTextPrefs());
    window.addEventListener(TEXT_PREFS_CHANGED, onPrefs);
    return () => window.removeEventListener(TEXT_PREFS_CHANGED, onPrefs);
  }, []);

  useEffect(() => {
    setPickerPreviewCase(null);
  }, [caseData?.id]);

  useEffect(() => {
    setLunaticIntroDone(shouldSkipPsychiatricLunaticIntro(displayCase?.id));
  }, [displayCase?.id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const savedRegen = portraitForceSrc;
        let payload;
        if (savedRegen?.startsWith('data:')) {
          payload = {
            base64: savedRegen.split(',')[1] || '',
            mimeType: savedRegen.slice(5, savedRegen.indexOf(';')) || 'image/png',
            source: `regen:${caseData.id}`,
          };
        } else if (savedRegen?.startsWith('http')) {
          if (readVisionZones(savedRegen)) return;
          const resp = await fetch(savedRegen);
          const blob = await resp.blob();
          const mimeType = blob.type || 'image/png';
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          payload = {
            base64: dataUrl.split(',')[1] || '',
            mimeType,
            source: savedRegen,
          };
        } else {
          payload = await getPatientImagePayload(caseData);
        }
        if (readVisionZones(payload.source)) return;

        const r = await fetch(apiUrl('/api/detect-zones'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: payload.base64,
            mimeType: payload.mimeType,
          }),
        });
        if (!r.ok) return;
        const data = await r.json();
        const normalized = normalizeZones(data?.zones);
        if (!normalized || cancelled) return;
        writeVisionZones(payload.source, normalized);
      } catch {
        /* ignore — config zones still work */
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [caseData?.id, caseData, portraitForceSrc]);

  useEffect(() => {
    if (!uiDrag) return undefined;
    const onMove = (event) => {
      const { id, startX, startY, originX, originY } = uiDrag;
      setUiLayout((prev) => {
        const next = {
          ...prev,
          [id]: {
            ...prev[id],
            x: Math.round(originX + (event.clientX - startX)),
            y: Math.round(originY + (event.clientY - startY)),
          },
        };
        writeBriefingUiLayout(next);
        return next;
      });
    };
    const onUp = () => setUiDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [uiDrag]);

  const caseFlow = getCaseFlow(caseData);
  const presentationHistory = getPresentationHistory(caseData);
  const textStyle = clinicalTextStyle(textPrefs);

  const hpiText = useMemo(
    () => getBriefingHpi(caseData, caseFlow, presentationHistory),
    [caseData, caseFlow, presentationHistory],
  );
  const examSummary = useMemo(() => getBriefingExam(caseFlow), [caseFlow]);
  const notesSections = useMemo(
    () => getBriefingNoteSections(caseData, caseFlow, presentationHistory),
    [caseData, caseFlow, presentationHistory],
  );

  const handleReadCase = (section, text) => {
    readCaseAloud({
      caseId: caseData.id,
      section,
      text,
      onState: (state, detail) => {
        setReadState(state);
        if (state === 'error') setReadMsg(detail || 'Read failed');
        else if (state === 'generating' && detail === 'browser') setReadMsg('Using browser voice…');
        else if (state === 'generating') setReadMsg('Generating narration…');
        else if (state === 'playing' && detail === 'browser') setReadMsg('');
        else setReadMsg('');
      },
    });
  };

  const startUiDrag = (id, event) => {
    if (!layoutStudio || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedUiId(id);
    const rect = event.currentTarget.getBoundingClientRect();
    const entry = uiLayout[id] || {};
    setUiDrag({
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: entry.x ?? rect.left,
      originY: entry.y ?? rect.top,
    });
  };

  const toggleUiHidden = (id) => {
    persistUi({
      ...uiLayout,
      [id]: { ...uiLayout[id], hidden: !uiLayout[id]?.hidden },
    });
  };

  const resetUiLayout = () => {
    persistUi(defaultBriefingUiLayout());
    setCopyMsg('Layout reset');
  };

  const copyUiLayout = async () => {
    const json = JSON.stringify(uiLayout, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopyMsg('Layout JSON copied');
    } catch {
      setCopyMsg(json.slice(0, 80));
    }
  };

  const selectedEntry = uiLayout[selectedUiId] || {};

  const allCases = useMemo(() => getAllGameCases(), []);
  const caseCycleIndex = useMemo(
    () => allCases.findIndex((c) => String(c.id) === String(caseData?.id)),
    [allCases, caseData?.id],
  );

  const cycleCase = useCallback(
    (delta) => {
      if (!onSelectCase || caseCycleIndex < 0 || allCases.length < 2) return;
      stopCaseReader();
      const next = allCases[(caseCycleIndex + delta + allCases.length) % allCases.length];
      onSelectCase(next);
    },
    [allCases, caseCycleIndex, onSelectCase],
  );

  useEffect(() => {
    if (layoutStudio) return undefined;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cycleCase(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cycleCase(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleCase, layoutStudio]);

  return (
    <main className={`briefing briefing-with-scene briefing-dock-style ${layoutStudio ? 'briefing-layout-studio' : ''}`}>
      {studioCapture && (
        <div className="briefing-studio-bar">
          <button
            type="button"
            className={layoutStudio ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setLayoutStudio((v) => !v)}
          >
            {layoutStudio ? 'Layout studio: ON' : 'Layout studio'}
          </button>
          {layoutStudio && (
            <>
              <div className="briefing-studio-chips" role="listbox" aria-label="Briefing elements">
                {BRIEFING_UI_ELEMENTS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selectedUiId === id}
                    className={`briefing-studio-chip ${selectedUiId === id ? 'active' : ''} ${uiLayout[id]?.hidden ? 'hidden-flag' : ''}`}
                    onClick={() => setSelectedUiId(id)}
                  >
                    {label}
                    {uiLayout[id]?.hidden ? ' · hide' : ''}
                  </button>
                ))}
              </div>
              <label className="briefing-studio-hide-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(selectedEntry.hidden)}
                  onChange={() => toggleUiHidden(selectedUiId)}
                />
                Hide “{BRIEFING_UI_ELEMENTS.find((e) => e.id === selectedUiId)?.label}”
              </label>
              <button type="button" className="btn-ghost" onClick={resetUiLayout}>
                Reset layout
              </button>
              <button type="button" className="btn-ghost" onClick={copyUiLayout}>
                Copy JSON
              </button>
              {copyMsg && <span className="briefing-studio-msg">{copyMsg}</span>}
            </>
          )}
        </div>
      )}

      <div className="panel-controls-stack">
        <button
          type="button"
          className="panel-exit-btn"
          onClick={() => {
            if (layoutStudio) return;
            stopCaseReader();
            onBack();
          }}
          title="Exit case"
          aria-label="Exit case"
        >
          <IconDoorExit />
        </button>
        <CasePortraitBriefControl
          caseData={caseData}
          onBusyChange={setPortraitRegenBusy}
          onRegenerated={(result) => {
            if (result?.dataUrl) setPortraitSrc(result.dataUrl);
            setPortraitRegenMsg('Portrait updated.');
            window.setTimeout(() => setPortraitRegenMsg(''), 4000);
          }}
          onError={(msg) => setPortraitRegenMsg(msg)}
        />
      </div>

      <div className="briefing-scene-wrap">
        {onSelectCase && allCases.length > 1 && (
          <div className="briefing-case-cycler" aria-label="Cycle cases">
            <button
              type="button"
              className="briefing-case-cycler-btn"
              onClick={() => cycleCase(-1)}
              aria-label="Previous case"
              title="Previous case (←)"
            >
              ‹
            </button>
            <span className="briefing-case-cycler-label">
              {caseCycleIndex >= 0 ? `${caseCycleIndex + 1} / ${allCases.length}` : ''}
            </span>
            <button
              type="button"
              className="briefing-case-cycler-btn"
              onClick={() => cycleCase(1)}
              aria-label="Next case"
              title="Next case (→)"
            >
              ›
            </button>
          </div>
        )}
        <PatientScene
          scene={displayCase.patientScene}
          caseData={displayCase}
          className="briefing-scene-img"
          forceSrc={portraitForceSrc}
          showVideoBackground={false}
          onSceneError={() => {
            if (portraitForceSrc) clearPortraitSrc();
          }}
        />
        {psychIntro?.enabled && !lunaticIntroDone && (
          <PsychiatricLunaticIntro
            anchorUrl={psychIntro.anchorUrl}
            videoUrl={psychIntro.videoUrl}
            durationSec={psychIntro.durationSec}
            caseId={psychIntro.caseId}
            onComplete={() => setLunaticIntroDone(true)}
          />
        )}
        <div className="briefing-scene-dim" />
        <div
          className={`briefing-case-hero ${uiShellClass('case-hero', uiLayout['case-hero'], layoutStudio)}`}
          style={studioOnlyPosition(uiLayout['case-hero'], layoutStudio)}
          data-briefing-ui="case-hero"
          onPointerDown={(e) => startUiDrag('case-hero', e)}
        >
          <p className="briefing-case">
            {formatCaseIdLabel(caseData) ? (
              <>CCS Case {formatCaseIdLabel(caseData)}</>
            ) : (
              <>Case briefing</>
            )}
            {caseData.category ? ` · ${caseData.category}` : ''}
            {caseData.timeLimit ? ` · ${caseData.timeLimit}` : ''}
          </p>
          <h1>{learnerFacingCaseTitle(caseData)}</h1>
          {caseData.uberMeta && !isLearningMode() && (
            <div className="briefing-uber-meta">
              <p className="briefing-uber-note">{caseData.uberMeta.briefingNote}</p>
              <ul className="briefing-uber-segments">
                {caseData.uberMeta.segments?.map((seg) => (
                  <li key={seg.id}>
                    <span className="briefing-uber-seg-num">#{seg.ccsNumber}</span> {seg.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {onSelectCase && (
        <div
          className={uiShellClass('case-picker', uiLayout['case-picker'], layoutStudio)}
          style={studioOnlyPosition(uiLayout['case-picker'], layoutStudio)}
          data-briefing-ui="case-picker"
          onPointerDown={(e) => startUiDrag('case-picker', e)}
        >
          <BriefingCasePicker
            currentCaseId={caseData.id}
            onSelectCase={onSelectCase}
            onPreviewCase={setPickerPreviewCase}
          />
        </div>
      )}

      <aside
        className={`game-sidebar briefing-sidebar floating dock-return-zone briefing-command-layer ${uiShellClass('sidebar', uiLayout.sidebar, layoutStudio)} ${dockDragging ? 'dragging' : ''}`}
        style={{
          left: `${dockLayout.x}px`,
          top: `${dockLayout.y}px`,
          width: `${dockLayout.width}px`,
          height: `${dockLayout.height}px`,
          ...studioOnlyPosition(uiLayout.sidebar, layoutStudio),
        }}
        data-briefing-ui="sidebar"
        onPointerDown={(e) => {
          if (!layoutStudio) return;
          if (e.target.closest('.dock-handle, .dock-resize-handle, .dock-panel-clinical, button, input, textarea, a')) {
            return;
          }
          startUiDrag('sidebar', e);
        }}
      >
        <div
          className="dock-handle"
          onPointerDown={(e) => startDockDrag('move', e)}
          title="Drag to move panel"
        >
          ⋮⋮ {brand.name}
          <button
            type="button"
            className="dock-reset-btn"
            onClick={(e) => {
              e.stopPropagation();
              resetDockLayout();
            }}
            title="Reset panel size"
          >
            ↺
          </button>
        </div>
        <div className="dock-panel-clinical briefing-command-body">
          <CaseContextPanel
            key={caseData.id}
            mode="briefing"
            caseData={caseData}
            hpiText={hpiText}
            examSummary={examSummary}
            notesSections={notesSections}
            hideHeader
            textStyle={textStyle}
            defaultTab="hpi"
            readLabel="Read case"
            onReadCase={handleReadCase}
            readState={readState}
            footer={
              <div className="briefing-panel-footer">
                {readMsg && <p className="case-read-msg">{readMsg}</p>}
                {caseData.objective && !isLearningMode() && (
                  <p className="briefing-objective">Objective — {caseData.objective}</p>
                )}
                {portraitRegenMsg && !portraitRegenBusy && (
                  <p className="portrait-brief-status portrait-brief-status--briefing" role="status">
                    {portraitRegenMsg}
                  </p>
                )}
                <div className="briefing-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      stopCaseReader();
                      unlockAmbience();
                      onBegin();
                    }}
                  >
                    Begin case →
                  </button>
                  <CaseReviewFlagButton caseId={caseData.id} compact />
                </div>
              </div>
            }
          />
        </div>
        <div
          className="dock-resize-handle dock-resize-e"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-e', e)}
        />
        <div
          className="dock-resize-handle dock-resize-s"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-s', e)}
        />
        <div
          className="dock-resize-handle dock-resize-se"
          aria-hidden
          onPointerDown={(e) => startDockDrag('resize-se', e)}
        />
      </aside>
    </main>
  );
}
