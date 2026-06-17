import OrderResultSceneCard from './OrderResultSceneCard.jsx';
import { neutralStackOrderName } from '../lib/stackDecoys.js';

export default function OrderResultsTabPanel({
  resultRows = [],
  activeIvId = null,
  onSelectIvId,
  caseData,
  caseFlow,
  portraitSrc = '',
  onPrintStatus,
  teachMeMode = false,
  compact = false,
  hideKicker = false,
}) {
  const hasRows = resultRows.length > 0;
  const activeRow =
    resultRows.find((row) => row.iv.id === activeIvId) || (hasRows ? resultRows[0] : null);

  return (
    <div className={`order-results-tab-panel${compact ? ' order-results-tab-panel--dock' : ''}`}>
      {!hideKicker && (
        <p className="order-results-tab-kicker">Lab and intervention results</p>
      )}

      {!hasRows && (
        <p className="order-results-tab-empty">
          Place an order on the patient, then tap its pin to view the result here.
        </p>
      )}

      {hasRows && (
        <>
          <div className="order-results-tab-list" role="tablist" aria-label="Placed order results">
            {resultRows.map((row) => {
              const isActive = activeRow?.iv.id === row.iv.id;
              return (
                <button
                  key={row.iv.id}
                  type="button"
                  className={`order-results-tab-chip ${isActive ? 'active' : ''}${row.teachPending ? ' is-pending' : ''}`}
                  onClick={() => {
                    if (row.teachPending) return;
                    onSelectIvId?.(row.iv.id);
                  }}
                  aria-selected={isActive}
                  disabled={row.teachPending}
                  title={
                    row.teachPending
                      ? `${neutralStackOrderName(row.iv.label)} — not placed yet`
                      : neutralStackOrderName(row.iv.label)
                  }
                >
                  {neutralStackOrderName(row.iv.label)}
                </button>
              );
            })}
          </div>
          {activeRow && !activeRow.teachPending && (
            <OrderResultSceneCard
              intervention={activeRow.iv}
              caseData={caseData}
              caseFlow={caseFlow}
              portraitSrc={portraitSrc}
              onPrintStatus={onPrintStatus}
              className={`order-result-tab-card${compact ? ' order-result-tab-card--dock' : ''}`}
              hideClose
              teachMeMode={teachMeMode}
            />
          )}
        </>
      )}
    </div>
  );
}
