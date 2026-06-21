import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import { getAllGameCases, getCategories, getCasesInCategory, getCaseById } from '../data/useCcsCatalog.js';
import { getCaseRecord, getCompletionStats, pickShuffleCaseId } from '../data/caseProgress.js';
import { IconShuffle } from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseProgressTag from './CaseProgressTag.jsx';
import CaseAttemptRadio from './CaseAttemptRadio.jsx';
import { isCaseAttempted } from '../data/caseProgress.js';
import CaseReadyTag from './CaseReadyTag.jsx';
import { hasCaseSpecificPlaybook } from '../data/resolvePlaybook.js';
import {
  getStackTestingCount,
  getStackTestingOrderRange,
} from '../lib/caseReadyPractice.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import {
  formatCaseIdLabel,
  learnerFacingCaseTitle,
  shouldShowCaseIds,
} from '../lib/learningMode.js';
import {
  initialBrowseCategoryId,
  readCaseBrowseContext,
  rememberCaseBrowse,
  writeCaseBrowseContext,
} from '../lib/caseBrowseContext.js';
import { STORAGE } from '../lib/storageKeys.js';
import { getAllowedCaseIds, readAudienceProfile } from '../lib/audienceProfile.js';
import {
  batchLabel,
  buildStudyBatches,
  isUberCatalogId,
} from '../lib/caseStudyBatches.js';
import {
  CATALOG_LANES,
  categoryHasLaneTabs,
} from '../lib/caseCatalogLanes.js';

const PICKER_WIDTH = 400;

function readPickerPos() {
  try {
    const raw = localStorage.getItem(STORAGE.briefingPickerPos);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return {
    x: Math.max(12, window.innerWidth - PICKER_WIDTH - 24),
    y: 72,
  };
}

function writePickerPos(pos) {
  try {
    localStorage.setItem(STORAGE.briefingPickerPos, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export default function BriefingCasePicker({ currentCaseId, onSelectCase, onPreviewCase }) {
  const categories = getCategories();
  const audienceProfile = useMemo(() => readAudienceProfile(), []);
  const allCases = useMemo(() => getAllGameCases(), []);
  const allowedCaseIds = useMemo(
    () => getAllowedCaseIds(allCases, audienceProfile || { level: 'advanced', condition: 'diabetes' }),
    [allCases, audienceProfile],
  );
  const allowedSet = useMemo(() => new Set(allowedCaseIds), [allowedCaseIds]);
  const visibleAllCases = useMemo(() => allCases.filter((c) => allowedSet.has(c.id)), [allCases, allowedSet]);
  const visibleCategories = useMemo(() => {
    const base = categories
      .map((cat) => ({
        ...cat,
        caseIds: (cat.caseIds || []).filter((id) => allowedSet.has(id)),
      }))
      .filter((cat) => cat.caseIds.length > 0);
    return base;
  }, [categories, allowedSet]);
  const pickerRef = useRef(null);
  const dragRef = useRef({ dx: 0, dy: 0 });
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(readPickerPos);
  const [dragging, setDragging] = useState(false);
  const [categoryId, setCategoryId] = useState(
    () => initialBrowseCategoryId(visibleCategories[0]?.id) || visibleCategories[0]?.id,
  );
  const [batchIndex, setBatchIndex] = useState(() => {
    const ctx = readCaseBrowseContext();
    return typeof ctx?.batchIndex === 'number' ? ctx.batchIndex : 0;
  });
  const [catalogLaneTab, setCatalogLaneTab] = useState(() => {
    const ctx = readCaseBrowseContext();
    return ctx?.catalogLane === 'extended' ? 'extended' : 'core';
  });
  const [query, setQuery] = useState('');
  const [checkVersion, setCheckVersion] = useState(0);

  useEffect(() => {
    const cat = visibleCategories.find((c) => c.caseIds?.includes(currentCaseId));
    if (cat) {
      setCategoryId(cat.id);
      writeCaseBrowseContext({ categoryId: cat.id, caseId: String(currentCaseId) });
    }
  }, [currentCaseId, visibleCategories]);

  const laneTabsActive = categoryHasLaneTabs(categoryId);

  const casesInCategory = useMemo(
    () =>
      categoryId
        ? getCasesInCategory(categoryId, laneTabsActive ? { lane: catalogLaneTab } : {})
            .filter((c) => allowedSet.has(c.id))
        : [],
    [categoryId, allowedSet, catalogLaneTab, laneTabsActive],
  );

  const studyBatches = useMemo(() => buildStudyBatches(casesInCategory), [casesInCategory]);

  useEffect(() => {
    if (batchIndex >= studyBatches.length) {
      setBatchIndex(0);
    }
  }, [batchIndex, studyBatches.length]);

  const activeBatch = studyBatches[batchIndex] || studyBatches[0] || null;

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = q
      ? visibleAllCases.filter((c) => !isUberCatalogId(c.id))
      : activeBatch?.cases || casesInCategory;
    if (!q) return pool;
    return pool.filter((c) => {
      const num = String(c.ccsNumber || '');
      return (
        c.title.toLowerCase().includes(q) ||
        num.includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.chief_complaint || '').toLowerCase().includes(q) ||
        (c.diagnosis || '').toLowerCase().includes(q)
      );
    });
  }, [visibleAllCases, casesInCategory, activeBatch, query]);

  const activeCategory = visibleCategories.find((c) => c.id === categoryId);
  const overallStats = useMemo(() => getCompletionStats(allCases.length), [allCases.length]);

  const clampPos = useCallback((x, y) => {
    const width = pickerRef.current?.offsetWidth || PICKER_WIDTH;
    const height = pickerRef.current?.offsetHeight || 420;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - height - 8)),
    };
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const next = clampPos(
        event.clientX - dragRef.current.dx,
        event.clientY - dragRef.current.dy,
      );
      setPos(next);
    };

    const onUp = () => {
      setDragging(false);
      setPos((current) => {
        writePickerPos(current);
        return current;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, clampPos]);

  useEffect(() => {
    const onResize = () => {
      setPos((current) => {
        const next = clampPos(current.x, current.y);
        writePickerPos(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos]);

  const onDragStart = (event) => {
    if (event.button !== 0) return;
    const rect = pickerRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    dragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    setDragging(true);
  };

  const shuffleCase = useCallback(
    (scope) => {
      const categoryPool = filteredCases.length ? filteredCases : casesInCategory;
      const pool =
        scope === 'all'
          ? visibleAllCases.filter((c) => !isUberCatalogId(c.id))
          : categoryPool;
      if (!pool.length) return;
      const id = pickShuffleCaseId(
        pool.map((c) => c.id),
        { excludeId: currentCaseId, preferUnattempted: true },
      );
      const picked = pool.find((c) => c.id === id) || pool[0];
      if (picked) onSelectCase(picked);
    },
    [filteredCases, casesInCategory, visibleAllCases, currentCaseId, onSelectCase],
  );

  return (
    <aside
      ref={pickerRef}
      className={`briefing-picker ${open ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      aria-label="Browse cases"
    >
      <div className="briefing-picker-head">
        <div
          className="briefing-picker-drag"
          onPointerDown={onDragStart}
          title="Drag to reposition"
          role="presentation"
        >
          <span className="briefing-picker-grip" aria-hidden>
            ⋮⋮
          </span>
          <span>Cases</span>
          <span className="briefing-picker-completion" title="Cases mastered / total">
            {overallStats.completed}/{overallStats.total}
          </span>
        </div>
        <button
          type="button"
          className="briefing-picker-collapse"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse case list' : 'Expand case list'}
        >
          {open ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
        </button>
      </div>

      {open && (
        <div className="briefing-picker-panel">
          <label className="briefing-picker-field">
            <span className="briefing-picker-label">Category</span>
            <select
              className="briefing-picker-select"
              value={categoryId || ''}
              onChange={(e) => {
                const next = e.target.value;
                setCategoryId(next);
                setBatchIndex(0);
                setCatalogLaneTab('core');
                writeCaseBrowseContext({ categoryId: next, batchIndex: 0, catalogLane: 'core' });
                setQuery('');
              }}
            >
              {visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} ({cat.caseIds.length})
                </option>
              ))}
            </select>
          </label>

          <label className="briefing-picker-field briefing-picker-search">
            <span className="briefing-picker-label">Search</span>
            <span className="briefing-picker-search-wrap">
              <FiSearch className="briefing-picker-search-icon" aria-hidden />
              <input
                type="search"
                className="briefing-picker-input"
                placeholder="Search by name or case #…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
          </label>

          <div className="briefing-picker-actions">
            <button
              type="button"
              className="briefing-shuffle-btn briefing-shuffle-btn--category"
              onClick={() => shuffleCase('category')}
              disabled={!(filteredCases.length || casesInCategory.length)}
              title="Random unattempted case in this category (or search results)"
              aria-label="Shuffle category — prefer cases you have not attempted"
            >
              <IconShuffle />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              className="briefing-shuffle-btn briefing-shuffle-btn--global"
              onClick={() => shuffleCase('all')}
              disabled={!visibleAllCases.length}
              title="Random unattempted case across the full library"
              aria-label="Shuffle all — prefer cases you have not attempted"
            >
              <IconShuffle />
              <span>Shuffle all</span>
            </button>
          </div>

          {laneTabsActive && !query.trim() && (
            <div className="briefing-picker-lanes" role="tablist" aria-label="Case source lane">
              {Object.values(CATALOG_LANES).map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  role="tab"
                  className={`briefing-picker-lane-chip${catalogLaneTab === lane.id ? ' active' : ''}`}
                  aria-selected={catalogLaneTab === lane.id}
                  aria-label={lane.ariaLabel}
                  onClick={() => {
                    setCatalogLaneTab(lane.id);
                    setBatchIndex(0);
                    writeCaseBrowseContext({ categoryId, batchIndex: 0, catalogLane: lane.id });
                  }}
                >
                  {lane.label}
                </button>
              ))}
            </div>
          )}

          {!query.trim() && categoryId !== 'Uber Cases' && studyBatches.length > 1 && (
            <div className="briefing-picker-batches" role="tablist" aria-label="Study batches">
              {studyBatches.map((batch) => (
                <button
                  key={batch.batchIndex}
                  type="button"
                  role="tab"
                  className={`briefing-picker-batch-chip${batch.batchIndex === batchIndex ? ' active' : ''}`}
                  aria-selected={batch.batchIndex === batchIndex}
                  onClick={() => {
                    setBatchIndex(batch.batchIndex);
                    writeCaseBrowseContext({ categoryId, batchIndex: batch.batchIndex });
                  }}
                  title={batchLabel(batch)}
                >
                  {batch.batchNumber}
                </button>
              ))}
            </div>
          )}

          <p className="briefing-picker-meta">
            {query.trim()
              ? `${filteredCases.length} match${filteredCases.length === 1 ? '' : 'es'}`
              : activeCategory && activeBatch
                ? studyBatches.length > 1
                  ? `${activeBatch.cases.length} in batch ${activeBatch.batchNumber} of ${activeBatch.totalBatches} · ${activeBatch.theme} · ${activeCategory.label}`
                  : laneTabsActive
                    ? `${filteredCases.length} in ${activeCategory.label} · ${CATALOG_LANES[catalogLaneTab]?.label || 'Core'}`
                    : `${filteredCases.length} in ${activeCategory.label}`
                : ''}
          </p>
          <p className="briefing-picker-shuffle-hint">
            Shuffle prefers cases you have not attempted. Revisit finished cases from the timeline.
          </p>

          <div className="briefing-picker-list" role="listbox" aria-label="Cases in category">
            {filteredCases.length === 0 && (
              <p className="briefing-picker-empty">
                {catalogLaneTab === 'extended'
                  ? 'Scenario cases are importing from the archive — run inventory-uword-trauma-tox, then promote.'
                  : 'No cases match your search.'}
              </p>
            )}
            {filteredCases.map((c) => {
              const rec = getCaseRecord(c.id);
              const attempted = isCaseAttempted(c.id);
              void checkVersion;
              const selected = c.id === currentCaseId;
              const rowState = rec?.completed ? 'done' : rec?.plays ? 'attempted' : '';
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`briefing-picker-row ${selected ? 'selected' : ''} ${rowState} ${attempted ? 'study-done' : ''}`}
                  onClick={() => {
                    rememberCaseBrowse(c.id, { categoryId, entry: 'briefing' });
                    onSelectCase(c);
                  }}
                  onMouseEnter={() => onPreviewCase?.(c)}
                  onMouseLeave={() => onPreviewCase?.(null)}
                  onFocus={() => onPreviewCase?.(c)}
                  onBlur={() => onPreviewCase?.(null)}
                  title={`Switch to ${learnerFacingCaseTitle(c)}`}
                >
                  <CaseAttemptRadio caseId={c.id} onChange={() => setCheckVersion((v) => v + 1)} />
                  {shouldShowCaseIds() && (
                    <span className="briefing-picker-num">#{c.ccsNumber}</span>
                  )}
                  <span className="briefing-picker-name" title={learnerFacingCaseTitle(c)}>
                    {learnerFacingCaseTitle(c)}
                    {query.trim() && c.category ? (
                      <span className="briefing-picker-cat"> · {c.category}</span>
                    ) : null}
                  </span>
                  <span className="briefing-picker-status">
                    {hasCaseSpecificPlaybook(c.id) && <CaseReadyTag compact />}
                    {!rec?.plays && <CaseProgressTag record={rec} showNew />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
