import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildTeachCompareRows,
  teachCompareStatusLabel,
} from '../lib/teachMeCompare.js';
import { fetchOrderWhy } from '../lib/orderWhy.js';
import { buildBareEssentialsRows, groupTeachCompareRowsByTier } from '../lib/caseBareEssentials.js';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';

function flowDotClass(row, focused) {
  const parts = ['teach-flow-dot'];
  if (row.isPlaced) parts.push('done');
  else {
    if (row.status === 'next') parts.push('next');
    if (row.status === 'order-off' || row.status === 'missed') parts.push('warn');
  }
  if (row.status === 'extra') parts.push('extra');
  if (focused) parts.push('focused');
  return parts.join(' ');
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
  compact = false,
  caseId = null,
  caseData = null,
}) {
  const [panelTab, setPanelTab] = useState('flow');
  const [whyOpenId, setWhyOpenId] = useState(null);
  const [whyText, setWhyText] = useState({});
  const [whyLoadingId, setWhyLoadingId] = useState(null);
  const [whyError, setWhyError] = useState('');

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

  const critical = useMemo(
    () =>
      buildBareEssentialsRows({
        caseData,
        interventions,
        placed,
      }),
    [caseData, interventions, placed],
  );

  const flowTiers = useMemo(
    () =>
      groupTeachCompareRowsByTier({
        rows,
        caseData,
        interventions,
      }),
    [rows, caseData, interventions],
  );

  const [tierCollapsed, setTierCollapsed] = useState(() =>
    Object.fromEntries(
      ['critical', 'general', 'misc'].map((id) => [
        id,
        id === 'misc',
      ]),
    ),
  );

  const toggleTier = useCallback((tierId) => {
    setTierCollapsed((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  }, []);

  const nextLabel =
    nextExpectedId && interventionById[nextExpectedId]
      ? interventionById[nextExpectedId].label
      : 'All core stacks placed';

  const loadWhy = useCallback(
    async (row, { forceOpen = true } = {}) => {
      if (!caseId || !caseData || !row?.id) {
        setWhyError('Case context unavailable');
        return;
      }
      const id = row.id;
      if (forceOpen) setWhyOpenId(id);
      if (whyText[id]) return;
      const seed = String(row.why || row.iv?.why || '').trim();
      if (seed) {
        setWhyText((prev) => (prev[id] ? prev : { ...prev, [id]: seed }));
      }
      setWhyError('');
      setWhyLoadingId(id);
      try {
        const { why } = await fetchOrderWhy({
          caseId,
          orderId: id,
          orderLabel: row.label,
          caseData,
          playbookWhy: row.why || row.iv?.why || '',
        });
        setWhyText((prev) => ({ ...prev, [id]: why }));
      } catch (e) {
        const fallback = String(row.why || row.iv?.why || '').trim();
        if (fallback) {
          setWhyText((prev) => ({ ...prev, [id]: fallback }));
          setWhyError('');
        } else {
          setWhyError(String(e.message || e));
        }
      } finally {
        setWhyLoadingId(null);
      }
    },
    [caseId, caseData, whyText],
  );

  useEffect(() => {
    if (!teachFocusId) {
      setWhyOpenId(null);
      return;
    }
    const row =
      rows.find((r) => r.id === teachFocusId)
      || extras.find((r) => r.id === teachFocusId);
    if (!row) return;
    setWhyOpenId(teachFocusId);
    void loadWhy(row, { forceOpen: true });
  }, [teachFocusId, rows, extras, loadWhy]);

  const renderRow = (row, keyPrefix = '', isExtra = false) => {
    const focused = !isExtra && teachFocusId === row.id;
    const whyOpen = whyOpenId === row.id || focused;
    const whyBusy = whyLoadingId === row.id;
    const playbookWhy = row.why || row.iv?.why || '';
    const whyBody = whyText[row.id] || playbookWhy;

    return (
      <li
        key={`${keyPrefix}${row.id}`}
        className={`teach-compare-row status-${row.status}${focused ? ' is-focused' : ''}${whyOpen ? ' is-open' : ''}`}
      >
        <div className="teach-compare-row-main">
          <button
            type="button"
            className="teach-compare-row-btn"
            onClick={() => {
              if (!isExtra) onFocusStep?.(row.id);
              if (caseId && caseData) void loadWhy(row);
            }}
          >
            <span
              className={flowDotClass(row, focused)}
              aria-hidden={isExtra}
              title={isExtra ? undefined : `Step ${row.expectedSeq}`}
            >
              {isExtra ? '·' : row.expectedSeq}
            </span>
            <span className="teach-compare-label" title={row.label}>
              {row.label}
            </span>
            <span className="teach-compare-yours">
              {row.yourSeq != null ? `#${row.yourSeq}` : '—'}
            </span>
            <span className={`teach-compare-badge status-${row.status}`}>
              {teachCompareStatusLabel(row.status)}
            </span>
          </button>
        </div>
        {whyOpen && (
          <div className="teach-compare-rationale" aria-live="polite">
            {whyBusy && !whyText[row.id] && (
              <p className="teach-compare-rationale-loading">Asking the attending…</p>
            )}
            {whyBody && (
              <div className="teach-compare-rationale-text teach-me-text-block selectable-text">
                {renderChatMarkdown(whyBody)}
              </div>
            )}
            {row.guideline && (
              <p className="teach-compare-rationale-guideline">{row.guideline}</p>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={`teach-compare-panel${compact ? ' teach-compare-panel--compact' : ''}`}>
      <div className="teach-compare-tabs" role="tablist" aria-label="Report views">
        <button
          type="button"
          role="tab"
          className={`teach-compare-tab${panelTab === 'flow' ? ' is-active' : ''}`}
          aria-selected={panelTab === 'flow'}
          onClick={() => setPanelTab('flow')}
        >
          Flow
        </button>
        <button
          type="button"
          role="tab"
          className={`teach-compare-tab${panelTab === 'critical' ? ' is-active' : ''}`}
          aria-selected={panelTab === 'critical'}
          onClick={() => setPanelTab('critical')}
          disabled={!critical.rows.length}
          title={critical.rows.length ? 'Bare-minimum must-dos' : 'No critical list for this case yet'}
        >
          Critical
          {critical.total > 0 && (
            <span className="teach-compare-tab-count">
              {critical.doneCount}/{critical.total}
            </span>
          )}
        </button>
      </div>

      {panelTab === 'critical' && critical.rows.length > 0 ? (
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
                  {row.why && (
                    <div className="teach-compare-critical-why teach-me-text-block selectable-text">
                      {renderChatMarkdown(row.why)}
                    </div>
                  )}
                </div>
                <span className={`teach-compare-critical-status${row.isDone ? ' done' : ''}`}>
                  {row.isDone ? 'Placed' : 'Must do'}
                </span>
              </li>
            ))}
          </ul>
          <p className="teach-compare-hint">
            Hard must-dos for this case — included in <strong>Print</strong> / <strong>Save</strong> exports.
          </p>
        </>
      ) : (
        <>
      <p className="teach-compare-next">
        Next: <strong>{nextLabel}</strong>
      </p>
      <div className="teach-compare-head">
        <span className="teach-compare-col teach-compare-col-flow">Flow</span>
        <span className="teach-compare-col teach-compare-col-label">Order</span>
        <span className="teach-compare-col">Yours</span>
        <span className="teach-compare-col teach-compare-col-badge">Status</span>
      </div>
      {whyError && <p className="teach-compare-why-error">{whyError}</p>}
      {flowTiers.map((tier) => {
        const collapsed = tierCollapsed[tier.id] ?? tier.defaultCollapsed;
        return (
          <section key={tier.id} className={`teach-compare-tier tier-${tier.id}`}>
            <button
              type="button"
              className="teach-compare-tier-head"
              onClick={() => toggleTier(tier.id)}
              aria-expanded={!collapsed}
            >
              <span className="teach-compare-tier-chevron" aria-hidden>
                {collapsed ? '▸' : '▾'}
              </span>
              <span className="teach-compare-tier-label">{tier.label}</span>
              <span className="teach-compare-tier-count">
                {tier.placedCount}/{tier.total}
              </span>
            </button>
            {!collapsed && (
              <>
                <p className="teach-compare-tier-hint">{tier.hint}</p>
                <ul
                  className="teach-compare-list teach-compare-list-tier"
                  aria-label={`${tier.label} orders`}
                >
                  {tier.rows.map((row) => renderRow(row))}
                </ul>
              </>
            )}
          </section>
        );
      })}
      {extras.length > 0 && (
        <>
          <p className="teach-compare-extra-title">Outside standard set</p>
          <ul className="teach-compare-list teach-compare-list-extra" aria-label="Extra orders">
            {extras.map((row) => renderRow(row, 'extra-', true))}
          </ul>
        </>
      )}
      <p className="teach-compare-hint">
        Collapse <strong>Misc</strong> to focus on emergent work — <strong>Critical</strong> tab is your bare-minimum checklist for export.
      </p>
        </>
      )}
    </div>
  );
}
