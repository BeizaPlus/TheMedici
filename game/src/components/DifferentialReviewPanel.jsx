import { useMemo, useState } from 'react';
import CcsCaseSummaryBody from './CcsCaseSummaryBody.jsx';
import { resolveCaseSummaryText } from '../lib/ccsCaseSummary.js';

const TABS = [
  { id: 'summary', label: 'Case Summary' },
  { id: 'orders', label: 'Orders' },
  { id: 'should-order', label: 'Should Order' },
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

export default function DifferentialReviewPanel({ review, className = '', onInteract }) {
  const shouldOrderItems = useMemo(
    () => (review?.orders || []).filter((item) => item.status === 'missed'),
    [review?.orders],
  );

  const tabs = useMemo(() => {
    const list = [];
    const summaryText = resolveCaseSummaryText(review);
    if (summaryText || review?.history) list.push(TABS[0]);
    if (review?.ordersText || review?.orders?.length) list.push(TABS[1]);
    if (shouldOrderItems.length) list.push(TABS[2]);
    return list.length ? list : TABS.slice(0, 2);
  }, [review, shouldOrderItems.length]);

  const [tab, setTab] = useState('summary');

  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id || 'summary';

  const head =
    review?.diagnosis && review?.scores
      ? `${review.diagnosis} · ${review.scores.yours} (avg ${review.scores.average})`
      : review?.diagnosis || review?.title || '';

  const summaryText = resolveCaseSummaryText(review);

  return (
    <div className={`differential-review-panel ${className}`.trim()}>
      {head && <p className="differential-review-head">{head}</p>}
      <div className="case-info-tabs" role="tablist" aria-label="CCS review sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              activeTab === t.id
                ? `case-info-tab active${t.id === 'should-order' ? ' case-info-tab--should-order' : ''}`
                : `case-info-tab${t.id === 'should-order' ? ' case-info-tab--should-order' : ''}`
            }
            onClick={() => {
              onInteract?.();
              setTab(t.id);
            }}
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
        ) : activeTab === 'should-order' ? (
          shouldOrderItems.length ? (
            <>
              <p className="diff-should-order-lead">
                {shouldOrderItems.length} high-yield order{shouldOrderItems.length === 1 ? '' : 's'} you should know for this case.
              </p>
              <OrdersFlowList orders={shouldOrderItems} />
            </>
          ) : (
            <p className="soap-body differential-review-text">No should-order items for this case.</p>
          )
        ) : (
          <CcsCaseSummaryBody text={summaryText || review?.history} />
        )}
      </section>
    </div>
  );
}
