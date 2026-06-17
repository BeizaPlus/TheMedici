import playbookBundle from '../data/orderWhyPlaybook.json' with { type: 'json' };
import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';
import { readLocalOrderWhy, writeLocalOrderWhy } from './orderWhyLocal.js';

const memory = new Map();

function memKey(caseId, orderId) {
  return `${caseId}::${orderId}`;
}

function normalizeCaseId(caseId) {
  const raw = String(caseId ?? '').trim();
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

function readPlaybookWhy(caseId, orderId) {
  const ck = normalizeCaseId(caseId);
  const ok = String(orderId ?? '').trim();
  return playbookBundle?.cases?.[ck]?.[ok]?.why || null;
}

/** Fetch case-specific order rationale — offline playbook + local cache + server. */
export async function fetchOrderWhy({ caseId, orderId, orderLabel, caseData, playbookWhy = '' }) {
  const cid = normalizeCaseId(caseId);
  const oid = String(orderId ?? '').trim();
  if (!cid || !oid || !orderLabel) {
    throw new Error('Missing case or order');
  }

  const hit = memory.get(memKey(cid, oid));
  if (hit) return { why: hit, cached: true, source: 'memory' };

  const local = readLocalOrderWhy(cid, oid);
  if (local) {
    memory.set(memKey(cid, oid), local);
    return { why: local, cached: true, source: 'local' };
  }

  const bundled = readPlaybookWhy(cid, oid);
  const fallback = String(bundled || playbookWhy || '').trim();

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    if (!fallback) throw new Error('Offline — no cached rationale for this order');
    memory.set(memKey(cid, oid), fallback);
    return { why: fallback, cached: true, source: bundled ? 'playbook-bundle' : 'playbook' };
  }

  if (fallback) {
    memory.set(memKey(cid, oid), fallback);
  }

  try {
    const caseContext = caseData ? buildCaseChatContext(caseData, { chatMode: 'tutor' }) : null;
    const res = await fetch(apiUrl('/api/order-why'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: cid,
        orderId: oid,
        orderLabel,
        playbookWhy: fallback || playbookWhy,
        caseContext,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (fallback) {
        return { why: fallback, cached: true, source: 'playbook-fallback' };
      }
      throw new Error(data.error || `Order why failed (${res.status})`);
    }
    const why = String(data.why || '').trim();
    if (!why) {
      if (fallback) return { why: fallback, cached: true, source: 'playbook-fallback' };
      throw new Error('Empty response');
    }
    memory.set(memKey(cid, oid), why);
    writeLocalOrderWhy(cid, oid, why, orderLabel);
    return {
      why,
      cached: Boolean(data.cached),
      source: data.cached ? 'server-cache' : 'deepseek',
    };
  } catch (err) {
    if (fallback) {
      return { why: fallback, cached: true, source: 'playbook-fallback' };
    }
    throw err;
  }
}
