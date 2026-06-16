import { resolveOrderResult } from '../lib/orderResult.js';
import { neutralStackOrderName } from '../lib/stackDecoys.js';
import {
  buildOrderResultPrintPayload,
  printOrderResultReport,
} from '../lib/exportOrderResult.js';

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
  if (!intervention) return null;

  const result = resolveOrderResult(intervention, { caseData, caseFlow, teachMeMode });
  const label = neutralStackOrderName(intervention.label);

  const handlePrint = () => {
    const payload = buildOrderResultPrintPayload({
      intervention,
      caseData,
      caseFlow,
      portraitSrc,
      teachMeMode,
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
      <p className="order-result-body">{result?.text || 'No result documented for this order.'}</p>
    </div>
  );
}
