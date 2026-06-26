import { useEffect, useState } from 'react';
import {
  getStudyServerUrls,
  isStudyEnvironment,
  loadStudyEnvironmentMeta,
} from '../lib/studyEnvironment.js';

export default function StudyEnvironmentBanner() {
  const [meta, setMeta] = useState(null);
  const urls = getStudyServerUrls();

  useEffect(() => {
    if (!isStudyEnvironment()) return undefined;
    let cancelled = false;
    loadStudyEnvironmentMeta().then((data) => {
      if (!cancelled) setMeta(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isStudyEnvironment()) return null;

  const snapshotLabel = meta?.snapshotAt
    ? new Date(meta.snapshotAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown date';

  const cadence = meta?.refreshCadenceDays ?? 7;
  const mainWeb = meta?.mainDevWeb || 'http://localhost:5173';

  return (
    <div className="study-env-banner" role="status" aria-live="polite">
      <div className="study-env-banner__inner">
        <span className="study-env-banner__tag">Study server</span>
        <span className="study-env-banner__url" title="Study server URL">
          {urls.web}
        </span>
        <span className="study-env-banner__sep" aria-hidden="true">
          ·
        </span>
        <span className="study-env-banner__api" title="Study API">
          API {urls.api}
        </span>
        <span className="study-env-banner__sep" aria-hidden="true">
          ·
        </span>
        <span className="study-env-banner__meta">
          Snapshot {snapshotLabel} — updates ship on{' '}
          <a className="study-env-banner__link" href={mainWeb} target="_blank" rel="noreferrer">
            main dev
          </a>{' '}
          ({mainWeb}); refresh study copy about every {cadence} days
        </span>
      </div>
    </div>
  );
}
