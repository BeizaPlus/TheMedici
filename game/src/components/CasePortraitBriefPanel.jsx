import { useCallback, useEffect, useState } from 'react';
import { IconRefresh } from './sceneToolbar/SceneToolbarIcons.jsx';
import { clearVisionZones, writeVisionZones } from '../lib/patientImage.js';
import {
  readCasePortraitBrief,
  writeCasePortraitBrief,
} from '../lib/casePortraitBrief.js';
import { regeneratePatientFromCase } from '../lib/patientRegen.js';

const API = 'http://127.0.0.1:3001';

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

async function detectZonesForDataUrl(dataUrl, sourceKey) {
  if (!dataUrl?.startsWith('data:')) return null;
  const base64 = dataUrl.split(',')[1] || '';
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/png';
  const r = await fetch(`${API}/api/detect-zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  const normalized = normalizeZones(data?.zones);
  if (!normalized) return null;
  writeVisionZones(sourceKey, normalized);
  return normalized;
}

export default function CasePortraitBriefPanel({
  caseData,
  onRegenerated,
  onError,
  onBusyChange,
  compact = false,
}) {
  const caseId = caseData?.id;
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const stored = caseId != null ? readCasePortraitBrief(caseId) : { enabled: false, text: '' };
  const enabled = stored.enabled;

  useEffect(() => {
    setDraft(stored.text);
  }, [caseId, tick, stored.text]);

  const persist = useCallback(
    (next) => {
      if (caseId == null) return;
      writeCasePortraitBrief(caseId, next);
      setTick((t) => t + 1);
    },
    [caseId],
  );

  const handleToggle = useCallback(() => {
    const nextEnabled = !enabled;
    persist({ enabled: nextEnabled, text: draft });
  }, [draft, enabled, persist]);

  const handleBlur = useCallback(() => {
    if (caseId == null) return;
    if (draft === stored.text && enabled === stored.enabled) return;
    persist({ enabled, text: draft });
  }, [caseId, draft, enabled, persist, stored.enabled, stored.text]);

  const handleRegenerate = useCallback(async () => {
    if (busy || !caseId) return;
    persist({ enabled, text: draft });
    setBusy(true);
    setStatus('Generating portrait with OpenAI…');
    onBusyChange?.(true);
    try {
      clearVisionZones();
      const result = await regeneratePatientFromCase(caseData, { refresh: true });
      setStatus('Mapping drop zones…');
      const sourceKey = `regen:${caseId}`;
      await detectZonesForDataUrl(result.dataUrl, sourceKey);
      onRegenerated?.(result);
      setStatus('Portrait updated.');
    } catch (e) {
      setStatus('');
      onError?.(String(e.message || e));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      window.setTimeout(() => setStatus((s) => (s === 'Portrait updated.' ? '' : s)), 4000);
    }
  }, [busy, caseData, caseId, draft, enabled, onBusyChange, onError, onRegenerated, persist]);

  if (!caseId) return null;

  return (
    <div
      className={`portrait-brief${compact ? ' portrait-brief--compact' : ''}${busy ? ' is-busy' : ''}`}
      aria-label="Custom patient portrait"
      aria-busy={busy}
    >
      <div className="portrait-brief-head">
        <span className="portrait-brief-title">Patient portrait</span>
        <button
          type="button"
          className={`portrait-brief-toggle${enabled ? ' is-on' : ''}`}
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          title={enabled ? 'Custom look on — your description guides OpenAI' : 'Auto look from case JSON'}
        >
          {enabled ? 'Custom' : 'Auto'}
        </button>
      </div>
      <p className="portrait-brief-hint">
        {enabled
          ? 'Describe how this patient must look — age, pose, distress, clothing — then regenerate.'
          : 'Uses case demographics and chief complaint. Turn on Custom to override.'}
      </p>
      {enabled && (
        <textarea
          className="portrait-brief-input"
          rows={compact ? 3 : 4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g. 6-year-old boy, sickle cell crisis, curled on stretcher, parents at bedside, monitor cables visible, dignified ED lighting…"
          aria-label="Portrait description for OpenAI"
        />
      )}
      <button
        type="button"
        className="portrait-brief-regen"
        onClick={() => void handleRegenerate()}
        disabled={busy || (enabled && !draft.trim())}
        title="Regenerate this case's patient image with OpenAI"
      >
        <IconRefresh className={busy ? 'spin' : ''} aria-hidden />
        {busy ? 'Regenerating…' : enabled ? 'Regenerate with custom look' : 'Regenerate portrait'}
      </button>
      {(busy || status) && (
        <p className="portrait-brief-status" role="status" aria-live="polite">
          {busy ? (
            <>
              {status || 'Regenerating…'}
              <span className="portrait-brief-status-note"> Usually 20–40 seconds.</span>
            </>
          ) : (
            status
          )}
        </p>
      )}
    </div>
  );
}
