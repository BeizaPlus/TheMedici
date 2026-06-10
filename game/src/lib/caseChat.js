import { getCaseFlow } from '../data/caseFlows.js';
import { getPreparedCase } from './caseNarrative.js';
import {
  extractPatientFacts,
  hpiExcerpt,
  resolvePatientDemographics,
} from './patientFactsFromHpi.js';
import { resolvePatientName } from './patientName.js';
import { briefCacheKey, resolveCaseBriefMarkdown } from './caseBrief.js';
import { buildCaseDiscussionContext, discussionCacheKey } from './caseDiscussionContext.js';
import { resolveSimulationCreativity } from './simulationCreativity.js';
import { STORAGE } from './storageKeys.js';

const API = 'http://127.0.0.1:3001';
const sessions = new Map();
/** Bump when portrait/demographics logic changes — clears stale localStorage personas. */
const PORTRAIT_PERSONA_VERSION = 2;

export function buildCaseChatContext(caseData, {
  patientPersona = null,
  caseDiscussion = null,
  caseBriefMarkdown = null,
  chatMode = 'patient_sim',
} = {}) {
  const flow = getCaseFlow(caseData);
  const prepared = getPreparedCase(caseData?.id);
  const enriched = {
    ...caseData,
    clinical_hpi_narrative:
      caseData?.clinical_hpi_narrative ||
      prepared?.hpi_narrative ||
      caseData?.hpi_narrative ||
      caseData?.historyText ||
      '',
    hpi_narrative: prepared?.hpi_narrative || caseData?.hpi_narrative,
  };
  const patientFacts = extractPatientFacts(enriched, patientPersona);
  const patientDemographics = resolvePatientDemographics(enriched, patientPersona);
  const simulationCreativity = resolveSimulationCreativity(caseData?.id);

  const ctx = {
    id: caseData?.id,
    ccsNumber: caseData?.ccsNumber,
    title: caseData?.title,
    category: caseData?.category,
    timeLimit: caseData?.timeLimit,
    playRole: caseData?.playRole || 'doctor',
    sessionDifficulty: caseData?.sessionDifficulty || 'standard',
    chatMode: chatMode === 'patient_sim' ? 'patient_sim' : 'tutor',
    simulationCreativity,
    patientName: resolvePatientName(caseData),
    patientFacts,
    patientDemographics,
    patientVoice: prepared?.patient_voice || caseData?.patient_voice || null,
    hpiExcerpt: hpiExcerpt(enriched),
    patientSex: caseData?.patientSex,
    chief_complaint: caseData?.chief_complaint,
    historyText: caseData?.historyText,
    clinical_hpi_narrative: enriched.clinical_hpi_narrative,
    vitalsText: caseData?.vitalsText,
    clinical_tip: caseData?.clinical_tip,
    objective: caseData?.objective,
    vitals: flow?.vitals || prepared?.vitals || caseData?.vitals,
    exam: flow?.exam,
    flowTrack: flow?.flowTrack,
    dispositionUnits: flow?.dispositionUnits,
    hasSourceIntro: prepared?.hasSourceIntro ?? caseData?.preparedMeta?.hasSourceIntro,
    interventions: (caseData?.interventions || []).map((iv) => ({
      id: iv.id,
      label: iv.label,
      why: iv.why,
      guideline: iv.guideline,
      zone: iv.correct_zone,
    })),
    algorithm: caseData?.algorithm
      ? {
          title: caseData.algorithm.title,
          steps: (caseData.algorithm.steps || []).map((s) => ({
            order: s.order,
            label: s.label,
            zoneLabel: s.zoneLabel,
          })),
        }
      : null,
  };

  if (patientPersona && typeof patientPersona === 'object') {
    ctx.patientPersona = patientPersona;
  }
  if (caseDiscussion && typeof caseDiscussion === 'object') {
    ctx.caseDiscussion = caseDiscussion;
  }
  if (caseBriefMarkdown && typeof caseBriefMarkdown === 'string') {
    ctx.caseBriefMarkdown = caseBriefMarkdown;
  }

  return ctx;
}

function personaCacheKey(persona) {
  try {
    return JSON.stringify(persona || null);
  } catch {
    return '';
  }
}

function demographicsCacheKey(demographics) {
  try {
    return JSON.stringify(demographics || null);
  } catch {
    return '';
  }
}

export function readCasePortraitPersona(caseId) {
  try {
    const raw = localStorage.getItem(STORAGE.casePortraitPersona);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const persona = parsed?.[String(caseId)] || null;
    if (persona && persona.personaVersion !== PORTRAIT_PERSONA_VERSION) return null;
    return persona;
  } catch {
    return null;
  }
}

export function writeCasePortraitPersona(caseId, persona) {
  if (!caseId || !persona) return;
  try {
    const raw = localStorage.getItem(STORAGE.casePortraitPersona);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[String(caseId)] = { ...persona, personaVersion: PORTRAIT_PERSONA_VERSION };
    localStorage.setItem(STORAGE.casePortraitPersona, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export async function resolvePatientPersona(caseData) {
  const caseId = caseData?.id;
  if (!caseId) return null;

  const cached = readCasePortraitPersona(caseId);
  if (cached?.summary) return cached;

  try {
    const caseContext = buildCaseChatContext(caseData);
    const r = await fetch(`${API}/api/case-persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseContext }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.persona) {
      writeCasePortraitPersona(caseId, data.persona);
      return data.persona;
    }
  } catch {
    /* ignore */
  }

  return cached || null;
}

export async function checkCaseChatAvailable() {
  try {
    const r = await fetch(`${API}/api/health`);
    if (!r.ok) return false;
    const data = await r.json();
    return Boolean(data.openai || data.deepseek);
  } catch {
    return false;
  }
}

let _cachedModelLabel = null;

export async function fetchChatModelLabel() {
  if (_cachedModelLabel) return _cachedModelLabel;
  try {
    const r = await fetch(`${API}/api/health`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.chatProvider === 'deepseek') {
      _cachedModelLabel = data.chatModel || 'DeepSeek';
    } else if (data.chatProvider === 'openai') {
      _cachedModelLabel = data.chatModel || 'OpenAI';
    } else {
      _cachedModelLabel = null;
    }
    return _cachedModelLabel;
  } catch {
    return null;
  }
}

/** One chat session per case + mode — case JSON + portrait persona in the system prompt. */
export async function ensureCaseChatSession(caseData, { chatMode = 'patient_sim' } = {}) {
  const caseId = String(caseData?.id || '');
  if (!caseId) throw new Error('Missing case id');
  const mode = chatMode === 'patient_sim' ? 'patient_sim' : 'tutor';

  const patientPersona = await resolvePatientPersona(caseData);
  const caseDiscussion = buildCaseDiscussionContext(caseId);
  const draftContext = buildCaseChatContext(caseData, { patientPersona, caseDiscussion, chatMode: mode });
  const caseBriefMarkdown = await resolveCaseBriefMarkdown(caseId, {
    caseDiscussion,
    caseContext: draftContext,
    refresh: false,
  });
  const caseContext = buildCaseChatContext(caseData, {
    patientPersona,
    caseDiscussion,
    caseBriefMarkdown,
    chatMode: mode,
  });
  const personaKey = personaCacheKey(patientPersona);
  const demographicsKey = demographicsCacheKey(caseContext.patientDemographics);
  const discussionKey = discussionCacheKey(caseDiscussion);
  const briefKey = briefCacheKey(caseBriefMarkdown);
  const cached = sessions.get(caseId);

  if (
    cached?.sessionId &&
    cached.chatMode === mode &&
    cached.creativity === caseContext.simulationCreativity &&
    cached.personaKey === personaKey &&
    cached.demographicsKey === demographicsKey &&
    cached.discussionKey === discussionKey &&
    cached.briefKey === briefKey
  ) {
    return cached.sessionId;
  }

  sessions.delete(caseId);
  const r = await fetch(`${API}/api/case-chat/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseContext }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || 'Could not start case chat session');
  }
  sessions.set(caseId, {
    sessionId: data.sessionId,
    caseId,
    chatMode: mode,
    creativity: caseContext.simulationCreativity,
    personaKey,
    demographicsKey,
    discussionKey,
    briefKey,
  });
  return data.sessionId;
}

export function clearCaseChatSession(caseId) {
  sessions.delete(String(caseId || ''));
}

export function clearAllCaseChatSessions() {
  sessions.clear();
}

export async function sendCaseChatMessage(sessionId, message, sessionContext = null) {
  const r = await fetch(`${API}/api/case-chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, sessionContext }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || 'Case chat request failed');
  }
  return data.reply;
}
