import { useCallback, useEffect, useRef, useState } from 'react';
import CaseRecordButton from './CaseRecordButton.jsx';
import { useSpeechDictation } from '../hooks/useSpeechDictation.js';
import {
  clearCaseMemoryImage,
  getCaseMemoryImageUrl,
  readCaseMemoryMeta,
  saveCaseMemoryImage,
  writeCaseMemoryText,
} from '../lib/differentialCaseMemory.js';

export default function DifferentialMnemonicPanel({ caseId, embedded = false, notesVersion = 0, onChanged }) {
  const [text, setText] = useState(() => readCaseMemoryMeta(caseId).text);
  const [imageUrl, setImageUrl] = useState('');
  const [hasImage, setHasImage] = useState(() => readCaseMemoryMeta(caseId).hasImage);
  const [dictError, setDictError] = useState('');
  const fileRef = useRef(null);
  const saveTimerRef = useRef(null);

  const persistText = useCallback(
    (value) => {
      writeCaseMemoryText(caseId, value);
      onChanged?.();
    },
    [caseId, onChanged],
  );

  const dictation = useSpeechDictation({
    onText: (spoken) => {
      setText(spoken);
      persistText(spoken);
    },
    onError: (e) => setDictError(e?.message || 'Dictation error'),
  });

  useEffect(() => {
    let revoked = '';
    let cancelled = false;
    const meta = readCaseMemoryMeta(caseId);
    setText(meta.text);
    setHasImage(meta.hasImage);
    dictation.seedBase(meta.text);
    dictation.stop();

    (async () => {
      if (!meta.hasImage) {
        if (!cancelled) setImageUrl('');
        return;
      }
      const url = await getCaseMemoryImageUrl(caseId);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      revoked = url;
      setImageUrl(url);
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- case change + external note sync
  }, [caseId, notesVersion]);

  const onTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    dictation.seedBase(value);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistText(value), 400);
  };

  const loadImageFile = async (file) => {
    if (!file?.type?.startsWith('image/')) return;
    if (file.size > 4 * 1024 * 1024) {
      setDictError('Image too large — use under 4 MB');
      return;
    }
    setDictError('');
    await saveCaseMemoryImage(caseId, file);
    setHasImage(true);
    const url = await getCaseMemoryImageUrl(caseId);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    if (file) void loadImageFile(file);
  };

  const onRemoveImage = async () => {
    await clearCaseMemoryImage(caseId);
    setHasImage(false);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  };

  const body = (
    <div className={`diff-mnemonic-body${embedded ? ' diff-mnemonic-body--embedded' : ''}`}>
      <p className="diff-mnemonic-hint">
        Shared case journal — same notes in immersive play and differential practice for Case {caseId}.
      </p>
      <div className="diff-mnemonic-actions">
        <CaseRecordButton
          recording={dictation.recording}
          busy={false}
          transcribing={dictation.recording}
          toggleRecording={dictation.toggle}
          compact
        />
        <button
          type="button"
          className="diff-mnemonic-img-btn"
          onClick={() => fileRef.current?.click()}
        >
          Add image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadImageFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {dictation.livePreview && (
        <p className="diff-voice-live" aria-live="polite">
          Hearing: {dictation.livePreview}
        </p>
      )}
      {dictError && <p className="diff-voice-error">{dictError}</p>}
      <textarea
        className="diff-mnemonic-input clinical-text-block"
        value={text}
        onChange={onTextChange}
        onPaste={onPaste}
        placeholder="e.g. BAD Gallstones — Biliary, Appendicitis, Diverticulitis…"
        rows={embedded ? 5 : 3}
      />
      {imageUrl && (
        <div className="diff-mnemonic-preview">
          <img src={imageUrl} alt={`Memory hook for case ${caseId}`} />
          <button type="button" className="diff-mnemonic-clear-img" onClick={() => void onRemoveImage()}>
            Remove image
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="diff-mnemonic diff-mnemonic--embedded" aria-label="Memory hook for this case">
        {body}
      </div>
    );
  }

  return (
    <details className="diff-mnemonic" aria-label="Memory hook for this case">
      <summary className="diff-mnemonic-summary">
        Memory hook · {hasImage ? 'image + ' : ''}notes
      </summary>
      {body}
    </details>
  );
}
