import essentialsData from '../data/caseBareEssentials.json' with { type: 'json' };
import { neutralStackOrderName } from './stackDecoys.js';

export const ORDER_TIER_META = {
  critical: {
    id: 'critical',
    label: 'Critical',
    hint: 'Non-negotiables — unsafe if missed',
    defaultCollapsed: false,
  },
  general: {
    id: 'general',
    label: 'General',
    hint: 'Exams, labs, and core workflow',
    defaultCollapsed: false,
  },
  misc: {
    id: 'misc',
    label: 'Misc',
    hint: 'Prevention, vaccines, counseling — relevant but not emergent',
    defaultCollapsed: true,
  },
};

function normalizeCaseId(id) {
  const raw = String(id ?? '').replace(/^case[_-]?/i, '').trim();
  if (!raw) return '';
  return raw.padStart(3, '0');
}

function findIntervention(interventions, item) {
  const byId = Object.fromEntries(interventions.map((iv) => [iv.id, iv]));
  for (const iid of item.matchInterventionIds || []) {
    if (byId[iid]) return byId[iid];
  }
  const needles = (item.matchLabels || []).map((l) => String(l).toLowerCase());
  if (!needles.length) return null;
  return (
    interventions.find((iv) => {
      const label = String(iv.label || '').toLowerCase();
      return needles.some((n) => label.includes(n));
    }) || null
  );
}

export function getCaseBareEssentialsSpec(caseData = {}) {
  const id = normalizeCaseId(caseData.id);
  const byCase = essentialsData.cases?.[id];
  if (byCase) return byCase;

  const dx = String(caseData.diagnosis || '').toLowerCase();
  for (const pat of essentialsData.diagnosisPatterns || []) {
    try {
      if (new RegExp(pat.match, 'i').test(dx)) return pat;
    } catch {
      /* skip bad pattern */
    }
  }
  return null;
}

function resolveCriticalInterventionIds(caseData = {}, interventions = []) {
  const spec = getCaseBareEssentialsSpec(caseData);
  const ids = new Set();
  for (const item of spec?.items || []) {
    const iv = findIntervention(interventions, item);
    if (iv?.id) ids.add(iv.id);
  }
  return ids;
}

function labelMatchesMisc(label, patterns = []) {
  const norm = String(label || '').toLowerCase();
  if (!norm) return false;
  return patterns.some((p) => norm.includes(String(p).toLowerCase()));
}

function resolveMiscInterventionIds(caseData = {}, interventions = [], criticalIds = new Set()) {
  const caseId = normalizeCaseId(caseData.id);
  const caseSpec = essentialsData.cases?.[caseId];
  const ids = new Set(caseSpec?.miscInterventionIds || []);

  const patterns = [
    ...(essentialsData.miscLabelPatterns || []),
    ...(caseSpec?.miscLabelPatterns || []),
  ];

  for (const iv of interventions) {
    if (!iv?.id || criticalIds.has(iv.id)) continue;
    if (ids.has(iv.id)) continue;
    if (labelMatchesMisc(iv.label, patterns)) ids.add(iv.id);
  }

  return ids;
}

/** Split standard-flow rows into Critical / General / Misc tiers. */
export function groupTeachCompareRowsByTier({
  rows = [],
  caseData = {},
  interventions = [],
} = {}) {
  const criticalIds = resolveCriticalInterventionIds(caseData, interventions);
  const miscIds = resolveMiscInterventionIds(caseData, interventions, criticalIds);

  const buckets = { critical: [], general: [], misc: [] };
  for (const row of rows) {
    if (criticalIds.has(row.id)) buckets.critical.push(row);
    else if (miscIds.has(row.id)) buckets.misc.push(row);
    else buckets.general.push(row);
  }

  return ['critical', 'general', 'misc']
    .map((key) => {
      const meta = ORDER_TIER_META[key];
      const tierRows = buckets[key];
      return {
        ...meta,
        rows: tierRows,
        placedCount: tierRows.filter((r) => r.isPlaced).length,
        total: tierRows.length,
      };
    })
    .filter((tier) => tier.total > 0);
}

/** Non-negotiable orders for this case — matched to live stacks + placement status. */
export function buildBareEssentialsRows({ caseData = {}, interventions = [], placed = {} } = {}) {
  const spec = getCaseBareEssentialsSpec(caseData);
  if (!spec?.items?.length) {
    return { title: '', subtitle: '', rows: [], doneCount: 0, total: 0 };
  }

  const rows = spec.items.map((item, idx) => {
    const iv = findIntervention(interventions, item);
    const interventionId = iv?.id || null;
    const isDone = interventionId ? Boolean(placed[interventionId]) : false;
    return {
      seq: idx + 1,
      id: item.id,
      shortLabel: item.shortLabel,
      label: iv ? neutralStackOrderName(iv.label) : item.shortLabel,
      why: item.why || iv?.why || '',
      interventionId,
      isDone,
    };
  });

  const doneCount = rows.filter((r) => r.isDone).length;
  return {
    title: spec.title || 'Critical — non-negotiables',
    subtitle: spec.subtitle || '',
    rows,
    doneCount,
    total: rows.length,
  };
}
