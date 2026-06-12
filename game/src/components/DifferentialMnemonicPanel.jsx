import { useCallback, useEffect, useRef, useState } from 'react';

import CaseRecordButton from './CaseRecordButton.jsx';

import { useSpeechDictation } from '../hooks/useSpeechDictation.js';

import {

  addCasePictureNote,
  getCasePictureNoteUrl,
  listCasePictureNotes,
  PICTURE_ROLE_OPTIONS,
  pictureRoleLabel,
  removeCasePictureNote,
  updateCasePictureNoteRole,
} from '../lib/casePictureNotes.js';

import {

  ensureLegacyMemoryImageMigrated,

  readCaseMemoryMeta,

  writeCaseMemoryText,

} from '../lib/differentialCaseMemory.js';



const ROLE_OPTIONS = PICTURE_ROLE_OPTIONS;

function roleLabel(role) {
  return pictureRoleLabel(role);
}



export default function DifferentialMnemonicPanel({ caseId, embedded = false, notesVersion = 0, onChanged }) {

  const [text, setText] = useState(() => readCaseMemoryMeta(caseId).text);

  const [pictures, setPictures] = useState([]);

  const [pendingRole, setPendingRole] = useState('reference');

  const [dragOver, setDragOver] = useState(false);

  const [dictError, setDictError] = useState('');

  const fileRef = useRef(null);

  const saveTimerRef = useRef(null);

  const urlRefs = useRef([]);



  const revokeUrls = useCallback(() => {

    for (const url of urlRefs.current) {

      if (url) URL.revokeObjectURL(url);

    }

    urlRefs.current = [];

  }, []);



  const loadPictures = useCallback(async () => {

    await ensureLegacyMemoryImageMigrated(caseId);

    const entries = listCasePictureNotes(caseId);

    const rows = await Promise.all(

      entries.map(async (entry) => ({

        ...entry,

        url: await getCasePictureNoteUrl(entry.id),

      })),

    );

    revokeUrls();

    urlRefs.current = rows.map((r) => r.url).filter(Boolean);

    setPictures(rows);

  }, [caseId, revokeUrls]);



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

    const meta = readCaseMemoryMeta(caseId);

    setText(meta.text);

    dictation.seedBase(meta.text);

    dictation.stop();

    void loadPictures();



    return () => revokeUrls();

    // eslint-disable-next-line react-hooks/exhaustive-deps -- case change + external note sync

  }, [caseId, notesVersion]);



  const onTextChange = (e) => {

    const value = e.target.value;

    setText(value);

    dictation.seedBase(value);

    clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => persistText(value), 400);

  };



  const ingestImage = async (file) => {

    if (!file) return;

    setDictError('');

    try {

      await addCasePictureNote(caseId, file, { role: pendingRole, appendJournal: true });

      onChanged?.();

      await loadPictures();

    } catch (err) {

      setDictError(err?.message || 'Could not save picture');

    }

  };



  const onPaste = (e) => {

    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));

    if (!item) return;

    e.preventDefault();

    const file = item.getAsFile();

    if (file) void ingestImage(file);

  };



  const onDrop = (e) => {

    e.preventDefault();

    setDragOver(false);

    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type?.startsWith('image/'));

    if (file) void ingestImage(file);

  };



  const onRemovePicture = async (pictureId) => {

    await removeCasePictureNote(caseId, pictureId);

    onChanged?.();

    await loadPictures();

  };



  const onChangePictureRole = async (pictureId, role) => {

    if (!updateCasePictureNoteRole(caseId, pictureId, role)) return;

    onChanged?.();

    await loadPictures();

  };



  const pictureCount = pictures.length;

  const body = (

    <div className={`diff-mnemonic-body${embedded ? ' diff-mnemonic-body--embedded' : ''}`}>

      <p className="diff-mnemonic-hint">

        Shared case journal — text plus picture notes (likeness, teach-in refs). Same data in play and

        differential for Case {caseId}.

      </p>

      <div className="diff-mnemonic-actions">

        <CaseRecordButton

          recording={dictation.recording}

          busy={false}

          transcribing={dictation.recording}

          toggleRecording={dictation.toggle}

          compact

        />

        <div className="diff-picture-role" role="group" aria-label="Picture note type">

          {ROLE_OPTIONS.map((opt) => (

            <button

              key={opt.id}

              type="button"

              className={`diff-picture-role-btn${pendingRole === opt.id ? ' diff-picture-role-btn--active' : ''}`}

              onClick={() => setPendingRole(opt.id)}

            >

              {opt.label}

            </button>

          ))}

        </div>

        <button type="button" className="diff-mnemonic-img-btn" onClick={() => fileRef.current?.click()}>

          Add picture

        </button>

        <input

          ref={fileRef}

          type="file"

          accept="image/*"

          hidden

          onChange={(e) => {

            const file = e.target.files?.[0];

            if (file) void ingestImage(file);

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

      <div

        className={`diff-picture-drop${dragOver ? ' diff-picture-drop--over' : ''}`}

        onDragOver={(e) => {

          e.preventDefault();

          setDragOver(true);

        }}

        onDragLeave={() => setDragOver(false)}

        onDrop={onDrop}

      >

        <p className="diff-picture-drop-label">Drop pictures here · paste into notes · {roleLabel(pendingRole)} tag</p>

        {pictureCount > 0 ? (

          <ul className="diff-picture-grid">

            {pictures.map((pic) => (

              <li key={pic.id} className="diff-picture-card">

                {pic.url ? (

                  <img src={pic.url} alt={`${roleLabel(pic.role)} for case ${caseId}`} />

                ) : (

                  <span className="diff-picture-missing">Missing file</span>

                )}

                <div className="diff-picture-card-role-wrap">
                  <label className="diff-picture-card-role-label" htmlFor={`pic-card-role-${pic.id}`}>
                    Image type
                  </label>
                  <select
                    id={`pic-card-role-${pic.id}`}
                    className="diff-picture-card-role-select"
                    value={pic.role || 'reference'}
                    onChange={(e) => void onChangePictureRole(pic.id, e.target.value)}
                    aria-label="Select what this image is"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button

                  type="button"

                  className="diff-picture-remove"

                  onClick={() => void onRemovePicture(pic.id)}

                >

                  Remove

                </button>

              </li>

            ))}

          </ul>

        ) : (

          <p className="diff-picture-empty">No picture notes yet — drop a likeness or teach-in still.</p>

        )}

      </div>

      <textarea

        className="diff-mnemonic-input clinical-text-block"

        value={text}

        onChange={onTextChange}

        onPaste={onPaste}

        placeholder="e.g. BAD Gallstones — Biliary, Appendicitis, Diverticulitis…"

        rows={embedded ? 5 : 3}

      />

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

        Memory hook · {pictureCount ? `${pictureCount} picture${pictureCount === 1 ? '' : 's'} · ` : ''}notes

      </summary>

      {body}

    </details>

  );

}


