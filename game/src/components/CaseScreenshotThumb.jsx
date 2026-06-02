import { useState } from 'react';
import { ccsScreenshotUrl } from '../lib/ccsScreenshot.js';

/** Inline CCS review screenshot for briefing / case browser. */
export default function CaseScreenshotThumb({ caseData, className = 'case-screenshot-thumb' }) {
  const url = ccsScreenshotUrl(caseData?.ccsNumber ?? caseData?.id);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;

  return (
    <figure className={className}>
      <figcaption className="case-screenshot-thumb-label">CCS review case (source)</figcaption>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Open full CCS screenshot">
        <img
          src={url}
          alt={`CCS review screenshot for case ${caseData?.ccsNumber || caseData?.id}`}
          className="case-screenshot-thumb-img"
          onError={() => setFailed(true)}
        />
      </a>
    </figure>
  );
}
