import { useEffect, useMemo, useState } from 'react';
import { CCS_PHYSICAL_EXAM_SECTIONS } from '../data/physicalExamSections.js';

export default function PhysicalExamPickerDialog({
  open,
  onClose,
  onApply,
  suggestedIds = [],
  busy = false,
}) {
  const suggested = useMemo(() => new Set(suggestedIds), [suggestedIds]);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(suggestedIds));
  }, [open, suggestedIds]);

  if (!open) return null;

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(CCS_PHYSICAL_EXAM_SECTIONS.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());
  const selectSuggested = () => setSelected(new Set(suggestedIds));

  return (
    <div
      className="physical-exam-picker-backdrop"
      role="presentation"
      onClick={() => onClose?.()}
    >
      <div
        className="physical-exam-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Physical exam sections"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="physical-exam-picker-head">
          <div>
            <p className="physical-exam-picker-kicker">CCS-style</p>
            <h2 className="physical-exam-picker-title">Physical exam</h2>
            <p className="physical-exam-picker-sub">
              Select sections to order — same workflow as typing <code>physical</code> in CCS.
            </p>
          </div>
          <button type="button" className="physical-exam-picker-close" onClick={() => onClose?.()} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="physical-exam-picker-actions">
          <button type="button" className="btn-ghost btn-ghost-sm" onClick={selectSuggested}>
            Case suggestions
          </button>
          <button type="button" className="btn-ghost btn-ghost-sm" onClick={selectAll}>
            Select all
          </button>
          <button type="button" className="btn-ghost btn-ghost-sm" onClick={clearAll}>
            Clear
          </button>
        </div>

        <ul className="physical-exam-picker-list">
          {CCS_PHYSICAL_EXAM_SECTIONS.map((section) => {
            const checked = selected.has(section.id);
            const isSuggested = suggested.has(section.id);
            return (
              <li key={section.id}>
                <label className={`physical-exam-picker-row${checked ? ' is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(section.id)}
                    disabled={busy}
                  />
                  <span className="physical-exam-picker-label">{section.orderLabel}</span>
                  {isSuggested && <span className="physical-exam-picker-tag">In case stacks</span>}
                </label>
              </li>
            );
          })}
        </ul>

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
            Place {selected.size || ''} exam{selected.size === 1 ? '' : 's'}
          </button>
        </footer>
      </div>
    </div>
  );
}
