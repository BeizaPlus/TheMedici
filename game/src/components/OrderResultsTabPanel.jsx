import OrderResultSceneCard from './OrderResultSceneCard.jsx';
import LabTrendGraphPanel from './LabTrendGraphPanel.jsx';
import { neutralStackOrderName } from '../lib/stackDecoys.js';
import { useState } from 'react';
import { buildTrendSeries } from '../lib/clinicalTrajectory/index.js';
import { buildLiveLabTrendPoints } from '../lib/liveLabTrend.js';

export default function OrderResultsTabPanel({
  resultRows = [],
  activeIvId = null,
  onSelectIvId,
  onSelectIv = null,
  caseData,
  caseFlow,
  portraitSrc = '',
  onPrintStatus,
  teachMeMode = false,
  compact = false,
  hideKicker = false,
  onPinTeachingMoment = null,
  trajectorySnapshots = null,
  orderLog = null,
  liveOrderResults = null,
  onResultStored = null,
}) {
  const [trendMetric, setTrendMetric] = useState('k');
  const trendSeries = trajectorySnapshots?.length
    ? buildTrendSeries(trajectorySnapshots).points
    : [];
  const livePoints = buildLiveLabTrendPoints(orderLog, liveOrderResults || {}, trendSeries);
  const showTrend = livePoints.length >= 2;
  const trendPoints = livePoints;
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
                    onSelectIv?.(row.iv);
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
          {showTrend && (
            <LabTrendGraphPanel
              points={trendPoints}
              metric={trendMetric}
              onMetricChange={setTrendMetric}
            />
          )}
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
              onPinTeachingMoment={onPinTeachingMoment}
              orderLog={orderLog}
              onResultStored={onResultStored}
            />
          )}
        </>
      )}
    </div>
  );
}
