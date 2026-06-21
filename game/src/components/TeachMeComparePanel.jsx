import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildBareEssentialsRows, groupTeachCompareRowsByTier, ORDER_TIER_META } from '../lib/caseBareEssentials.js';
import { getCaseDifferentials } from '../lib/caseDifferentials.js';
import { renderChatMarkdown } from '../lib/chatMessageFormat.jsx';
import { buildTeachCompareRows, teachCompareStatusLabel } from '../lib/teachMeCompare.js';
import { ATTENDING_STYLE_CHANGED } from '../lib/attendingStylePrefs.js';
import { fetchOrderWhy, clearFirstOpinionMemoryForCase } from '../lib/orderWhy.js';
import { LOCKED_SECOND_OPINION_DEPTH } from '../lib/secondOpinionPrefs.js';
import { FIRST_OPINION_DEPTH_EVENT, useFirstOpinionDepth } from './FirstOpinionDepthControl.jsx';
import { readCaseAloud, stopCaseReader } from '../lib/caseReader.js';
import { shouldAutoSpeakAttending } from '../lib/patientSpeech.js';
import { IconRefresh, IconStethoscopeSecond, IconVolume2 } from './sceneToolbar/SceneToolbarIcons.jsx';

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

  const flowTiers = useMemo(
    () => groupTeachCompareRowsByTier({ rows, caseData, interventions }),
    [rows, caseData, interventions],
  );

  const [tierOpen, setTierOpen] = useState(() => ({
    general: !ORDER_TIER_META.general.defaultCollapsed,
    critical: !ORDER_TIER_META.critical.defaultCollapsed,
    misc: !ORDER_TIER_META.misc.defaultCollapsed,
  }));

  const differentials = useMemo(() => getCaseDifferentials(caseData), [caseData]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [whyByOrder, setWhyByOrder] = useState({});
  const [peerByOrder, setPeerByOrder] = useState({});
  const [whyLoading, setWhyLoading] = useState(null);
  const [peerLoading, setPeerLoading] = useState(null);
  const [whyError, setWhyError] = useState('');
  const [readState, setReadState] = useState('idle');
  const [firstOpinionDepth] = useFirstOpinionDepth();
  const panelRef = useRef(null);
  const autoReadOrderIdsRef = useRef(new Set());

  const primaryKey = useCallback(
    (orderId) => `${orderId}__d${firstOpinionDepth}`,
    [firstOpinionDepth],
  );
  const peerKeyFor = useCallback(
    (orderId) => `${orderId}__d${LOCKED_SECOND_OPINION_DEPTH}`,
    [],
  );

  const patientAnchorDoneFor = useCallback(
    (orderId) => Object.keys(whyByOrder).some((k) => k !== primaryKey(orderId)),
    [whyByOrder, primaryKey],
  );

  const focusedRow = useMemo(
    () => rows.find((r) => r.id === teachFocusId) || null,
    [rows, teachFocusId],
  );

  useEffect(() => {
    setWhyByOrder({});
    setPeerByOrder({});
    setWhyError('');
    setWhyLoading(null);
    setPeerLoading(null);
    autoReadOrderIdsRef.current = new Set();
    setTierOpen({
      general: !ORDER_TIER_META.general.defaultCollapsed,
      critical: !ORDER_TIER_META.critical.defaultCollapsed,
      misc: !ORDER_TIER_META.misc.defaultCollapsed,
    });
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [caseId]);

  useEffect(() => {
    const onDepth = () => {
      if (caseId) clearFirstOpinionMemoryForCase(caseId);
      setWhyByOrder({});
      autoReadOrderIdsRef.current = new Set();
    };
    window.addEventListener(FIRST_OPINION_DEPTH_EVENT, onDepth);
    window.addEventListener(ATTENDING_STYLE_CHANGED, onDepth);
    return () => {
      window.removeEventListener(FIRST_OPINION_DEPTH_EVENT, onDepth);
      window.removeEventListener(ATTENDING_STYLE_CHANGED, onDepth);
    };
  }, [caseId]);

  useEffect(() => {
    if (!teachFocusId || !caseId || !focusedRow) return undefined;

    const playbookWhy = String(focusedRow.why || '').trim();
    const hasPlaybook =
      playbookWhy && playbookWhy !== 'No rationale available yet.';
    const pk = primaryKey(teachFocusId);

    if (whyByOrder[pk]) return undefined;

    let cancelled = false;
    setWhyLoading(teachFocusId);
    setWhyError('');
    fetchOrderWhy({
      caseId,
      orderId: teachFocusId,
      orderLabel: focusedRow.label,
      caseData,
      playbookWhy: focusedRow.why,
      firstOpinionDepth,
      patientAnchorDone: patientAnchorDoneFor(teachFocusId),
    })
      .then(({ why }) => {
        if (!cancelled && String(why || '').trim()) {
          setWhyByOrder((prev) => ({ ...prev, [pk]: why }));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (hasPlaybook && firstOpinionDepth === 0) {
            setWhyByOrder((prev) => ({ ...prev, [pk]: playbookWhy }));
          } else {
            setWhyError(String(e.message || e));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setWhyLoading(null);
      });

    return () => {
      cancelled = true;
    };
  }, [teachFocusId, caseId, caseData, focusedRow, whyByOrder, firstOpinionDepth, primaryKey, patientAnchorDoneFor]);

  useEffect(() => () => stopCaseReader(), []);

  const primaryWhy =
    (teachFocusId && whyByOrder[primaryKey(teachFocusId)]) || '';
  const peerKey = teachFocusId ? peerKeyFor(teachFocusId) : '';
  const peerWhy = (peerKey && peerByOrder[peerKey]) || '';

  const playAttendingVoice = useCallback(
    async (orderId, text, { force = false } = {}) => {
      const trimmed = String(text || '').trim();
      if (!orderId || !caseId || !trimmed) return;
      if (!force && autoReadOrderIdsRef.current.has(orderId)) return;
      autoReadOrderIdsRef.current.add(orderId);
      await readCaseAloud({
        caseId,
        section: 'teach-why',
        text: trimmed,
        onState: setReadState,
      });
    },
    [caseId],
  );

  useEffect(() => {
    if (!shouldAutoSpeakAttending()) return undefined;
    if (!teachFocusId || !caseId || whyLoading === teachFocusId) return undefined;
    const text = String(whyByOrder[primaryKey(teachFocusId)] || '').trim();
    if (!text || text === 'No rationale available yet.') return undefined;
    let cancelled = false;
    void playAttendingVoice(teachFocusId, text).then(() => {
      if (cancelled) stopCaseReader();
    });
    return () => {
      cancelled = true;
    };
  }, [teachFocusId, caseId, whyByOrder, whyLoading, playAttendingVoice, primaryKey]);

  const handleListen = useCallback(
    async (event, row) => {
      event.stopPropagation();
      if (!row || !caseId) return;
      const pk = primaryKey(row.id);
      const rowPeerKey = peerKeyFor(row.id);
      const text =
        peerByOrder[rowPeerKey] ||
        whyByOrder[pk] ||
        row.why ||
        row.label;
      if (!String(text).trim()) return;
      if (whyLoading === row.id) return;
      if (!whyByOrder[pk] && !row.why) {
        setWhyLoading(row.id);
        try {
          const { why } = await fetchOrderWhy({
            caseId,
            orderId: row.id,
            orderLabel: row.label,
            caseData,
            playbookWhy: row.why,
            firstOpinionDepth,
            patientAnchorDone: patientAnchorDoneFor(row.id),
          });
          setWhyByOrder((prev) => ({ ...prev, [pk]: why }));
          await playAttendingVoice(row.id, why, { force: true });
        } catch (e) {
          setWhyError(String(e.message || e));
        } finally {
          setWhyLoading(null);
        }
        return;
      }
      await playAttendingVoice(row.id, text, { force: true });
    },
    [caseId, caseData, peerByOrder, whyByOrder, whyLoading, firstOpinionDepth, playAttendingVoice, primaryKey, peerKeyFor, patientAnchorDoneFor],
  );

  const handlePeer = useCallback(
    async (event, row) => {
      event?.stopPropagation?.();
      if (!row || !caseId || peerLoading === row.id) return;
      const pKey = peerKeyFor(row.id);
      const alreadyFocused = teachFocusId === row.id;
      if (!alreadyFocused) {
        (onEnsureFocus || onFocusStep)?.(row.id);
      }
      if (peerByOrder[pKey]) {
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
        setPeerByOrder((prev) => ({ ...prev, [pKey]: why }));
      } catch (e) {
        setWhyError(String(e.message || e));
      } finally {
        setPeerLoading(null);
      }
    },
    [caseId, caseData, onEnsureFocus, onFocusStep, peerByOrder, peerLoading, teachFocusId, peerKeyFor],
  );

  const refreshFirstOpinion = useCallback(
    async (row) => {
      if (!row || !caseId || whyLoading === row.id) return;
      const pk = primaryKey(row.id);
      setWhyLoading(row.id);
      setWhyError('');
      setWhyByOrder((prev) => {
        const next = { ...prev };
        delete next[pk];
        return next;
      });
      try {
        const { why } = await fetchOrderWhy({
          caseId,
          orderId: row.id,
          orderLabel: row.label,
          caseData,
          playbookWhy: row.why,
          firstOpinionDepth,
          forceRefresh: true,
          patientAnchorDone: patientAnchorDoneFor(row.id),
        });
        setWhyByOrder((prev) => ({ ...prev, [pk]: why }));
        await playAttendingVoice(row.id, why, { force: true });
      } catch (e) {
        setWhyError(String(e.message || e));
      } finally {
        setWhyLoading(null);
      }
    },
    [caseId, caseData, whyLoading, playAttendingVoice, firstOpinionDepth, primaryKey, patientAnchorDoneFor],
  );

  const refreshSecondOpinion = useCallback(
    async (row) => {
      if (!row || !caseId || peerLoading === row.id) return;
      const pKey = peerKeyFor(row.id);
      setPeerLoading(row.id);
      setWhyError('');
      setPeerByOrder((prev) => {
        const next = { ...prev };
        delete next[pKey];
        return next;
      });
      try {
        const { why } = await fetchOrderWhy({
          caseId,
          orderId: row.id,
          orderLabel: row.label,
          caseData,
          playbookWhy: row.why,
          peerReview: true,
          forceRefresh: true,
        });
        setPeerByOrder((prev) => ({ ...prev, [pKey]: why }));
      } catch (e) {
        setWhyError(String(e.message || e));
      } finally {
        setPeerLoading(null);
      }
    },
    [caseId, caseData, peerLoading, peerKeyFor],
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
                  className={`teach-compare-icon-btn${peerWhy ? ' is-active' : ''}`}
                  title="Second opinion — brief peer attending punch"
                  aria-label="Second opinion"
                  disabled={peerLoading === row.id}
                  onClick={(e) => void handlePeer(e, row)}
                >
                  <IconStethoscopeSecond />
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
                <div className="teach-compare-rationale-head">
                  <span className="teach-compare-rationale-head-label">Attending</span>
                  <button
                    type="button"
                    className="teach-compare-icon-btn teach-compare-refresh-btn"
                    title="Regenerate attending rationale (uses case context + DeepSeek when online)"
                    aria-label="Refresh attending rationale"
                    disabled={whyLoading === row.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void refreshFirstOpinion(row);
                    }}
                  >
                    <IconRefresh />
                  </button>
                </div>
                {renderChatMarkdown(primaryWhy)}
              </div>
            )}
            {peerLoading === row.id && !peerWhy && (
              <p className="teach-compare-rationale-loading">Loading second opinion…</p>
            )}
            {peerWhy && peerWhy !== primaryWhy && (
              <div className="teach-compare-rationale-peer">
                <div className="teach-compare-rationale-head">
                  <p className="teach-compare-rationale-peer-label">Second opinion</p>
                  <button
                    type="button"
                    className="teach-compare-icon-btn teach-compare-refresh-btn"
                    title="Regenerate second opinion (real-time when online)"
                    aria-label="Refresh second opinion"
                    disabled={peerLoading === row.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void refreshSecondOpinion(row);
                    }}
                  >
                    <IconRefresh />
                  </button>
                </div>
                <div className="teach-me-text-block second-opinion-body selectable-text">
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
    <div
      ref={panelRef}
      className={`teach-compare-panel${compact ? ' teach-compare-panel--compact' : ''}`}
    >
      {rows.length > 0 && (
        <section className="teach-compare-flow" aria-label="Standard flow sequence">
          <div className="teach-compare-head" aria-hidden>
            <span className="teach-compare-col-flow">#</span>
            <span className="teach-compare-col-label">Order</span>
            <span className="teach-compare-col-yours">Yours</span>
            <span className="teach-compare-col-badge">Status</span>
          </div>
          {flowTiers.map((tier) => (
            <section key={tier.id} className={`teach-compare-tier tier-${tier.id}`}>
              <button
                type="button"
                className="teach-compare-tier-head"
                onClick={() => setTierOpen((prev) => ({ ...prev, [tier.id]: !prev[tier.id] }))}
                aria-expanded={Boolean(tierOpen[tier.id])}
              >
                <span className="teach-compare-tier-chevron" aria-hidden>
                  {tierOpen[tier.id] ? '▾' : '▸'}
                </span>
                <span className="teach-compare-tier-label">{tier.label}</span>
                <span className="teach-compare-tier-count">
                  {tier.placedCount}/{tier.total}
                </span>
                {tier.hint ? (
                  <span className="teach-compare-tier-hint">{tier.hint}</span>
                ) : null}
              </button>
              {tierOpen[tier.id] && (
                <ul className="teach-compare-list teach-compare-list-tier">
                  {tier.rows.map(renderRow)}
                </ul>
              )}
            </section>
          ))}
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
