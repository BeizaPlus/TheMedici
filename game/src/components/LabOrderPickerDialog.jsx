import { useEffect, useMemo, useState } from 'react';
import {
  LAB_ORDER_NAMES,
  filterLabOrderNames,
} from '../data/labOrders.js';

export default function LabOrderPickerDialog({
  open,
  onClose,
  onApply,
  suggestedNames = [],
  busy = false,
}) {
  const suggested = useMemo(() => new Set(suggestedNames.map((n) => n.toLowerCase())), [suggestedNames]);
  const [selected, setSelected] = useState(() => new Set());
  const [filter, setFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredNames = useMemo(
    () => filterLabOrderNames(filter, LAB_ORDER_NAMES),
    [filter],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setFilter('');
    setShowSuggestions(false);
  }, [open, suggestedNames]);

  if (!open) return null;

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectSuggested = () => {
    setSelected(new Set(suggestedNames.filter((n) => LAB_ORDER_NAMES.includes(n))));
    setShowSuggestions(true);
  };

  const clearAll = () => setSelected(new Set());

  return (
    <div className="physical-exam-picker-backdrop" role="presentation" onClick={() => onClose?.()}>
      <div
        className="physical-exam-picker lab-order-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Lab orders"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="physical-exam-picker-head">
          <div>
            <p className="physical-exam-picker-kicker">CCS-style</p>
            <h2 className="physical-exam-picker-title">Labs</h2>
            <p className="physical-exam-picker-sub">
              Pick labs to order — use the search box instead of typing in the command bar.
            </p>
          </div>
          <button
            type="button"
            className="physical-exam-picker-close"
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="lab-order-picker-search-wrap">
          <input
            type="search"
            className="lab-order-picker-search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search labs…"
            aria-label="Search labs"
            autoFocus
          />
        </div>

        <div className="physical-exam-picker-actions">
          {suggestedNames.length > 0 && (
            <button type="button" className="btn-ghost btn-ghost-sm" onClick={selectSuggested}>
              Case suggestions
            </button>
          )}
          <button type="button" className="btn-ghost btn-ghost-sm" onClick={clearAll}>
            Clear
          </button>
        </div>

        <ul className="physical-exam-picker-list">
          {filteredNames.map((name) => {
            const checked = selected.has(name);
            const isSuggested = showSuggestions && suggested.has(name.toLowerCase());
            return (
              <li key={name}>
                <label className={`physical-exam-picker-row${checked ? ' is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(name)}
                    disabled={busy}
                  />
                  <span className="physical-exam-picker-label">{name}</span>
                  {isSuggested && <span className="physical-exam-picker-tag">In case stacks</span>}
                </label>
              </li>
            );
          })}
        </ul>

        {!filteredNames.length && (
          <p className="lab-order-picker-empty">No labs match your search.</p>
        )}

        <footer className="physical-exam-picker-foot">
          <button type="button" className="btn-ghost" onClick={() => onClose?.()} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || selected.size === 0}
            onClick={() => onApply?.([...selected])}
          >
            Order {selected.size || ''} lab{selected.size === 1 ? '' : 's'}
          </button>
        </footer>
      </div>
    </div>
  );
}
