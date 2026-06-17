import { useMemo } from 'react';

/**
 * Mobile-only Teach Me panel shown inside the study bottom sheet accordion.
 * Displays the differential diagnoses with educational context:
 * - Case diagnosis highlighted with a star
 * - Clinical summary from CCS review
 * - High-yield missed orders
 */
export default function DifferentialTeachMePanel({
  caseId,
  topic,
  title,
  diagnosis,
  diagnoses = [],
  ccsReview,
  hasReviewText,
  clinicalStyle,
}) {
  const caseSummary = useMemo(() => {
    if (!ccsReview) return null;
    let text = ccsReview.caseSummary || '';
    const cutoff = text.search(/\n\s*Average\s+Orders/i);
    if (cutoff >= 0) text = text.slice(0, cutoff).trim();
    text = text.replace(/\n{3,}/g, '\n\n');
    return text;
  }, [ccsReview]);

  const highYieldOrders = useMemo(() => {
    if (!ccsReview?.orders?.length) return [];
    return ccsReview.orders.filter((o) => o.status === 'missed');
  }, [ccsReview]);

  const isCaseDx = (d) =>
    diagnosis && d.toLowerCase().trim() === diagnosis.toLowerCase().trim();

  return (
    <div className="diff-teach-me" style={clinicalStyle} aria-label="Teach Me — differential diagnoses and clinical teaching">
      <div className="diff-teach-me-header">
        <span className="diff-teach-me-kicker">Teach Me</span>
        <h3 className="diff-teach-me-topic">{topic || title || `Case ${caseId}`}</h3>
      </div>

      <section className="diff-teach-me-section">
        <h4 className="diff-teach-me-section-title">
          Differential ({diagnoses.length})
        </h4>
        <ol className="diff-teach-me-dd-list">
          {diagnoses.map((d, i) => (
            <li
              key={`${d}-${i}`}
              className={`diff-teach-me-dd-item${isCaseDx(d) ? ' diff-teach-me-dd-item--star' : ''}`}
            >
              <span className="diff-teach-me-dd-num">{i + 1}</span>
              <span className="diff-teach-me-dd-text">{d}</span>
              {isCaseDx(d) && (
                <span className="diff-teach-me-star" title="This case's diagnosis">★</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {caseSummary && (
        <section className="diff-teach-me-section">
          <h4 className="diff-teach-me-section-title">Clinical Pearls</h4>
          <div className="diff-teach-me-summary">
            {caseSummary.split('\n').map((para, i) => {
              const trimmed = para.trim();
              if (!trimmed) return null;
              return <p key={i} className="diff-teach-me-para">{trimmed}</p>;
            })}
          </div>
        </section>
      )}

      {highYieldOrders.length > 0 && (
        <section className="diff-teach-me-section">
          <h4 className="diff-teach-me-section-title">
            High-Yield Orders ({highYieldOrders.length})
          </h4>
          <ol className="diff-teach-me-orders-list">
            {highYieldOrders.map((item, i) => (
              <li key={`hy-${i}`} className="diff-teach-me-order-item">
                <span className="diff-teach-me-order-name">{item.order}</span>
                {item.reason && (
                  <span className="diff-teach-me-order-reason">{item.reason}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {!hasReviewText && !caseSummary && (
        <p className="diff-teach-me-empty">
          No CCS review data for Case {caseId}. Use the Case tab or CCS screenshot for reference.
        </p>
      )}
    </div>
  );
}
