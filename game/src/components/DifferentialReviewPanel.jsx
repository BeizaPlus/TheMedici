import { useMemo, useState } from 'react';

const TABS = [
  { id: 'summary', label: 'Case Summary' },
  { id: 'orders', label: 'Orders' },
];

const STATUS_LABEL = {
  correct: 'Ordered',
  missed: 'Should order',
  avoided: 'Avoid',
};

function OrdersFlowList({ orders = [] }) {
  if (!orders.length) {
    return <p className="differential-review-text">No orders in case reference.</p>;
  }

  return (
    <ol className="diff-orders-flow" aria-label="Case order sequence">
      {orders.map((item, index) => (
        <li
          key={`${item.order}-${index}`}
          className={`diff-order-step diff-order-step--${item.status || 'correct'}`}
        >
          <span className="diff-order-num" aria-hidden>
            {index + 1}
          </span>
          <div className="diff-order-body">
            <div className="diff-order-title-row">
              <span className="diff-order-name">{item.order}</span>
              {item.status && item.status !== 'correct' && (
                <span className={`diff-order-status diff-order-status--${item.status}`}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              )}
            </div>
            {item.reason && <p className="diff-order-reason">{item.reason}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function DifferentialReviewPanel({ review, className = '' }) {
  const tabs = useMemo(() => {
    const list = [];
    if (review?.history || review?.caseSummary) list.push(TABS[0]);
    if (review?.ordersText || review?.orders?.length) list.push(TABS[1]);
    return list.length ? list : TABS;
  }, [review]);

  const [tab, setTab] = useState('summary');

  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id || 'summary';

  const head =
    review?.diagnosis && review?.scores
      ? `${review.diagnosis} · ${review.scores.yours} (avg ${review.scores.average})`
      : review?.diagnosis || review?.title || '';

  return (
    <div className={`differential-review-panel ${className}`.trim()}>
      {head && <p className="differential-review-head">{head}</p>}
      <div className="case-info-tabs" role="tablist" aria-label="CCS review sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={activeTab === t.id ? 'case-info-tab active' : 'case-info-tab'}
            onClick={() => setTab(t.id)}
            aria-selected={activeTab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="soap-section differential-review-body">
        {activeTab === 'orders' ? (
          review?.orders?.length ? (
            <OrdersFlowList orders={review.orders} />
          ) : (
            <p className="soap-body differential-review-text">
              {review?.ordersText || 'No orders in case reference.'}
            </p>
          )
        ) : (
          <p className="soap-body differential-review-text">
            {review?.history || review?.caseSummary || review?.hpiNarrative || 'No case summary available.'}
          </p>
        )}
      </section>
    </div>
  );
}
