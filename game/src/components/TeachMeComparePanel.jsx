import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildBareEssentialsRows } from '../lib/caseBareEssentials.js';
import { getCaseDifferentials } from '../lib/caseDifferentials.js';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { buildTeachCompareRows, teachCompareStatusLabel } from '../lib/teachMeCompare.js';
import { fetchOrderWhy } from '../lib/orderWhy.js';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { IconUsersGroup, IconVolume2 } from './sceneToolbar/SceneToolbarIcons.jsx';

function flowDotClass(row, focused) {
  const parts = ['teach-flow-dot'];
  if (row.status === 'match') parts.push('done');
  else if (row.isPlaced) parts.push('placed');
  if (row.status === 'next') parts.push('next');
  if (focused) parts.push('focused');
  if (['order-off', 'missed', 'extra'].includes(row.status)) parts.push('warn');
  return parts.join(' ');
}

function badgeClass(status) {
  return `teach-compare-badge status-${status || 'pending'}`;
}

function YoursCell({ row }) {
  const placed = Boolean(row.isPlaced || row.yourSeq != null);
  if (placed) {
    return (
      <span className="teach-compare-yours teach-compare-yours-done" aria-label="Placed">
        ✓
      </span>
    );
  }
  return (
    <span className="teach-compare-yours teach-compare-yours-miss" aria-label="Not placed">
      ✕
    </span>
  );
}

export default function TeachMeComparePanel({
  interventions = [],
  interventionById = {},
  placementOrder = [],
  placed = {},
  nextExpectedId = null,
  teachFocusId = null,
  reviewResults = null,
  onFocusStep,
  onEnsureFocus,
  compact = false,
  caseId = null,
  caseData = null,
}) {
  const critical = useMemo(
    () =>
      buildBareEssentialsRows({
        caseData,
        interventions,
        placed,
      }),
    [caseData, interventions, placed],
  );

  const { rows, extras } = useMemo(
    () =>
      buildTeachCompareRows({
        interventions,
        interventionById,
        placementOrder,
        placed,
        nextExpectedId,
        reviewResults,
      }),
    [interventions, interventionById, placementOrder, placed, nextExpectedId, reviewResults],
  );

  const differentials = useMemo(() => getCaseDifferentials(caseData), [caseData]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [whyByOrder, setWhyByOrder] = useState({});
  const [peerByOrder, setPeerByOrder] = useState({});
  const [whyLoading, setWhyLoading] = useState(null);
  const [peerLoading, setPeerLoading] = useState(null);
  const [whyError, setWhyError] = useState('');
  const [readState, setReadState] = useState('idle');

  const focusedRow = useMemo(
    () => rows.find((r) => r.id === teachFocusId) || null,
    [rows, teachFocusId],
  );

  useEffect(() => {
    if (!teachFocusId || !caseId || !focusedRow) return undefined;
    if (whyByOrder[teachFocusId]) return undefined;

    let cancelled = false;
    setWhyLoading(teachFocusId);
    setWhyError('');
    fetchOrderWhy({
      caseId,
      orderId: teachFocusId,
      orderLabel: focusedRow.label,
      caseData,
      playbookWhy: focusedRow.why,
    })
      .then(({ why }) => {
        if (!cancelled) {
          setWhyByOrder((prev) => ({ ...prev, [teachFocusId]: why }));
        }
      })
      .catch((e) => {
        if (!cancelled) setWhyError(String(e.message || e));
      })
      .finally(() => {
        if (!cancelled) setWhyLoading(null);
      });

    return () => {
      cancelled = true;
    };
  }, [teachFocusId, caseId, caseData, focusedRow, whyByOrder]);

  useEffect(() => () => stopCaseReader(), []);

  const primaryWhy =
    (teachFocusId && (whyByOrder[teachFocusId] || focusedRow?.why)) || '';
  const peerWhy = (teachFocusId && peerByOrder[teachFocusId]) || '';

  const handleListen = useCallback(
    async (event, row) => {
      event.stopPropagation();
      if (!row || !caseId) return;
      const text =
        peerByOrder[row.id] ||
        whyByOrder[row.id] ||
        row.why ||
        row.label;
      if (!String(text).trim()) return;
      if (whyLoading === row.id) return;
      if (!whyByOrder[row.id] && !row.why) {
        setWhyLoading(row.id);
        try {
          const { why } = await fetchOrderWhy({
            caseId,
            orderId: row.id,
            orderLabel: row.label,
            caseData,
            playbookWhy: row.why,
          });
          setWhyByOrder((prev) => ({ ...prev, [row.id]: why }));
          await readCaseAloud({
            caseId,
            section: 'teach-why',
            text: why,
            onState: setReadState,
          });
        } catch (e) {
          setWhyError(String(e.message || e));
        } finally {
          setWhyLoading(null);
        }
        return;
      }
      await readCaseAloud({
        caseId,
        section: 'teach-why',
        text,
        onState: setReadState,
      });
    },
    [caseId, caseData, peerByOrder, whyByOrder, whyLoading],
  );

  const handlePeer = useCallback(
    async (event, row) => {
      event.stopPropagation();
      if (!row || !caseId || peerLoading === row.id) return;
      const alreadyFocused = teachFocusId === row.id;
      if (!alreadyFocused) {
        (onEnsureFocus || onFocusStep)?.(row.id);
      }
      if (peerByOrder[row.id]) {
        return;
      }
      setPeerLoading(row.id);
      setWhyError('');
      try {
        const { why } = await fetchOrderWhy({
          caseId,
          orderId: row.id,
          orderLabel: row.label,
          caseData,
          playbookWhy: row.why,
          peerReview: true,
        });
        setPeerByOrder((prev) => ({ ...prev, [row.id]: why }));
      } catch (e) {
        setWhyError(String(e.message || e));
      } finally {
        setPeerLoading(null);
      }
    },
    [caseId, caseData, onEnsureFocus, onFocusStep, peerByOrder, peerLoading, teachFocusId],
  );

  const renderRow = (row) => {
    const focused = teachFocusId === row.id;
    const showActions = focused || row.status === 'next';
    const isOpen = focused;

    return (
      <li
        key={row.id}
        className={`teach-compare-row${isOpen ? ' is-open is-focused' : ''}${row.status === 'next' ? ' is-next' : ''}`}
      >
        <div className="teach-compare-row-main">
          <button
            type="button"
            className={`teach-compare-row-btn${showActions ? ' has-inline-actions' : ''}`}
            onClick={() => onFocusStep?.(row.id)}
            aria-expanded={isOpen}
          >
            <span className={flowDotClass(row, focused)} aria-hidden>
              {row.expectedSeq}
            </span>
            <span className="teach-compare-label" title={row.label}>
              {row.label}
            </span>
            <span className="teach-compare-yours">
              <YoursCell row={row} />
            </span>
            <span className={badgeClass(row.status)}>{teachCompareStatusLabel(row.status)}</span>
            {showActions && (
              <span className="teach-compare-row-inline-actions">
                <button
                  type="button"
                  className={`teach-compare-icon-btn${readState === 'playing' && focused ? ' is-active' : ''}`}
                  title="Listen — read rationale aloud"
                  aria-label="Listen"
                  disabled={whyLoading === row.id}
                  onClick={(e) => void handleListen(e, row)}
                >
                  <IconVolume2 />
                </button>
                <button
                  type="button"
                  className={`teach-compare-icon-btn${peerByOrder[row.id] ? ' is-active' : ''}`}
                  title="Second opinion — peer attending"
                  aria-label="Second opinion"
                  disabled={peerLoading === row.id}
                  onClick={(e) => void handlePeer(e, row)}
                >
                  <IconUsersGroup />
                </button>
              </span>
            )}
          </button>
        </div>
        {isOpen && (
          <div className="teach-compare-rationale">
            {whyError && <p className="teach-compare-why-error">{whyError}</p>}
            {whyLoading === row.id && !primaryWhy && (
              <p className="teach-compare-rationale-loading">Loading rationale…</p>
            )}
            {primaryWhy && (
              <div className="teach-compare-rationale-body teach-me-text-block selectable-text">
                {renderChatMarkdown(primaryWhy)}
              </div>
            )}
            {peerLoading === row.id && !peerWhy && (
              <p className="teach-compare-rationale-loading">Loading second opinion…</p>
            )}
            {peerWhy && peerWhy !== primaryWhy && (
              <div className="teach-compare-rationale-peer">
                <p className="teach-compare-rationale-peer-label">Second opinion</p>
                <div className="teach-me-text-block selectable-text">
                  {renderChatMarkdown(peerWhy)}
                </div>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={`teach-compare-panel${compact ? ' teach-compare-panel--compact' : ''}`}>
      {rows.length > 0 && (
        <section className="teach-compare-flow" aria-label="Standard flow sequence">
          <div className="teach-compare-head" aria-hidden>
            <span className="teach-compare-col-flow">#</span>
            <span className="teach-compare-col-label">Order</span>
            <span className="teach-compare-col-yours">Yours</span>
            <span className="teach-compare-col-badge">Status</span>
          </div>
          <ul className="teach-compare-list">{rows.map(renderRow)}</ul>
          {extras.length > 0 && (
            <>
              <p className="teach-compare-extra-kicker">Outside standard set</p>
              <ul className="teach-compare-list teach-compare-list-extra">
                {extras.map((row) => (
                  <li key={row.id} className="teach-compare-row">
                    <div className="teach-compare-row-main">
                      <button
                        type="button"
                        className="teach-compare-row-btn"
                        onClick={() => onFocusStep?.(row.id)}
                      >
                        <span className="teach-flow-dot extra" aria-hidden>
                          ·
                        </span>
                        <span className="teach-compare-label">{row.label}</span>
                        <span className="teach-compare-yours">
                          <YoursCell row={row} />
                        </span>
                        <span className={badgeClass(row.status)}>
                          {teachCompareStatusLabel(row.status)}
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {critical.rows.length > 0 && (
        <>
          <p className="teach-compare-critical-title">{critical.title}</p>
          {critical.subtitle && (
            <p className="teach-compare-critical-sub">{critical.subtitle}</p>
          )}
          <ul className="teach-compare-critical-list" aria-label="Non-negotiable orders">
            {critical.rows.map((row) => (
              <li
                key={row.id}
                className={`teach-compare-critical-item${row.isDone ? ' is-done' : ' is-miss'}`}
              >
                <span className="teach-compare-critical-check" aria-hidden>
                  {row.isDone ? '✓' : '○'}
                </span>
                <div className="teach-compare-critical-body">
                  <strong>{row.shortLabel}</strong>
                  {row.label !== row.shortLabel && (
                    <span className="teach-compare-critical-stack">{row.label}</span>
                  )}
                </div>
                <span className={`teach-compare-critical-status${row.isDone ? ' done' : ''}`}>
                  {row.isDone ? 'Placed' : 'Must do'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {differentials?.items?.length > 0 && (
        <section className="teach-compare-tier tier-differentials">
          <button
            type="button"
            className="teach-compare-tier-head"
            onClick={() => setDiffOpen((v) => !v)}
            aria-expanded={diffOpen}
          >
            <span className="teach-compare-tier-chevron" aria-hidden>
              {diffOpen ? '▾' : '▸'}
            </span>
            <span className="teach-compare-tier-label">Differentials</span>
            <span className="teach-compare-tier-count">{differentials.items.length}</span>
          </button>
          {diffOpen && (
            <ul className="teach-compare-list teach-compare-list-tier teach-compare-diff-list">
              {differentials.items.map((item) => (
                <li key={item.id} className="teach-compare-diff-item">
                  <strong className="teach-compare-diff-label">{item.label}</strong>
                  <div className="teach-compare-diff-why teach-me-text-block selectable-text">
                    {renderChatMarkdown(item.why)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
