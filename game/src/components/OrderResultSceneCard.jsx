import { useEffect, useState } from 'react';
import { neutralStackOrderName } from '../lib/stackDecoys.js';
import {
  buildOrderResultPrintPayload,
  printOrderResultReport,
} from '../lib/exportOrderResult.js';
import { useOrderResult } from '../hooks/useOrderResult.js';
import { renderAttendingMarkdown } from '../lib/chatMessageFormat.jsx';
import { formatResultWhyExpand } from '../lib/resultWhyText.js';
import { readOrderStoryPinned } from '../lib/caseStoryStarted.js';

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
  onPinTeachingMoment = null,
  orderLog = null,
  onResultStored = null,
}) {
  const { result, loading } = useOrderResult(intervention, {
    caseData,
    caseFlow,
    teachMeMode,
    orderLog,
    onResultStored,
  });
  const [whyOpen, setWhyOpen] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [storyPinned, setStoryPinned] = useState(() =>
    readOrderStoryPinned(caseData?.id, neutralStackOrderName(intervention?.label || '')),
  );

  useEffect(() => {
    setWhyOpen(false);
    setBodyExpanded(false);
    setStoryPinned(
      readOrderStoryPinned(caseData?.id, neutralStackOrderName(intervention?.label || '')),
    );
  }, [intervention?.id, caseData?.id, intervention?.label]);

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
      className={`order-result-scene-card${bodyExpanded ? ' order-result-scene-card--body-expanded' : ''} ${className}`.trim()}
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
          {onPinTeachingMoment && result?.text && !loading && (
            <button
              type="button"
              className={`order-result-pin-story${storyPinned ? ' is-pinned' : ''}`}
              title={storyPinned ? 'Pinned for Case Story ⭐' : 'Pin for Case Story ⭐'}
              onClick={() => {
                onPinTeachingMoment({
                  orderLabel: label,
                  answer: result.text,
                  channel: intervention.teachingChannel || '',
                });
                setStoryPinned(true);
              }}
            >
              ⭐ Story
            </button>
          )}
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
      <div
        className="order-result-body"
        onDoubleClick={() => setBodyExpanded((v) => !v)}
        title={bodyExpanded ? 'Double-click to collapse' : 'Double-click to expand full result'}
        role="group"
        aria-expanded={bodyExpanded}
      >
        {renderAttendingMarkdown(result?.text || 'No result documented for this order.')}
        {teachMeMode && whyOpen && intervention.why ? (
          <div className="order-result-why-body">
            {renderAttendingMarkdown(formatResultWhyExpand(intervention.why))}
          </div>
        ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
