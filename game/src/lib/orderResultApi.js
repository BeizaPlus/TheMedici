import { apiUrl } from './apiBase.js';
import { buildCaseChatContext } from './caseChat.js';
import { fetchCleanCaseClinical, mergeCleanCaseIntoCtx } from './cleanCaseClinical.js';
import { resolveOrderResult } from './orderResult.js';

const memory = new Map();

function memKey(caseId, orderId, teachMeMode) {
  return `${caseId}::${orderId}::${teachMeMode ? 'teach' : 'practice'}`;
}

function buildFallback(intervention, { caseData, caseFlow, teachMeMode, cleanCase = null }) {
  return (
    resolveOrderResult(intervention, { caseData, caseFlow, teachMeMode, cleanCase }) || {
      kind: 'order',
      kindLabel: 'Result',
      text: `${intervention?.label || 'Order'} — completed.`,
    }
  );
}

/** Server-cached case-aware result (DeepSeek/OpenAI) with local fallback. */
export async function fetchOrderResult({
  caseId,
  orderId,
  orderLabel,
  intervention = null,
  caseData = null,
  caseFlow = null,
  teachMeMode = false,
  playbookWhy = '',
  refresh = false,
}) {
  const cid = String(caseId ?? caseData?.id ?? '').trim();
  const oid = String(orderId ?? intervention?.id ?? '').trim();
  const label = String(orderLabel ?? intervention?.label ?? '').trim();
  const iv = intervention || { id: oid, label, why: playbookWhy };

  const cleanCase = await fetchCleanCaseClinical(cid);
  const fallback = buildFallback(iv, { caseData, caseFlow, teachMeMode, cleanCase });

  if (!cid || !oid || !label) {
    return { ...fallback, cached: false, source: 'fallback' };
  }

  const mk = memKey(cid, oid, teachMeMode);
  if (!refresh && memory.has(mk)) {
    return { ...memory.get(mk), cached: true, source: 'memory' };
  }

  try {
    const baseContext = caseData
      ? {
          ...buildCaseChatContext(caseData, { chatMode: 'tutor' }),
          exam: caseFlow?.exam || caseData?.physical_exam,
          vitals: caseFlow?.vitals || caseData?.preparedVitals || caseData?.vitals,
        }
      : {};
    const caseContext = mergeCleanCaseIntoCtx(baseContext, cleanCase, label);

    const res = await fetch(apiUrl('/api/order-result'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: cid,
        orderId: oid,
        orderLabel: label,
        playbookWhy: playbookWhy || intervention?.why || '',
        caseContext,
        teachMeMode,
        refresh,
        fallbackText: fallback.text,
        orderKindHint: fallback.kind,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Order result failed (${res.status})`);

    const out = {
      kind: data.kind || fallback.kind,
      kindLabel: data.kindLabel || fallback.kindLabel,
      text: String(data.text || fallback.text).trim(),
      cached: Boolean(data.cached),
      source: data.provider || (data.cached ? 'server-cache' : 'llm'),
    };
    memory.set(mk, out);
    return out;
  } catch {
    return { ...fallback, cached: false, source: 'fallback' };
  }
}

export function prefetchOrderResult(params) {
  void fetchOrderResult(params);
}

export function clearOrderResultMemory() {
  memory.clear();
}
