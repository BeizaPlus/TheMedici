import { useEffect, useState } from 'react';
import { getCasePictureNoteUrl } from '../lib/casePictureNotes.js';

export default function CasePictureInline({ pictureId, className = 'case-chat-inline-pic' }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    (async () => {
      const next = await getCasePictureNoteUrl(pictureId);
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      objectUrl = next;
      setUrl(next);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pictureId]);

  if (!url) return null;

  return <img src={url} alt="Case picture note" className={className} loading="lazy" />;
}
