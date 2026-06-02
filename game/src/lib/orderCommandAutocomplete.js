export function normCommandText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stackAliasList(stack) {
  const label = String(stack?.label || stack?.name || '');
  const aliases = new Set([label, ...(Array.isArray(stack?.aliases) ? stack.aliases : [])]);
  label.split('/').forEach((part) => {
    const trimmed = part.trim();
    if (trimmed) aliases.add(trimmed);
  });
  label.split(':').forEach((part) => {
    const trimmed = part.trim();
    if (trimmed && trimmed.length > 2) aliases.add(trimmed);
  });
  return [...aliases].filter(Boolean);
}

/** Best full order text for Tab autocomplete, or null if already complete / no match. */
export function resolveOrderAutocomplete(input, match, extraAliases = []) {
  if (!match) return null;
  const typed = String(input || '').trimEnd();
  const trimmed = typed.trim();
  if (!trimmed) return null;

  const tNorm = normCommandText(trimmed);
  if (!tNorm) return null;

  const candidates = [...new Set([...stackAliasList(match), ...extraAliases])].filter(Boolean);
  if (!candidates.length) return null;

  let best = null;
  let bestScore = -1;

  for (const cand of candidates) {
    const cNorm = normCommandText(cand);
    if (!cNorm || cNorm === tNorm) continue;

    let score = -1;
    if (cNorm.startsWith(tNorm)) {
      score = 1000 + cNorm.length;
    } else if (tNorm.length >= 3 && cNorm.includes(tNorm)) {
      score = 500 + cNorm.length;
    } else if (tNorm.length >= 3 && tNorm.includes(cNorm)) {
      score = 100 + cNorm.length;
    }

    if (score > bestScore) {
      best = cand;
      bestScore = score;
    }
  }

  return best;
}
