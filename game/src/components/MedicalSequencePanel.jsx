import { useCallback, useEffect, useState } from 'react';
import { fetchMedicalSequence } from '../lib/medicalSequence.js';

function BeatCard({ beat, index }) {
  return (
    <article className="med-seq-beat">
      <span className="med-seq-beat-num">{index + 1}</span>
      <h4 className="med-seq-beat-title">{beat.title}</h4>
      <p className="med-seq-beat-caption">{beat.caption}</p>
      {beat.visualHint && (
        <p className="med-seq-beat-visual" title="Still / image generation hint">
          {beat.visualHint}
        </p>
      )}
      {beat.tiedOrderLabel && (
        <p className="med-seq-beat-order">
          Order: <strong>{beat.tiedOrderLabel}</strong>
        </p>
      )}
    </article>
  );
}

function BeatRail({ label, beats }) {
  if (!beats?.length) return null;
  return (
    <section className="med-seq-rail">
      <h3 className="med-seq-rail-title">{label}</h3>
      <div className="med-seq-rail-track">
        {beats.map((beat, i) => (
          <BeatCard key={beat.id || `${label}-${i}`} beat={beat} index={i} />
        ))}
      </div>
    </section>
  );
}

const BRANCH_TABS = [
  { id: 'prequel', label: 'Prequel — at home' },
  { id: 'missedPath', label: 'If orders missed' },
  { id: 'savedPath', label: 'If stabilized in time' },
];

export default function MedicalSequencePanel({ open, onClose, caseData, portraitNote = '' }) {
  const [branch, setBranch] = useState('missedPath');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sequence, setSequence] = useState(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!caseData?.id) return;
      setLoading(true);
      setError('');
      try {
        const data = await fetchMedicalSequence({ caseData, portraitNote, refresh });
        setSequence(data);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    },
    [caseData, portraitNote],
  );

  useEffect(() => {
    if (!open) {
      setSequence(null);
      setError('');
      return;
    }
    void load(false);
  }, [open, caseData?.id, load]);

  if (!open) return null;

  const activeBeats = sequence?.[branch] || [];

  return (
    <div className="med-seq-overlay" role="dialog" aria-label="Medical sequence storyboard">
      <div className="med-seq-panel">
        <header className="med-seq-head">
          <div>
            <p className="med-seq-kicker">Medical sequence · Case {caseData?.id}</p>
            <h2 className="med-seq-title">{caseData?.title || 'Storyboard'}</h2>
            {sequence?.patientLock && (
              <p className="med-seq-lock">Likeness lock: {sequence.patientLock}</p>
            )}
          </div>
          <div className="med-seq-head-actions">
            <button type="button" className="med-seq-btn" onClick={() => void load(true)} disabled={loading}>
              {loading ? 'Building…' : 'Refresh'}
            </button>
            <button type="button" className="med-seq-btn med-seq-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {sequence?.realWorldEcho?.name && (
          <p className="med-seq-rw">
            Real world echo: <strong>{sequence.realWorldEcho.name}</strong> —{' '}
            {sequence.realWorldEcho.summary}
          </p>
        )}

        <div className="med-seq-tabs" role="tablist">
          {BRANCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`med-seq-tab${branch === tab.id ? ' is-active' : ''}`}
              aria-selected={branch === tab.id}
              onClick={() => setBranch(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="med-seq-error">{error}</p>}
        {loading && !sequence && <p className="med-seq-loading">Pulling attendant context…</p>}

        {!loading && activeBeats.length > 0 && (
          <BeatRail
            label={BRANCH_TABS.find((t) => t.id === branch)?.label}
            beats={activeBeats}
          />
        )}

        {sequence?.source && (
          <p className="med-seq-foot">
            Source: {sequence.source} · {sequence.orders?.length || 0} orders from standard flow
          </p>
        )}
      </div>
    </div>
  );
}
