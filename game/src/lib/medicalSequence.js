import playbookBundle from '../data/orderWhyPlaybook.json' with { type: 'json' };
import realWorldBundle from '../data/realWorldCasesBaked.json' with { type: 'json' };
import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';
import { resolvePatientDemographics } from './patientFactsFromHpi.js';
import {
  sequenceFailsDemographicsCheck,
  validateMedicalSequenceDemographics,
} from './medicalSequenceValidate.js';

export { validateMedicalSequenceDemographics, sequenceFailsDemographicsCheck };

function normalizeCaseId(caseId) {
  const raw = String(caseId ?? '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

function playbookWhy(caseId, orderId) {
  const ck = normalizeCaseId(caseId);
  return playbookBundle?.cases?.[ck]?.[orderId]?.why || '';
}

/** Extract "X before Y" / progression language from attendant text. */
export function extractDeteriorationPhrases(whyText = '') {
  const text = String(whyText || '');
  const phrases = [];
  const prog = text.match(
    /(?:before\s+it\s+progresses?\s+to\s+)([^.]+)/i,
  );
  if (prog?.[1]) {
    prog[1]
      .split(/\s+or\s+|,\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((p) => phrases.push(p));
  }
  const subtle = text.match(
    /(?:present(?:s)?\s+(?:subtly\s+)?as\s+)([^.]+?)(?:\s+before)/i,
  );
  if (subtle?.[1]) phrases.unshift(subtle[1].trim());
  return [...new Set(phrases)];
}

function collectOrders(caseData) {
  const list = Array.isArray(caseData?.interventions) ? caseData.interventions : [];
  const cid = normalizeCaseId(caseData?.id);
  return list.map((iv) => ({
    id: iv.id,
    label: iv.label,
    why: String(iv.why || playbookWhy(cid, iv.id) || '').trim(),
    guideline: iv.guideline || '',
  }));
}

function realWorldForCase(caseId) {
  const ck = normalizeCaseId(caseId);
  return realWorldBundle?.byCaseId?.[ck]?.stories || realWorldBundle?.[ck]?.stories || [];
}

function isPoorFeedingPediatricCase(caseData, cid) {
  if (cid === '121') return true;
  const demo = resolvePatientDemographics(caseData);
  if (!demo.isPediatric) return false;
  const blob = `${caseData?.presentationKey || ''} ${caseData?.title || ''} ${caseData?.hpi_narrative || ''}`.toLowerCase();
  return /poor feeding|failure to thrive|ftt|feeding difficulty/.test(blob);
}

/** Case-specific offline beats (not the case-121 peds template). */
function buildMedicalSequenceFromCase(caseData, { enrichedWhys = {} } = {}) {
  const cid = normalizeCaseId(caseData?.id);
  const demo = resolvePatientDemographics(caseData);
  const orders = collectOrders(caseData).map((o) => ({
    ...o,
    why: enrichedWhys[o.id] || o.why,
  }));

  const patientLock = `${demo.ageLabel || 'adult patient'}, ${caseData?.patientSex || 'patient'}, ${caseData?.category || 'ED'} — same patient likeness throughout`;
  const title = String(caseData?.title || '');
  const diagnosis = String(caseData?.diagnosis || '');
  const hpi = String(caseData?.hpi_narrative || caseData?.history || '');
  const blob = `${title} ${diagnosis} ${hpi}`.toLowerCase();

  const stories = realWorldForCase(cid);
  const echo = stories[0]
    ? { name: stories[0].name, summary: String(stories[0].summary || stories[0].headline || '').slice(0, 280) }
    : null;

  const tieOrder = (idx) => orders[idx] || orders[0];

  if (/altered mental|seizure|post.?ictal|ams\b|confusion/.test(blob)) {
    const tox = orders.find((o) => /tox|alcohol|acetaminophen/i.test(o.label));
    const glucose = orders.find((o) => /glucose|bmp|cbc/i.test(o.label));
    const ct = orders.find((o) => /ct|mri|head/i.test(o.label));
    const neuro = orders.find((o) => /neuro|psych/i.test(o.label));

    return {
      caseId: cid,
      title: caseData?.title || 'Medical sequence',
      source: 'offline',
      patientLock,
      orders,
      prequel: [
        {
          id: 'p1',
          title: 'Weeks of decline',
          caption:
            'Family reports progressive confusion, unsteady gait, and personality change over several weeks — not a single sudden event.',
          visualHint: `${patientLock}, home living room, spouse or adult child concerned, same face`,
        },
        {
          id: 'p2',
          title: 'Seizure & EMS',
          caption:
            'A witnessed generalized seizure leaves him post-ictal. Tongue injury and incontinence may be present. EMS brings him to the ED.',
          visualHint: `${patientLock}, stretcher, post-ictal drowsiness, ED arrival`,
        },
      ],
      missedPath: [
        {
          id: 'm1',
          title: 'Structural cause not excluded',
          caption: ct
            ? `Without ${ct.label}, bleed or mass stays on the table while you chase metabolic causes.`
            : 'Delayed neuro imaging leaves structural causes unexcluded.',
          visualHint: `${patientLock}, ED stretcher, monitor, same likeness`,
          tiedOrderId: ct?.id || '',
          tiedOrderLabel: ct?.label || 'CT head',
        },
        {
          id: 'm2',
          title: 'Metabolic/tox drivers missed',
          caption: glucose
            ? `${glucose.label} and tox screen not done — reversible causes stay hidden.`
            : 'Bedside glucose and tox screen not done — reversible causes stay hidden.',
          visualHint: `${patientLock}, confused affect, dim room light`,
          tiedOrderId: glucose?.id || tox?.id || '',
          tiedOrderLabel: glucose?.label || tox?.label || 'Labs',
        },
        {
          id: 'm3',
          title: 'Alcohol use minimized',
          caption:
            'He denies heavy drinking at first — attendant teaching: patients often minimize until labs contradict the story.',
          visualHint: `${patientLock}, interview posture, defensive calm`,
          tiedOrderId: tox?.id || '',
          tiedOrderLabel: tox?.label || 'Toxicology screen',
        },
      ],
      savedPath: [
        {
          id: 's1',
          title: 'Neuro exam & imaging',
          caption: neuro
            ? `${neuro.label} documents post-ictal state; ${ct?.label || 'head imaging'} rules out mass/bleed.`
            : 'Exam and head imaging narrow the differential.',
          visualHint: `${patientLock}, tongue laceration if present, same face`,
          tiedOrderId: neuro?.id || ct?.id || '',
          tiedOrderLabel: neuro?.label || ct?.label || 'Workup',
        },
        {
          id: 's2',
          title: 'Labs & tox screen',
          caption: 'CBC, BMP, glucose, and tox screen hunt metabolic and toxic drivers for AMS.',
          visualHint: `${patientLock}, IV line, calmer monitoring`,
          tiedOrderId: glucose?.id || tox?.id || '',
          tiedOrderLabel: 'Laboratory panel',
        },
      ],
      realWorldEcho: echo,
    };
  }

  const chief = caseData?.chief_complaint || title;
  return {
    caseId: cid,
    title: caseData?.title || 'Medical sequence',
    source: 'offline',
    patientLock,
    orders,
    prequel: [
      {
        id: 'p1',
        title: 'Before arrival',
        caption: `Symptoms worsen at home: ${chief}. ${demo.parentMayBePresent ? 'Caregiver' : 'Family or patient'} decides to come to the ED.`,
        visualHint: `${patientLock}, home or car, urgency, same likeness`,
      },
    ],
    missedPath: orders.slice(0, 4).map((o, i) => ({
      id: `m${i + 1}`,
      title: `${o.label} delayed`,
      caption: String(o.why || `If ${o.label} is missed, standard-of-care pathway breaks.`).slice(0, 220),
      visualHint: `${patientLock}, ED stretcher, clinical stress`,
      tiedOrderId: o.id,
      tiedOrderLabel: o.label,
    })),
    savedPath: orders.slice(0, 3).map((o, i) => ({
      id: `s${i + 1}`,
      title: o.label,
      caption: String(o.why || `${o.label} completed on time.`).slice(0, 220),
      visualHint: `${patientLock}, stabilized scene`,
      tiedOrderId: o.id,
      tiedOrderLabel: o.label,
    })),
    realWorldEcho: echo,
  };
}

/** Offline storyboard for case 121 — poor feeding pediatric template only. */
function buildPoorFeedingPediatricSequence(caseData, { enrichedWhys = {} } = {}) {
  const cid = normalizeCaseId(caseData?.id);
  const demo = resolvePatientDemographics(caseData);
  const orders = collectOrders(caseData).map((o) => ({
    ...o,
    why: enrichedWhys[o.id] || o.why,
  }));

  const patientLock =
    cid === '121'
      ? '~7yo Black school-age boy, pediatric hospital gown, ED resuscitation bay — case 121 approved likeness'
      : `${demo.ageLabel || 'pediatric patient'}, ${caseData?.category || 'ED'} — same patient likeness throughout`;

  const glucose = orders.find((o) => o.id === 'glucose-check');
  const glucoseWhy =
    enrichedWhys['glucose-check'] ||
    glucose?.why ||
    'Hypoglycemia can present as lethargy or poor feeding before seizures or coma.';
  const prog = extractDeteriorationPhrases(glucoseWhy);

  const prequel = [
    {
      id: 'p1',
      title: 'Poor feeding at home',
      caption:
        'For several days he takes less at each feed. Mom notices fewer wet diapers and a quieter baby.',
      visualHint: `${patientLock}, kitchen table, worried mother, child in lap turning away from bottle`,
    },
    {
      id: 'p2',
      title: 'Morning lethargy',
      caption: 'He is hard to wake and limp in mom\'s arms. She brings him to the emergency department.',
      visualHint: `${patientLock}, car seat or home doorway, caregiver urgency, soft morning light`,
    },
  ];

  const missedPath = [
    {
      id: 'm1',
      title: 'ED — weak and tachycardic',
      caption: `Arrives with poor feeding and vitals already stressed. Brain fuel is the immediate concern.`,
      visualHint: `${patientLock}, ED stretcher, monitor leads, tired eyes`,
      tiedOrderId: '',
      tiedOrderLabel: 'Triage',
    },
    {
      id: 'm2',
      title: 'Glucose not checked',
      caption: `Without a bedside glucose, ${prog[0] || 'lethargy'} is mistaken for "just not eating."`,
      visualHint: `${patientLock}, stretcher, no glucometer in frame, nurse at foot of bed`,
      tiedOrderId: 'glucose-check',
      tiedOrderLabel: glucose?.label || 'glucose check',
    },
    {
      id: 'm3',
      title: 'Hypoglycemia deepens',
      caption:
        prog.length > 1
          ? `Energy stores fall further — ${prog.slice(0, 2).join(', then ')}.`
          : 'Energy stores fall — lethargy deepens and suck-swallow-breathe weakens.',
      visualHint: `${patientLock}, same likeness, eyes less responsive, monitor alarm glow`,
      tiedOrderId: 'glucose-check',
      tiedOrderLabel: 'glucose check',
    },
    {
      id: 'm4',
      title: prog[prog.length - 1] || 'Seizure risk',
      caption: String(glucoseWhy).includes('seizure')
        ? 'Untreated hypoglycemia can progress to seizures — a metabolic emergency, not a feeding problem alone.'
        : 'Metabolic decompensation escalates without IV access and correction.',
      visualHint: `${patientLock}, same likeness, clinical crisis framing, team rushing`,
      tiedOrderId: 'iv-access-x2',
      tiedOrderLabel: 'IV access x2',
    },
  ];

  const savedPath = [
    {
      id: 's1',
      title: 'Bedside glucose',
      caption:
        'A quick glucose check shows low fuel — you treat a metabolic emergency, not a vague feeding complaint.',
      visualHint: `${patientLock}, glucometer at bedside, relieved focus`,
      tiedOrderId: 'glucose-check',
      tiedOrderLabel: 'glucose check',
    },
    {
      id: 's2',
      title: 'IV access & dextrose',
      caption: 'Two large-bore lines and dextrose restore brain fuel; perfusion and alertness improve.',
      visualHint: `${patientLock}, IV established, same face, warmer skin tone`,
      tiedOrderId: 'iv-access-x2',
      tiedOrderLabel: 'IV access x2',
    },
    {
      id: 's3',
      title: 'Stabilized for workup',
      caption: 'With stabilization, history, exam, and labs can safely hunt FTT, GERD, or metabolic causes.',
      visualHint: `${patientLock}, calmer affect, parent at bedside, ED bay`,
      tiedOrderId: 'obtain-a-thorough-history-including-feed',
      tiedOrderLabel: 'History',
    },
  ];

  const stories = realWorldForCase(cid);
  const echo =
    stories.find((s) => /jessica|congenital adrenal|hypoglycemia/i.test(`${s.name} ${s.summary}`))
    || stories.find((s) => /poor feeding|hypoglycemia|infant/i.test(s.summary || ''))
    || stories[0];

  return {
    caseId: cid,
    title: caseData?.title || 'Medical sequence',
    source: 'offline',
    patientLock,
    orders,
    prequel,
    missedPath,
    savedPath,
    realWorldEcho: echo
      ? { name: echo.name, summary: String(echo.summary || echo.headline || '').slice(0, 280) }
      : null,
  };
}

export function buildMedicalSequenceOffline(caseData, { enrichedWhys = {} } = {}) {
  const cid = normalizeCaseId(caseData?.id);
  if (isPoorFeedingPediatricCase(caseData, cid)) {
    return buildPoorFeedingPediatricSequence(caseData, { enrichedWhys });
  }
  return buildMedicalSequenceFromCase(caseData, { enrichedWhys });
}

export async function fetchMedicalSequence({
  caseData,
  enrichedWhys = {},
  portraitNote = '',
  refresh = false,
} = {}) {
  if (!caseData?.id) throw new Error('Missing case');
  const offline = buildMedicalSequenceOffline(caseData, { enrichedWhys });

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return offline;
  }

  const orders = offline.orders.map((o) => ({
    id: o.id,
    label: o.label,
    why: enrichedWhys[o.id] || o.why,
    playbookWhy: o.why,
  }));

  try {
    const res = await fetch(apiUrl('/api/medical-sequence'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseData.id,
        caseContext: buildCaseChatContext(caseData, { chatMode: 'tutor' }),
        orders,
        realWorldStories: realWorldForCase(caseData.id),
        portraitNote,
        refresh,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const merged = {
      caseId: normalizeCaseId(caseData.id),
      title: caseData.title,
      source: data.cached ? 'cache' : 'api',
      patientLock: data.patientLock || offline.patientLock,
      orders,
      prequel: data.prequel?.length ? data.prequel : offline.prequel,
      missedPath: data.missedPath?.length ? data.missedPath : offline.missedPath,
      savedPath: data.savedPath?.length ? data.savedPath : offline.savedPath,
      realWorldEcho: data.realWorldEcho || offline.realWorldEcho,
    };
    if (sequenceFailsDemographicsCheck(merged, caseData)) {
      console.warn(
        '[medical-sequence] API/cache failed age check — using offline',
        validateMedicalSequenceDemographics(merged, caseData),
      );
      return { ...offline, orders, source: 'offline-validated' };
    }
    return merged;
  } catch {
    return offline;
  }
}
