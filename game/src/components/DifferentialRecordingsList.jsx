import ExclusiveAudio from './ExclusiveAudio.jsx';
import { useDifferentialCaseRecordings } from '../hooks/useDifferentialCaseRecordings.js';
import { localRecordingKey } from '../lib/differentialVoiceStorage.js';

export default function DifferentialRecordingsList({ caseId, version = 0 }) {
  const { recordings: rows, resolveSrc, blobsReady } = useDifferentialCaseRecordings(caseId, version);

  if (!rows.length) return null;

  return (
    <details className="diff-recordings" aria-label="Saved voice recordings for this case">
      <summary className="diff-recordings-summary">
        Voice notes · {rows.length}
      </summary>
      <ul className="diff-recordings-list">
        {rows.map((rec) => {
          const localKey = localRecordingKey(rec);
          const src = resolveSrc(rec);
          const secs = Math.max(1, Math.round((rec.durationMs || 0) / 1000));
          const waitingForBlob = rec.local && !src && !blobsReady;

          return (
            <li key={rec.id || localKey} className="diff-recording-item">
              <span className="diff-recording-meta">
                #{rec.slot || '?'} · {secs}s
                {rec.transcript
                  ? ` · ${rec.transcript.slice(0, 40)}${rec.transcript.length > 40 ? '…' : ''}`
                  : ''}
              </span>
              {src ? (
                <ExclusiveAudio src={src} />
              ) : waitingForBlob ? (
                <span className="diff-recording-loading">Loading…</span>
              ) : (
                <span className="diff-recording-missing">Couldn&apos;t load — record again</span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
