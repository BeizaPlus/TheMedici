import { useEffect, useState } from 'react';
import { neutralStackOrderName } from '../lib/stackDecoys.js';
import {
  buildOrderResultPrintPayload,
  printOrderResultReport,
} from '../lib/exportOrderResult.js';
import { useOrderResult } from '../hooks/useOrderResult.js';
import { renderAttendingMarkdown } from '../lib/chatMessageFormat.jsx';

export default function OrderResultSceneCard({
  intervention,
  caseData,
  caseFlow,
  portraitSrc = '',
  onClose,
  onPrintStatus,
  className = '',
  hideClose = false,
  teachMeMode = false,
}) {
  const { result, loading } = useOrderResult(intervention, { caseData, caseFlow, teachMeMode });
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    setWhyOpen(false);
  }, [intervention?.id]);

  if (!intervention) return null;

  const label = neutralStackOrderName(intervention.label);

  const handlePrint = () => {
    const payload = buildOrderResultPrintPayload({
      intervention,
      caseData,
      caseFlow,
      portraitSrc,
      teachMeMode,
      resultOverride: result,
    });
    const ok = printOrderResultReport(payload);
    onPrintStatus?.(
      ok ? 'Print dialog open — choose Microsoft Print to PDF' : 'Allow pop-ups to print',
      ok ? 'ok' : 'bad',
    );
  };

  return (
    <div
      className={`order-result-scene-card ${className}`.trim()}
      role="region"
      aria-label={`Result for ${label}`}
      aria-busy={loading}
    >
      <header className="order-result-scene-head">
        <div className="order-result-scene-titles">
          <span className="order-result-kind">{result?.kindLabel || 'Result'}</span>
          <h3 className="order-result-title">{label}</h3>
        </div>
        <div className="order-result-scene-actions">
          <button
            type="button"
            className="order-result-print"
            onClick={handlePrint}
            title="Print — choose Microsoft Print to PDF"
          >
            Print
          </button>
          {!hideClose && (
            <button
              type="button"
              className="order-result-close"
              onClick={onClose}
              aria-label="Close result"
            >
              ✕
            </button>
          )}
        </div>
      </header>
      <div className="order-result-body">
        {renderAttendingMarkdown(result?.text || 'No result documented for this order.')}
      </div>
      {teachMeMode && intervention.why ? (
        <div className="order-result-why-wrap">
          <button
            type="button"
            className="order-result-why-toggle"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
          >
            <span className="order-result-why-chevron" aria-hidden>
              {whyOpen ? '▴' : '▾'}
            </span>
            Why
          </button>
          {whyOpen ? (
            <div className="order-result-why muted">
              {renderAttendingMarkdown(`**Why:** ${intervention.why}`)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
