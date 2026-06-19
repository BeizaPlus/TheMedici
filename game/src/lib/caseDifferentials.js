import differentialsData from '../data/caseDifferentials.json' with { type: 'json' };

function normalizeCaseId(id) {
  const raw = String(id ?? '').replace(/^case[_-]?/i, '').trim();
  if (!raw) return '';
  return raw.padStart(3, '0');
}

export function getCaseDifferentials(caseData = {}) {
  const id = normalizeCaseId(caseData.id);
  const block = differentialsData.cases?.[id];
  if (!block?.items?.length) return null;
  return {
    title: block.title || 'Differentials',
    subtitle: block.subtitle || '',
    items: block.items,
  };
}
