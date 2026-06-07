import { useEffect, useState } from 'react';
import { fetchCaseUserData, recordingPublicUrl } from '../lib/caseUserLog.js';
import {
  findServerRecordingFallback,
  getLocalDifferentialRecordingUrl,
  listAllDifferentialRecordings,
  listLocalDifferentialRecordings,
} from '../lib/differentialVoiceStorage.js';

function localRecordingKey(rec) {
  return rec.localId || rec.id || '';
}

function resolvePlaybackSrc(caseId, rec, localUrls, serverData) {
  if (rec.local) {
    const key = localRecordingKey(rec);
    if (key && localUrls[key]) return localUrls[key];
    const remote = findServerRecordingFallback(caseId, rec, serverData);
    if (remote?.file) return recordingPublicUrl(remote.file);
    return '';
  }
  return recordingPublicUrl(rec.file);
}

export default function DifferentialRecordingsList({ caseId, version = 0 }) {
  const [rows, setRows] = useState([]);
  const [localUrls, setLocalUrls] = useState({});
  const [serverData, setServerData] = useState(null);
  const [blobsReady, setBlobsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urlsToRevoke = [];

    setRows(listAllDifferentialRecordings(caseId, null));
    setLocalUrls({});
    setServerData(null);
    setBlobsReady(false);

    const local = listLocalDifferentialRecordings(caseId);

    (async () => {
      const urlMap = {};
      for (const rec of local) {
        const key = localRecordingKey(rec);
        if (!key) continue;
        const url = await getLocalDifferentialRecordingUrl(key);
        if (url) {
          urlMap[key] = url;
          urlsToRevoke.push(url);
        }
      }
      if (!cancelled) {
        setLocalUrls(urlMap);
        setBlobsReady(true);
      }
    })();

    (async () => {
      const server = await fetchCaseUserData(caseId, { timeoutMs: 2500 });
      if (cancelled) return;
      setServerData(server);
      setRows(listAllDifferentialRecordings(caseId, server));
    })();

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [caseId, version]);

  if (!rows.length) return null;

  return (
    <details className="diff-recordings" aria-label="Saved voice recordings for this case">
      <summary className="diff-recordings-summary">
        Voice notes · {rows.length}
      </summary>
      <ul className="diff-recordings-list">
        {rows.map((rec) => {
          const localKey = localRecordingKey(rec);
          const src = resolvePlaybackSrc(caseId, rec, localUrls, serverData);
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
                <audio controls preload="metadata" src={src} className="diff-recording-audio" />
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
