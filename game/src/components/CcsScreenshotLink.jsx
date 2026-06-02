import { ccsScreenshotUrl } from '../lib/ccsScreenshot.js';

/** Link to open the official CCS review PNG for this case (new tab). */
export default function CcsScreenshotLink({ caseData, className = 'ccs-screenshot-link' }) {
  const num = caseData?.ccsNumber ?? caseData?.id;
  const url = ccsScreenshotUrl(num);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="Open CCS review screenshot (source PNG)"
    >
      CCS screenshot ↗
    </a>
  );
}
