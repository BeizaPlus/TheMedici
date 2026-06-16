import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';

const memory = new Map();

function memKey(caseId, orderId) {
  return `${caseId}::${orderId}`;
}

/** Fetch case-specific order rationale — cached on server per case + order. */
export async function fetchOrderWhy({ caseId, orderId, orderLabel, caseData, playbookWhy = '' }) {
  const cid = String(caseId ?? '').trim();
  const oid = String(orderId ?? '').trim();
  if (!cid || !oid || !orderLabel) {
    throw new Error('Missing case or order');
  }

  const hit = memory.get(memKey(cid, oid));
  if (hit) return { why: hit, cached: true, source: 'memory' };

  const caseContext = caseData ? buildCaseChatContext(caseData, { chatMode: 'tutor' }) : null;
  const res = await fetch(apiUrl('/api/order-why'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId: cid,
      orderId: oid,
      orderLabel,
      playbookWhy,
      caseContext,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Order why failed (${res.status})`);
  }
  const why = String(data.why || '').trim();
  if (!why) throw new Error('Empty response');
  memory.set(memKey(cid, oid), why);
  return {
    why,
    cached: Boolean(data.cached),
    source: data.cached ? 'server-cache' : 'deepseek',
  };
}
