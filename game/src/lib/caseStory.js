import playbookBundle from '../data/orderWhyPlaybook.json' with { type: 'json' };
import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';
import { mergeCaseStoryWithOverride } from './caseStoryOverrides.js';
import { caseStorySessionFingerprint } from './caseStorySessionFingerprint.js';

function normalizeCaseId(caseId) {
  const raw = String(caseId ?? '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

function playbookWhy(caseId, orderId) {
  const ck = normalizeCaseId(caseId);
  return playbookBundle?.cases?.[ck]?.[orderId]?.why || '';
}

function collectOrders(caseData) {
  const list = Array.isArray(caseData?.interventions) ? caseData.interventions : [];
  const cid = normalizeCaseId(caseData?.id);
  return list.map((iv) => ({
    id: iv.id,
    label: iv.label,
    why: String(iv.why || playbookWhy(cid, iv.id) || '').trim(),
  }));
}

/** Offline case story for case 001 (tension pneumothorax) and generic fallback. */
export function buildCaseStoryOffline(caseData, { sessionContext = {} } = {}) {
  const cid = normalizeCaseId(caseData?.id);
  const orders = collectOrders(caseData);
  const placed = (sessionContext?.stacksPlaced || []).map((s) => s.label || s.id).filter(Boolean);

  const is001 = cid === '001';
  const is051 = cid === '051';
  const patientLock = is001
    ? 'Adult male, diaphoretic, in extremis — tension pneumothorax presentation'
    : is051
      ? '70-year-old Caucasian man, hospital gown, withdrawn expression, no focal deficits'
      : `${caseData?.category || 'ED'} patient — same likeness as play portrait`;

  const chapters = is001
    ? [
        {
          id: 'c1',
          heading: 'Arrival',
          body: 'He arrives clutching his chest, tachypneic and diaphoretic. Breath sounds are absent on one side; the trachea has begun to shift. This is a bedside diagnosis — not a film to wait for.',
        },
        {
          id: 'c2',
          heading: 'The missed minute',
          body: placed.length
            ? `With ${placed.slice(0, 3).join(', ')} in motion, the team treats obstruction before collapse.`
            : 'Without immediate decompression, venous return falls and pulse pressure narrows — minutes matter.',
        },
        {
          id: 'c3',
          heading: 'Oversight',
          body: 'From the foot of the bed you see the whole resuscitation bay: one patient, one airway, one chest that must be relieved now.',
        },
      ]
    : is051
      ? [
          {
            id: 'c1',
            heading: 'Disruption',
            body: 'His daughter brought him because he stopped answering. The man who used to balance his own books now stares through people as if the room were glass. Four weeks earlier he hit the bedroom floor getting up to urinate — they found him in the morning and left with a cane prescription, not a question.',
            visualHint:
              '70-year-old Caucasian man, daughter at ED triage doorway, withdrawn stare, hospital gown — third-person 3/4 oversight from beside stretcher, NOT bird-eye',
          },
          {
            id: 'c2',
            heading: 'Embodiment',
            body: 'In the bay he is cool and quiet, vitals deceptively soft. When you listen at the right carotid, the bruit is not subtle — a turbulent whisper that blood is negotiating a narrowing it should not have to.',
            visualHint:
              'Same man supine on ED stretcher, clinician-height 3/4 angle from foot of bed, stethoscope at right neck implied, monitor upper-right, muted clinical light',
          },
          {
            id: 'c3',
            heading: 'Escalation',
            body: 'CT head is clean, so hemorrhage does not explain the fog. Duplex names the stenosis. Telemetry catches atrial fibrillation in brief paroxysms — emboli looking for an exit. MRI with DWI shows the truth: the brain got peppered with tiny infarcts, scattered like grains on a plate.',
            visualHint:
              'Same likeness on stretcher, telemetry leads, MRI/DWI metaphor — scattered specks on monitor glow, third-person oversight angle unchanged',
          },
          {
            id: 'c4',
            heading: 'Crisis point',
            body: 'TIA is not a near miss — it is a neurological emergency with a clock. Ten to fifteen percent stroke risk in ninety days, highest in the first forty-eight hours. Dual antiplatelet therapy, high-intensity statin, admission — not because he looks sick now, but because the next shower may not be micro.',
            visualHint:
              'Same patient, admission paperwork on rail, dual antiplatelet implied, urgent but quiet bay — third-person 3/4 from foot of bed',
          },
          {
            id: 'c5',
            heading: 'Recontextualization',
            body: placed.length
              ? `With ${placed.slice(0, 4).join(', ')} on the board, the story shifts from "dad is depressed" to "dad was being stroked in slow motion." The family finally has a mechanism that matches the silence.`
              : 'The silence was never personality decay — it was perfusion failing in small bursts. Once the team names it, the room changes temperature.',
            visualHint:
              'Family at bedside in depth, patient same likeness, emotional relief mixed with fear — third-person oversight, room depth visible',
          },
        ]
      : [
        {
          id: 'c1',
          heading: 'Presentation',
          body: `${caseData?.title || 'The patient'} arrives with ${caseData?.clinical_tip || caseData?.diagnosis || 'acute complaint'}. Vitals and exam drive the first moves.`,
        },
        {
          id: 'c2',
          heading: 'Your orders',
          body: placed.length
            ? `You placed: ${placed.join(', ')}. Each order shifts the trajectory.`
            : 'Standard flow orders define the path — compare what you placed to the teaching checklist.',
        },
      ];

  return {
    caseId: cid,
    title: is001 ? 'Chest under pressure' : is051 ? 'The Man Who Got Peppered' : caseData?.title || 'Case story',
    synopsis: is001
      ? 'Tension pneumothorax — a clinical diagnosis made at the bedside when breath sounds vanish and perfusion teeters.'
      : is051
        ? 'His family thought he stopped talking. The MRI showed his brain had been peppered with embolic showers — TIA on the clock, not a mood change.'
        : String(caseData?.diagnosis || caseData?.clinical_tip || caseData?.title || '').slice(0, 280),
    chapters,
    patientLock,
    masterImagePrompt: is001
      ? 'Adult male supine on ED stretcher, severe respiratory distress, diaphoretic, accessory muscle use — third-person 3/4 view from beside bed, monitor glow, NOT overhead bird-eye'
      : is051
        ? '70-year-old Caucasian man supine on ED stretcher, withdrawn gaze, hospital gown — third-person 3/4 clinical oversight from foot of bed, monitor upper-right, family tension implied in room depth, NOT bird-eye'
        : `Patient on ED stretcher, third-person clinical oversight angle, ${caseData?.title || 'case'} presentation`,
    orders,
    source: 'offline',
    masterImageUrl: null,
  };
}

export async function fetchCaseStory({
  caseData,
  sessionContext = {},
  portraitNote = '',
  medicalSequence = null,
  refresh = false,
  generateImage = false,
  imageOnly = false,
} = {}) {
  if (!caseData?.id) throw new Error('Missing case');
  const offline = buildCaseStoryOffline(caseData, { sessionContext });
  const sessionFingerprint = caseStorySessionFingerprint(sessionContext);

  try {
    const res = await fetch(apiUrl('/api/case-story'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseData.id,
        caseContext: buildCaseChatContext(caseData, { chatMode: 'tutor' }),
        sessionContext,
        orders: offline.orders,
        medicalSequence,
        portraitNote,
        sessionFingerprint,
        refresh: refresh || imageOnly,
        generateImage,
        imageOnly,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    if (imageOnly) {
      return {
        masterImageUrl: data.masterImageUrl || null,
        imageGen: data.imageGen !== false,
      };
    }

    if (data.staleSession && !refresh) {
      return fetchCaseStory({
        caseData,
        sessionContext,
        portraitNote,
        medicalSequence,
        refresh: true,
        generateImage,
      });
    }

    const merged = {
      ...offline,
      title: data.title || offline.title,
      synopsis: data.synopsis || offline.synopsis,
      chapters: data.chapters?.length ? data.chapters : offline.chapters,
      patientLock: data.patientLock || offline.patientLock,
      masterImagePrompt: data.masterImagePrompt || offline.masterImagePrompt,
      masterImageUrl: data.masterImageUrl || null,
      sessionFingerprint: data.sessionFingerprint || sessionFingerprint,
      source: data.cached ? 'cache' : 'api',
    };
    return mergeCaseStoryWithOverride(merged, caseData.id);
  } catch {
    return mergeCaseStoryWithOverride(offline, caseData.id);
  }
}

export async function fetchCaseStoryMasterImage({
  caseData,
  sessionContext = {},
  portraitNote = '',
  refresh = false,
} = {}) {
  return fetchCaseStory({
    caseData,
    sessionContext,
    portraitNote,
    refresh,
    generateImage: true,
    imageOnly: true,
  });
}

export async function fetchCaseStoryStoryboard({
  caseData,
  chapters = [],
  patientLock = '',
  portraitNote = '',
  refresh = false,
  generateImages = false,
} = {}) {
  if (!caseData?.id) throw new Error('Missing case');
  const res = await fetch(apiUrl('/api/case-story-storyboard'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId: caseData.id,
      caseContext: buildCaseChatContext(caseData, { chatMode: 'tutor' }),
      chapters,
      patientLock,
      portraitNote,
      refresh,
      generateImages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
