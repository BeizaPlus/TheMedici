import playbookBundle from '../data/orderWhyPlaybook.json' with { type: 'json' };
import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';
import { readFirstOpinionDepth } from './firstOpinionPrefs.js';
import { LOCKED_SECOND_OPINION_DEPTH } from './secondOpinionPrefs.js';
import {
  clearLocalOrderWhy,
  readLocalOrderWhy,
  readLocalPeerOrderWhy,
  writeLocalOrderWhy,
  writeLocalPeerOrderWhy,
} from './orderWhyLocal.js';
import { persistOrderWhyToCaseNotes } from './orderWhyNotes.js';

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

/** Fetch case-specific order rationale — shipped playbook first; API for refresh or second opinion. */
export async function fetchOrderWhy({
  caseId,
  orderId,
  orderLabel,
  caseData,
  playbookWhy = '',
  peerReview = false,
  secondOpinionDepth = LOCKED_SECOND_OPINION_DEPTH,
  firstOpinionDepth = readFirstOpinionDepth(),
  forceRefresh = false,
} = {}) {
  const cid = normalizeCaseId(caseId);
  const oid = String(orderId ?? '').trim();
  const peerDepthIdx = LOCKED_SECOND_OPINION_DEPTH;
  const firstDepthIdx = Math.max(0, Math.min(3, Number(firstOpinionDepth) || 0));
  const cacheKey = peerReview ? `${oid}__peer__d${peerDepthIdx}` : `${oid}__d${firstDepthIdx}`;
  if (!cid || !oid || !orderLabel) {
    throw new Error('Missing case or order');
  }

  if (forceRefresh) {
    memory.delete(memKey(cid, cacheKey));
    clearLocalOrderWhy(cid, oid, {
      peerReview,
      secondOpinionDepth: peerDepthIdx,
      firstOpinionDepth: firstDepthIdx,
    });
  }

  if (!forceRefresh) {
    const hit = memory.get(memKey(cid, cacheKey));
    if (hit) return { why: hit, cached: true, source: 'memory' };

    if (peerReview) {
      const peerLocal = readLocalPeerOrderWhy(cid, oid, peerDepthIdx);
      if (peerLocal) {
        memory.set(memKey(cid, cacheKey), peerLocal);
        return { why: peerLocal, cached: true, source: 'local-peer' };
      }
    } else {
      const local = readLocalOrderWhy(cid, oid, firstDepthIdx);
      if (local) {
        memory.set(memKey(cid, cacheKey), local);
        return { why: local, cached: true, source: 'local' };
      }

      const bundled = readPlaybookWhy(cid, oid);
      const fallback = String(bundled || playbookWhy || '').trim();
      if (fallback) {
        memory.set(memKey(cid, cacheKey), fallback);
        return {
          why: fallback,
          cached: true,
          source: bundled ? 'playbook-bundle' : 'playbook',
        };
      }
    }
  }

  const bundled = peerReview ? null : readPlaybookWhy(cid, oid);
  const fallback = String(bundled || playbookWhy || '').trim();

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    if (!fallback) throw new Error('Offline — no cached rationale for this order');
    memory.set(memKey(cid, cacheKey), fallback);
    return { why: fallback, cached: true, source: bundled ? 'playbook-bundle' : 'playbook' };
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
        peerReview: Boolean(peerReview),
        secondOpinionDepth: peerDepthIdx,
        firstOpinionDepth: firstDepthIdx,
        forceRefresh: Boolean(forceRefresh),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (fallback && !peerReview) {
        return { why: fallback, cached: true, source: 'playbook-fallback' };
      }
      throw new Error(data.error || `Order why failed (${res.status})`);
    }
    const why = String(data.why || '').trim();
    if (!why) {
      if (fallback && !peerReview) return { why: fallback, cached: true, source: 'playbook-fallback' };
      throw new Error('Empty response');
    }
    memory.set(memKey(cid, cacheKey), why);
    if (peerReview) {
      writeLocalPeerOrderWhy(cid, oid, peerDepthIdx, why, orderLabel);
    } else {
      writeLocalOrderWhy(cid, oid, firstDepthIdx, why, orderLabel);
    }
    persistOrderWhyToCaseNotes(cid, {
      orderId: oid,
      orderLabel,
      why,
      peerReview,
      secondOpinionDepth: peerDepthIdx,
      firstOpinionDepth: firstDepthIdx,
    });
    return {
      why,
      cached: Boolean(data.cached),
      source: data.cached ? 'server-cache' : 'deepseek',
    };
  } catch (err) {
    if (fallback && !peerReview) {
      return { why: fallback, cached: true, source: 'playbook-fallback' };
    }
    throw err;
  }
}
