import uberManifest from '../data/uberCases.json' with { type: 'json' };
import { getPreparedCase } from './caseNarrative.js';
import { resolvePlaybook } from '../data/resolvePlaybook.js';
import { buildAlgorithm, getZones } from '../data/gameData.js';

const UBER_BY_ID = new Map((uberManifest.cases || []).map((c) => [c.id, c]));

export function getUberManifest() {
  return uberManifest;
}

export function getUberDefinitions() {
  return uberManifest.cases || [];
}

export function getUberDefinition(caseId) {
  const raw = String(caseId ?? '').trim();
  return UBER_BY_ID.get(raw) || UBER_BY_ID.get(raw.toUpperCase()) || null;
}

export function isUberCase(caseId) {
  return Boolean(getUberDefinition(caseId));
}

export function getUberCaseIds() {
  return getUberDefinitions().map((c) => c.id);
}

function normalizeMemberId(id) {
  const raw = String(id ?? '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

/** Merge interventions from member CCS cases (deduped by id or label). */
export function mergeMemberInterventions(memberCaseIds, catalog) {
  const seen = new Set();
  const merged = [];

  for (const rawId of memberCaseIds || []) {
    const id = normalizeMemberId(rawId);
    const ccsCase =
      catalog?.cases?.find((c) => c.id === id) ||
      catalog?.cases?.find((c) => String(c.caseNumber) === id);
    if (!ccsCase) continue;

    const prepared = getPreparedCase(id);
    const pb = resolvePlaybook(ccsCase);
    const ivs =
      prepared?.interventions?.length > 0 ? prepared.interventions : pb.interventions || [];

    for (const iv of ivs) {
      const key = iv.id || iv.label;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(iv);
    }
  }

  return merged;
}

/** Attach uber metadata and merged stacks to a base game case. */
export function enrichUberGameCase(gameCase, ccsCase, catalog) {
  const uber = getUberDefinition(ccsCase.id);
  if (!uber) return gameCase;

  const anchorId = normalizeMemberId(uber.anchorId);
  const anchorCcs = catalog?.cases?.find((c) => c.id === anchorId);
  const mergedInterventions = mergeMemberInterventions(uber.memberCaseIds, catalog);
  const zones = getZones();

  const segments = (uber.memberCaseIds || []).map((rawId, i) => {
    const id = normalizeMemberId(rawId);
    const member = catalog?.cases?.find((c) => c.id === id);
    return {
      id,
      ccsNumber: member?.caseNumber || id,
      title: member?.title || id,
      label: uber.segmentLabels?.[i] || member?.title || id,
    };
  });

  const playbookForAlgo = {
    objective: uber.objective || gameCase.objective,
    interventions: mergedInterventions,
    algorithm: anchorCcs ? resolvePlaybook(anchorCcs).algorithm : null,
  };

  return {
    ...gameCase,
    title: uber.title.toUpperCase(),
    category: 'Uber Cases',
    patient_name_default: uber.patientName || gameCase.patient_name_default,
    diagnosis: gameCase.diagnosis || `Multi-domain · ${uber.domains.join(' · ')}`,
    objective: uber.objective || gameCase.objective,
    chief_complaint: uber.chiefComplaint || gameCase.chief_complaint,
    interventions:
      mergedInterventions.length > 0 ? mergedInterventions : gameCase.interventions,
    algorithm: buildAlgorithm(playbookForAlgo, zones),
    uberMeta: {
      id: uber.id,
      domains: uber.domains,
      memberCaseIds: uber.memberCaseIds.map(normalizeMemberId),
      segments,
      patientName: uber.patientName,
      briefingNote: uber.briefingNote,
    },
  };
}
