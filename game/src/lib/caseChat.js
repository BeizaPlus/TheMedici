import { getCaseFlow } from '../data/caseFlows.js';
import { getPreparedCase } from './caseNarrative.js';
import { extractPatientFacts, hpiExcerpt } from './patientFactsFromHpi.js';
import { resolvePatientName } from './patientName.js';
import { resolveSimulationCreativity } from './simulationCreativity.js';

const API = 'http://127.0.0.1:3001';
const sessions = new Map();

export function buildCaseChatContext(caseData) {
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
  const patientFacts = extractPatientFacts(enriched);
  const simulationCreativity = resolveSimulationCreativity(caseData?.id);

  return {
    id: caseData?.id,
    ccsNumber: caseData?.ccsNumber,
    title: caseData?.title,
    category: caseData?.category,
    timeLimit: caseData?.timeLimit,
    playRole: caseData?.playRole || 'doctor',
    sessionDifficulty: caseData?.sessionDifficulty || 'standard',
    chatMode: 'patient_sim',
    simulationCreativity,
    patientName: resolvePatientName(caseData),
    patientFacts,
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

/** One OpenAI session per case id — case JSON sent once in the system prompt. */
export async function ensureCaseChatSession(caseData) {
  const caseId = String(caseData?.id || '');
  if (!caseId) throw new Error('Missing case id');

  const caseContext = buildCaseChatContext(caseData);
  const cached = sessions.get(caseId);
  if (cached?.sessionId && cached.creativity === caseContext.simulationCreativity) {
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
    creativity: caseContext.simulationCreativity,
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
