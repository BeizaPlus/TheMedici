import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  findPictureNoteById,
  getCasePictureNoteUrl,
  PICTURE_ROLE_OPTIONS,
  pictureRoleLabel,
  updateCasePictureNoteRole,
} from '../lib/casePictureNotes.js';

export default function CasePictureInline({
  pictureId,
  className = 'case-chat-inline-pic',
  compact = false,
}) {
  const [url, setUrl] = useState('');
  const [role, setRole] = useState('reference');
  const [caseId, setCaseId] = useState('');

  const isThumb = compact || /thumb/i.test(className);

  useEffect(() => {
    const entry = findPictureNoteById(pictureId);
    if (entry) {
      setCaseId(String(entry.caseId || ''));
      setRole(entry.role || 'reference');
    }
  }, [pictureId]);

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

  const onRoleChange = useCallback(
    (event) => {
      const nextRole = event.target.value;
      if (!caseId || !updateCasePictureNoteRole(caseId, pictureId, nextRole)) return;
      setRole(nextRole);
    },
    [caseId, pictureId],
  );

  const roleLabel = useMemo(() => pictureRoleLabel(role), [role]);

  if (!url) return null;

  return (
    <figure className={`case-picture-inline${isThumb ? ' case-picture-inline--thumb' : ''}`}>
      <img src={url} alt={`${roleLabel} for case`} className={className} loading="lazy" />
      {!isThumb && caseId && (
        <figcaption className="case-picture-inline-role">
          <label className="case-picture-inline-role-label" htmlFor={`pic-role-${pictureId}`}>
            Image type
          </label>
          <select
            id={`pic-role-${pictureId}`}
            className="case-picture-inline-role-select"
            value={role}
            onChange={onRoleChange}
            aria-label="Select what this image is"
          >
            {PICTURE_ROLE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </figcaption>
      )}
    </figure>
  );
}
