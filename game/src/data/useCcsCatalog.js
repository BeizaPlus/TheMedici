import catalog from './ccsCatalog.json' with { type: 'json' };
import { toGameCase } from './gameData.js';
import { applySessionToCase } from '../lib/caseNarrative.js';
import { readAudienceProfile } from '../lib/audienceProfile.js';

function withSession(gameCase) {
  const session = readAudienceProfile() || {};
  return applySessionToCase(gameCase, session);
}

export function getCatalog() {
  return catalog;
}

export function getCategories() {
  return catalog.categories;
}

function resolveCatalogCase(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const padded = /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
  return (
    catalog.cases.find((c) => c.id === padded) ||
    catalog.cases.find((c) => c.id === raw) ||
    catalog.cases.find(
      (c) => String(c.caseNumber) === raw || String(c.caseNumber) === padded,
    ) ||
    null
  );
}

export function getCaseById(id) {
  const raw = resolveCatalogCase(id);
  return raw ? withSession(toGameCase(raw, catalog)) : null;
}

export function getCasesInCategory(categoryId) {
  const cat = catalog.categories.find((c) => c.id === categoryId);
  if (!cat) return [];
  return cat.caseIds
    .map((id) => catalog.cases.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => withSession(toGameCase(c, catalog)));
}

export function getAllGameCases() {
  return catalog.cases.map((c) => withSession(toGameCase(c, catalog)));
}
