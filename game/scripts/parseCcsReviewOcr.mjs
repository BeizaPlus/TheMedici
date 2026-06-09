/**
 * Heuristic parser for CCS review-page OCR text (case_N_ocr.txt).
 * Used by build-differential-review.mjs; optional LLM pass for weak parses.
 */

const ORDER_HEADER =
  /^(Correctly Ordered|Should have Ordered|Suggested Order|Correctly Avoided|Treatment Orders|Preventive care|Timing|Appropriate Orders|Appropriate Location|Appropriate Speed)/i;

export function parseCcsReviewOcr(raw = '') {
  const text = String(raw).replace(/\r\n/g, '\n').trim();
  if (!text) {
    return {
      title: '',
      diagnosis: '',
      scores: null,
      caseSummary: '',
      orders: [],
      notes: '',
      parseQuality: 'empty',
    };
  }

  const titleLine =
    text.match(
      /^([^\n]+(?:Internal Medicine|Neurology|Pediatrics|OB\/GYN|Emergency Medicine|Psychiatry)[^\n]*)/im,
    )?.[1] ||
    text.match(/^([A-Z][^\n]{8,80})/m)?.[1] ||
    '';

  const scoreMatch = text.match(
    /(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)\s+([A-Za-z][^\n%]{2,80})/,
  );
  const diagnosis = scoreMatch?.[3]?.trim() || '';

  const summaryMatch = text.match(
    /Case Summary\s*\n+([\s\S]*?)(?:\n\s*Action Log\b|\n\s*High Yield\b|$)/i,
  );
  let caseSummary = summaryMatch?.[1]?.trim() || '';

  const orders = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const statusMatch = line.match(
      /^(Correctly Ordered|Should have Ordered|Suggested Order|Correctly Avoided)\s*$/i,
    );
    if (statusMatch) {
      const label = statusMatch[1].toLowerCase();
      const status = label.includes('should') || label.includes('suggested')
        ? 'missed'
        : label.includes('avoided')
          ? 'avoided'
          : 'correct';
      i += 1;
      let order = '';
      while (i < lines.length && !lines[i].trim()) i += 1;
      if (i < lines.length) {
        order = lines[i].replace(/^[*©•]\s*/, '').trim();
        i += 1;
      }
      while (i < lines.length && !lines[i].trim()) i += 1;
      let reason = '';
      if (i < lines.length && /^Reason:/i.test(lines[i])) {
        reason = lines[i].replace(/^Reason:\s*/i, '').trim();
        i += 1;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !ORDER_HEADER.test(lines[i].trim()) &&
          !/^Reason:/i.test(lines[i]) &&
          !/^(Correctly Ordered|Should have Ordered|Correctly Avoided)\s*$/i.test(lines[i])
        ) {
          reason += ` ${lines[i].trim()}`;
          i += 1;
        }
      }
      if (order) orders.push({ status, order, reason: reason.trim() });
      continue;
    }
    i += 1;
  }

  if (!caseSummary && orders.length) {
    const diffLine = orders.find((o) => /differential/i.test(o.reason))?.reason;
    if (diffLine) caseSummary = diffLine;
  }

  const notes = text
    .split(/Action Log/i)[1]
    ?.split(/High Yield/i)[0]
    ?.trim()
    .slice(0, 2000);

  let parseQuality = 'good';
  if (!caseSummary && orders.length < 3) parseQuality = 'weak';
  else if (!caseSummary || caseSummary.length < 80) parseQuality = 'partial';

  return {
    title: titleLine.replace(/\s+Previous Completions.*$/i, '').trim(),
    diagnosis,
    scores: scoreMatch
      ? { yours: scoreMatch[1], average: scoreMatch[2], firstAttempt: null }
      : null,
    caseSummary,
    orders,
    notes: notes || '',
    parseQuality,
  };
}

export function formatReviewForDisplay(parsed) {
  const parts = [];
  if (parsed.diagnosis) {
    const scores = parsed.scores
      ? `Your score ${parsed.scores.yours} · Average ${parsed.scores.average}`
      : '';
    parts.push([parsed.diagnosis, scores].filter(Boolean).join('\n'));
  }
  if (parsed.caseSummary) parts.push(parsed.caseSummary);
  return parts.join('\n\n');
}

export function formatOrdersForDisplay(orders = []) {
  if (!orders.length) return '';
  return orders
    .map((o) => {
      const tag =
        o.status === 'missed' ? '[Missed]' : o.status === 'avoided' ? '[Avoid]' : '[OK]';
      return `${tag} ${o.order}${o.reason ? `\n   ${o.reason}` : ''}`;
    })
    .join('\n\n');
}
