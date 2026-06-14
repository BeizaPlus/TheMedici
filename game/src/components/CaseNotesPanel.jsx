import { useCallback, useEffect, useRef, useState } from 'react';
import { readCaseNotes, writeCaseNotes } from '../lib/caseNotes.js';
import { fetchCaseUserData, recordingPublicUrl } from '../lib/caseUserLog.js';
import CaseRecordButton from './CaseRecordButton.jsx';
import CaseScreenshotThumb from './CaseScreenshotThumb.jsx';

export default function CaseNotesPanel({
  caseId,
  caseData = null,
  sessionId,
  compact = false,
  minimal = false,
  threadMode = false,
  recordButtonProps = null,
  recordingsVersion = 0,
  notesVersion = 0,
  placeholder = 'Your notes for this case…',
  onTimelineNote,
  onRecordingSaved,
}) {
  const [notes, setNotes] = useState(() => readCaseNotes(caseId));
  const [recordings, setRecordings] = useState([]);
  const noteTimerRef = useRef(null);
  const skipWriteRef = useRef(false);

  const syncNotesFromStorage = useCallback(() => {
    skipWriteRef.current = true;
    setNotes(readCaseNotes(caseId));
  }, [caseId]);

  const loadRecordings = useCallback(async () => {
    const data = await fetchCaseUserData(caseId);
    if (!data) {
      setRecordings([]);
      return;
    }
    let rows = [];
    if (Array.isArray(data.recordings) && data.recordings.length) {
      rows = data.recordings.map((rec) => ({ ...rec }));
    } else if (data.sessions) {
      data.sessions.forEach((session) => {
        (session.recordings || []).forEach((rec) => {
          rows.push({ ...rec, attempt: session.attempt, sessionId: session.id });
        });
      });
    }
    rows.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')) || (a.slot || 0) - (b.slot || 0));
    setRecordings(rows);
  }, [caseId]);

  useEffect(() => {
    syncNotesFromStorage();
    void loadRecordings();
  }, [caseId, loadRecordings, syncNotesFromStorage]);

  useEffect(() => {
    void loadRecordings();
  }, [recordingsVersion, loadRecordings]);

  useEffect(() => {
    syncNotesFromStorage();
  }, [notesVersion, syncNotesFromStorage]);

  useEffect(() => {
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    writeCaseNotes(caseId, notes);
  }, [caseId, notes]);

  useEffect(() => {
    if (!onTimelineNote) return undefined;
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => {
      onTimelineNote(notes);
    }, 1200);
    return () => {
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    };
  }, [notes, onTimelineNote]);

  const handleRecordingSaved = useCallback(
    (rec) => {
      void loadRecordings();
      onRecordingSaved?.(rec);
    },
    [loadRecordings, onRecordingSaved],
  );

  return (
    <div className={`case-notes-panel ${compact ? 'compact' : ''} ${minimal ? 'minimal' : ''}${threadMode ? ' thread-mode' : ''}`}>
      {!minimal && (
        <p className="case-notes-hint">Saved per case in your journal — every run is logged.</p>
      )}
      {recordButtonProps && <CaseRecordButton {...recordButtonProps} compact />}
      {recordButtonProps?.transcribing && (
        <p className="case-notes-live-hint" aria-live="polite">
          Transcribing…
        </p>
      )}
      {recordings.length > 0 && !threadMode && (
        <ul className="case-recordings-list" aria-label="Saved intuition recordings">
          {recordings.map((rec) => {
            const src = recordingPublicUrl(rec.file);
            const secs = Math.round((rec.durationMs || 0) / 1000);
            const filename = `voice-note-case${caseId}-run${rec.attempt || 1}-slot${rec.slot || rec.id || 'x'}-${secs}s.webm`;
            return (
              <li key={rec.id} className="case-recording-item">
                <span className="case-recording-meta">
                  Voice note #{rec.slot || '?'}
                  {rec.attempt ? ` · Run ${rec.attempt}` : ''}
                  {' · '}
                  {secs}s
                </span>
                <div className="case-recording-controls">
                  <audio controls preload="none" src={src} />
                  {src && (
                    <a
                      className="case-recording-download btn-ghost"
                      href={src}
                      download={filename}
                      title="Download voice note to your device"
                      aria-label={`Download voice note ${rec.slot || ''}`}
                    >
                      ↓ Save
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <textarea
        className="soap-input case-notes-input"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={placeholder}
        rows={threadMode ? undefined : compact ? 4 : 8}
        aria-label="Case notes"
      />
      {caseData && !threadMode && (
        <div className="case-notes-screenshot-block">
          <CaseScreenshotThumb caseData={caseData} className="case-screenshot-thumb case-screenshot-thumb--notes" />
        </div>
      )}
    </div>
  );
}
