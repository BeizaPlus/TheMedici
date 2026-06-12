import { useMemo } from 'react';
import ExclusiveAudio from './ExclusiveAudio.jsx';
import { useDifferentialCaseRecordings } from '../hooks/useDifferentialCaseRecordings.js';
import {
  findRecordingForAttempt,
  listLocalDifferentialRecordings,
  localRecordingKey,
} from '../lib/differentialVoiceStorage.js';

function formatShortAt(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDelta(delta) {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

function RecordingPlayback({ recording, resolveSrc, blobsReady, label }) {
  const src = recording ? resolveSrc(recording) : '';
  const waitingForBlob = recording?.local && !src && !blobsReady;

  if (!recording) return null;

  return (
    <div className="diff-attempt-recording">
      {src ? (
        <ExclusiveAudio src={src} aria-label={label} />
      ) : waitingForBlob ? (
        <span className="diff-recording-loading">Loading recording…</span>
      ) : (
        <span className="diff-recording-missing">Recording unavailable — use mic again next time</span>
      )}
    </div>
  );
}

function AttemptRecordingPlayback({ attempt, recordings, resolveSrc, blobsReady }) {
  const recording = findRecordingForAttempt(attempt, recordings);
  const src = recording ? resolveSrc(recording) : '';
  const hearing =
    String(attempt.rawTranscript || attempt.cleanedTranscript || '').trim() || recording?.transcript || '';

  if (!recording && !hearing) return null;

  return (
    <div className="diff-attempt-recording">
      <RecordingPlayback
        recording={recording}
        resolveSrc={resolveSrc}
        blobsReady={blobsReady}
        label={`Play what you said on attempt ${attempt.at}`}
      />
      {!recording && hearing && (
        <p className="diff-attempt-transcript-only">Voice transcript only (no audio file saved)</p>
      )}
      {hearing && !src && (
        <p className="diff-attempt-hearing">
          <span className="diff-attempt-guesses-label">Heard:</span> {hearing}
        </p>
      )}
    </div>
  );
}

function orphanRecordings(attempts, recordings) {
  const matched = new Set();
  for (const attempt of attempts) {
    const rec = findRecordingForAttempt(attempt, recordings);
    const key = localRecordingKey(rec);
    if (key) matched.add(key);
  }
  return recordings.filter((rec) => !matched.has(localRecordingKey(rec)));
}

function buildTimelineRows(attempts, unmatched) {
  const rows = [];
  for (const rec of unmatched) {
    rows.push({ kind: 'recording', at: rec.at || '', data: rec });
  }
  for (const attempt of attempts) {
    rows.push({ kind: 'attempt', at: attempt.at || '', data: attempt });
  }
  rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return rows;
}

function AttemptHistoryBody({ caseId, caseStats, recordingsVersion = 0 }) {
  const attempts = caseStats?.attempts || [];
  const bestPct = caseStats?.bestPct ?? null;
  const nailedDiagnosis = caseStats?.nailedDiagnosis ?? 0;
  const improving = caseStats?.improving ?? null;
  const { recordings, resolveSrc, blobsReady } = useDifferentialCaseRecordings(caseId, recordingsVersion);

  const unmatched = useMemo(
    () => orphanRecordings(attempts, recordings),
    [attempts, recordings],
  );

  const timelineRows = useMemo(
    () => buildTimelineRows(attempts, unmatched),
    [attempts, unmatched],
  );

  const attemptNumById = useMemo(() => {
    const map = new Map();
    attempts.forEach((a, i) => map.set(a.id, i + 1));
    return map;
  }, [attempts]);

  const hasAttempts = attempts.length > 0;
  const hasRecordings = recordings.length > 0;

  return (
    <div className="diff-attempt-history-body">
      {hasAttempts && (
        <span className="diff-topic-stats-line">
          {nailedDiagnosis > 0 && (
            <>
              Nailed dx {nailedDiagnosis}x
              {' · '}
            </>
          )}
          {improving === 'up' && <span className="diff-trend diff-trend--up">↑ improving</span>}
          {improving === 'down' && <span className="diff-trend diff-trend--down">↓ review</span>}
          {improving === 'flat' && <span className="diff-trend">→ steady</span>}
        </span>
      )}

      {hasAttempts && (
        <div className="diff-timeline" aria-hidden="true">
          {attempts.map((a) => (
            <span
              key={a.id}
              className={`diff-timeline-dot${a.pct >= (bestPct ?? 0) ? ' diff-timeline-dot--best' : ''}${a.gotCaseDiagnosis ? ' diff-timeline-dot--nailed' : ''}`}
              title={`${formatShortAt(a.at)} — ${a.correct}/${a.total} (${a.pct}%)`}
            >
              {a.correct}/{a.total}
            </span>
          ))}
        </div>
      )}

      <ol className="diff-attempt-list">
        {timelineRows.map((row, idx) => {
          const isLatest = idx === timelineRows.length - 1;

          if (row.kind === 'recording') {
            const rec = row.data;
            const secs = Math.max(1, Math.round((rec.durationMs || 0) / 1000));
            return (
              <li
                key={localRecordingKey(rec) || rec.at}
                className={`diff-attempt-row diff-attempt-row--recording${isLatest ? ' diff-attempt-row--latest' : ''}`}
              >
                <div className="diff-attempt-row-head">
                  <span className="diff-attempt-num">#{rec.slot || idx + 1}</span>
                  <time className="diff-attempt-at" dateTime={rec.at}>
                    {formatShortAt(rec.at)}
                  </time>
                  <span className="diff-attempt-voice-meta">{secs}s</span>
                  {isLatest && <span className="diff-attempt-badge">latest</span>}
                  <span className="diff-attempt-badge diff-attempt-badge--voice">voice</span>
                </div>
                <RecordingPlayback
                  recording={rec}
                  resolveSrc={resolveSrc}
                  blobsReady={blobsReady}
                  label={`Play voice note for case ${caseId}`}
                />
                {rec.transcript && (
                  <p className="diff-attempt-guesses">
                    <span className="diff-attempt-guesses-label">Heard:</span> {rec.transcript}
                  </p>
                )}
              </li>
            );
          }

          const a = row.data;
          const attemptNum = attemptNumById.get(a.id) || 0;
          const prevAttempt = [...timelineRows.slice(0, idx)]
            .reverse()
            .find((r) => r.kind === 'attempt')?.data;
          const delta =
            prevAttempt?.pct != null && a.pct != null ? a.pct - prevAttempt.pct : null;
          const deltaLabel = formatDelta(delta);
          const isBest = a.pct >= (bestPct ?? 0);

          return (
            <li
              key={a.id}
              className={`diff-attempt-row${isLatest ? ' diff-attempt-row--latest' : ''}${isBest ? ' diff-attempt-row--best' : ''}`}
            >
              <div className="diff-attempt-row-head">
                <span className="diff-attempt-num">#{attemptNum}</span>
                <time className="diff-attempt-at" dateTime={a.at}>
                  {formatShortAt(a.at)}
                </time>
                <span
                  className={`diff-attempt-score${a.gotCaseDiagnosis ? ' diff-attempt-score--nailed' : ''}`}
                >
                  {a.correct}/{a.total}
                  <span className="diff-attempt-pct"> ({a.pct}%)</span>
                </span>
                {deltaLabel && (
                  <span
                    className={`diff-attempt-delta${delta > 0 ? ' diff-attempt-delta--up' : ' diff-attempt-delta--down'}`}
                  >
                    {deltaLabel}
                  </span>
                )}
                {a.gotCaseDiagnosis && (
                  <span className="diff-attempt-nailed" title="Got the case diagnosis">
                    nailed dx
                  </span>
                )}
                {isLatest && <span className="diff-attempt-badge">latest</span>}
              </div>
              <AttemptRecordingPlayback
                attempt={a}
                recordings={recordings}
                resolveSrc={resolveSrc}
                blobsReady={blobsReady}
              />
              {a.guesses?.length > 0 && (
                <p className="diff-attempt-guesses">
                  <span className="diff-attempt-guesses-label">You said:</span>{' '}
                  {a.guesses.join(' · ')}
                </p>
              )}
              {a.aiSummary && <p className="diff-attempt-ai">{a.aiSummary}</p>}
            </li>
          );
        })}
      </ol>

      {!hasAttempts && !hasRecordings && (
        <p className="diff-study-empty">
          No voice notes or scored attempts for Case {caseId} yet. Record or reveal &amp; score to build your timeline.
        </p>
      )}
    </div>
  );
}

export default function DifferentialAttemptHistory({
  caseId,
  caseStats,
  embedded = false,
  recordingsVersion = 0,
}) {
  const attemptCount = caseStats?.count || 0;
  const recordingCount = listLocalDifferentialRecordings(caseId).length;

  if (!attemptCount && !recordingCount) return null;

  const { bestPct, lastPct } = caseStats || {};
  const latest = caseStats?.attempts?.[caseStats.attempts.length - 1];
  const timelineCount = attemptCount + (attemptCount ? 0 : recordingCount);

  if (embedded) {
    return (
      <div
        className="diff-attempt-history diff-attempt-history--embedded"
        aria-label={`Your history for case ${caseId}`}
      >
        <p className="diff-attempt-history-embedded-head">
          Case {caseId}
          {attemptCount > 0 && (
            <>
              {' · '}
              {attemptCount} attempt{attemptCount === 1 ? '' : 's'}
            </>
          )}
          {recordingCount > 0 && attemptCount === 0 && (
            <>
              {' · '}
              {recordingCount} voice note{recordingCount === 1 ? '' : 's'}
            </>
          )}
          {lastPct != null && (
            <>
              {' '}
              · last <strong>{lastPct}%</strong>
            </>
          )}
          {bestPct != null && (
            <>
              {' '}
              · best <strong>{bestPct}%</strong>
            </>
          )}
        </p>
        <AttemptHistoryBody
          caseId={caseId}
          caseStats={caseStats}
          recordingsVersion={recordingsVersion}
        />
      </div>
    );
  }

  return (
    <details className="diff-attempt-history" aria-label={`Your history for case ${caseId}`}>
      <summary className="diff-attempt-history-summary">
        <span className="diff-attempt-history-summary-text">
          Your timeline — Case {caseId}
          {' · '}
          {timelineCount} item{timelineCount === 1 ? '' : 's'}
          {lastPct != null && (
            <>
              {' '}
              · last <strong>{lastPct}%</strong>
            </>
          )}
          {bestPct != null && (
            <>
              {' '}
              · best <strong>{bestPct}%</strong>
            </>
          )}
        </span>
        {latest && (
          <span
            className={`diff-timeline-dot diff-timeline-dot--summary${latest.pct >= (bestPct ?? 0) ? ' diff-timeline-dot--best' : ''}`}
          >
            {latest.correct}/{latest.total}
          </span>
        )}
      </summary>
      <AttemptHistoryBody
        caseId={caseId}
        caseStats={caseStats}
        recordingsVersion={recordingsVersion}
      />
    </details>
  );
}
