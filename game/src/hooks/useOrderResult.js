import { useEffect, useMemo, useState } from 'react';
import { fetchOrderResult } from '../lib/orderResultApi.js';
import { resolveOrderResult } from '../lib/orderResult.js';

/**
 * Instant local fallback, then upgrades from DeepSeek-cached /api/order-result when ready.
 */
export function useOrderResult(
  intervention,
  { caseData, caseFlow, teachMeMode = false, orderLog = null } = {},
) {
  const fallback = useMemo(() => {
    if (!intervention?.label) return null;
    return (
      resolveOrderResult(intervention, { caseData, caseFlow, teachMeMode, orderLog }) || {
        kind: 'order',
        kindLabel: 'Result',
        text: `${intervention.label} — completed.`,
      }
    );
  }, [intervention, caseData, caseFlow, teachMeMode, orderLog]);

  const trajectoryLocked = Boolean(fallback?.trajectoryState);

  const [result, setResult] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('fallback');

  useEffect(() => {
    if (!intervention?.id || !intervention?.label || !caseData?.id) {
      setResult(fallback);
      return undefined;
    }

    setResult(fallback);
    setSource(trajectoryLocked ? 'trajectory' : 'fallback');
    if (trajectoryLocked) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);

    void fetchOrderResult({
      caseId: caseData.id,
      orderId: intervention.id,
      orderLabel: intervention.label,
      intervention,
      caseData,
      caseFlow,
      teachMeMode,
      playbookWhy: intervention.why || '',
    }).then((row) => {
      if (cancelled) return;
      setResult({
        kind: row.kind || fallback?.kind || 'order',
        kindLabel: row.kindLabel || fallback?.kindLabel || 'Result',
        text: row.text || fallback?.text || '',
      });
      setSource(row.source || 'llm');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback derived from same inputs
  }, [
    intervention?.id,
    intervention?.label,
    intervention?.why,
    intervention?.trajectoryOccurrence,
    caseData?.id,
    teachMeMode,
    caseFlow,
    orderLog,
    trajectoryLocked,
    fallback,
  ]);

  return { result, loading, source, fallback };
}
