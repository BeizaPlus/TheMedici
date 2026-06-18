import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import { getAllGameCases, getCategories, getCasesInCategory, getCaseById } from '../data/useCcsCatalog.js';
import { getCaseRecord, getCompletionStats, pickRandomId } from '../data/caseProgress.js';
import { IconShuffle } from './sceneToolbar/SceneToolbarIcons.jsx';
import CaseProgressTag from './CaseProgressTag.jsx';
import CaseAttemptRadio from './CaseAttemptRadio.jsx';
import { isCaseAttempted } from '../data/caseProgress.js';
import CaseReadyTag from './CaseReadyTag.jsx';
import { hasCaseSpecificPlaybook } from '../data/resolvePlaybook.js';
import {
  getReadyPracticeCases,
  getReadyPracticeCount,
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
  const [query, setQuery] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);
  const [checkVersion, setCheckVersion] = useState(0);
  const readyCount = getReadyPracticeCount();
  const readyCases = useMemo(() => getReadyPracticeCases(allCases), [allCases]);

  useEffect(() => {
    const cat = visibleCategories.find((c) => c.caseIds?.includes(currentCaseId));
    if (cat) {
      setCategoryId(cat.id);
      writeCaseBrowseContext({ categoryId: cat.id, caseId: String(currentCaseId) });
    }
  }, [currentCaseId, visibleCategories]);

  const casesInCategory = useMemo(
    () =>
      categoryId
        ? getCasesInCategory(categoryId).filter((c) => allowedSet.has(c.id))
        : [],
    [categoryId, allowedSet],
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
    let pool;
    if (readyOnly) {
      pool = readyCases.filter((c) => allowedSet.has(c.id));
    } else if (q) {
      pool = visibleAllCases.filter((c) => !isUberCatalogId(c.id));
    } else {
      pool = activeBatch?.cases || casesInCategory;
    }
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
  }, [visibleAllCases, casesInCategory, activeBatch, query, readyOnly, readyCases, allowedSet]);

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

  const shuffleCase = useCallback(() => {
    const pool = filteredCases.length ? filteredCases : visibleAllCases;
    if (!pool.length) return;
    let candidates = pool;
    if (pool.length > 1 && currentCaseId) {
      const others = pool.filter((c) => c.id !== currentCaseId);
      if (others.length) candidates = others;
    }
    const id = pickRandomId(candidates.map((c) => c.id));
    const picked = candidates.find((c) => c.id === id) || candidates[0];
    if (picked) onSelectCase(picked);
  }, [filteredCases, visibleAllCases, currentCaseId, onSelectCase]);

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
                writeCaseBrowseContext({ categoryId: next, batchIndex: 0 });
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
              className={readyOnly ? 'briefing-ready-filter active' : 'briefing-ready-filter'}
              onClick={() => {
                setReadyOnly((v) => !v);
                setQuery('');
              }}
              aria-pressed={readyOnly}
            >
              Ready to practice ({readyCount})
            </button>
            <button
              type="button"
              className="briefing-shuffle-btn"
              onClick={shuffleCase}
              disabled={!(filteredCases.length || visibleAllCases.length)}
              title="Pick a random case from the current list"
              aria-label="Shuffle — random case"
            >
              <IconShuffle />
              <span>Shuffle</span>
            </button>
          </div>

          {!readyOnly && !query.trim() && categoryId !== 'Uber Cases' && studyBatches.length > 1 && (
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
            {readyOnly
              ? `${filteredCases.length} ready case${filteredCases.length === 1 ? '' : 's'}`
              : query.trim()
                ? `${filteredCases.length} match${filteredCases.length === 1 ? '' : 'es'}`
                : activeCategory && activeBatch
                  ? studyBatches.length > 1
                    ? `${activeBatch.cases.length} in batch ${activeBatch.batchNumber} of ${activeBatch.totalBatches} · ${activeBatch.theme} · ${activeCategory.label}`
                    : `${filteredCases.length} in ${activeCategory.label}`
                  : ''}
          </p>

          <div className="briefing-picker-list" role="listbox" aria-label="Cases in category">
            {filteredCases.length === 0 && (
              <p className="briefing-picker-empty">No cases match your search.</p>
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
