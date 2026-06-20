import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchCaseStory,
  fetchCaseStoryMasterImage,
  fetchCaseStoryStoryboard,
} from '../lib/caseStory.js';
import { apiUrl } from '../lib/apiBase.js';
import { chaptersToStoryboardBeats } from '../lib/caseStorySessionFingerprint.js';
import {
  clearCaseStoryOverride,
  mergeCaseStoryWithOverride,
  readCaseStoryOverride,
  writeCaseStoryOverride,
} from '../lib/caseStoryOverrides.js';

function emptyDraft(story) {
  return {
    title: story?.title || '',
    synopsis: story?.synopsis || '',
    twist: '',
    twistHeading: 'Your twist',
    chapters: (story?.chapters || [])
      .filter((c) => c.id !== 'twist')
      .map((c) => ({ id: c.id, heading: c.heading, body: c.body })),
  };
}

function ImagePlate({ loading, label, onGenerate, disabled }) {
  return (
    <div className="case-story-image-plate">
      {loading ? (
        <p className="case-story-image-plate-busy">Rendering oversight still…</p>
      ) : (
        <>
          <p className="case-story-image-plate-hint">{label}</p>
          <button
            type="button"
            className="case-story-btn case-story-btn-primary"
            onClick={onGenerate}
            disabled={disabled}
          >
            Generate oversight still
          </button>
        </>
      )}
    </div>
  );
}

function StoryboardPanel({
  beats,
  gridImageUrl,
  imageGen,
  imagesLoading,
  onGenerateImages,
  onRefreshImages,
}) {
  const hasGrid = Boolean(gridImageUrl);
  return (
    <section className="case-story-storyboard">
      <div className="case-story-storyboard-head">
        <p className="case-story-storyboard-lock">
          Camera: smart angle per beat — one 2×3 storyboard plate (six panels, varied composition; same MeWorld sculptural style).
          Story text compiles from this session (attendant chat, patient replies, exam/lab proof).
        </p>
        <div className="case-story-storyboard-actions">
          <button
            type="button"
            className="case-story-btn case-story-btn-primary"
            onClick={hasGrid ? onRefreshImages : onGenerateImages}
            disabled={imagesLoading || !imageGen}
          >
            {imagesLoading
              ? 'Rendering 2×3 plate…'
              : hasGrid
                ? 'Regenerate 2×3 plate'
                : 'Generate 2×3 storyboard plate'}
          </button>
        </div>
      </div>

      {!imageGen && (
        <p className="case-story-storyboard-note">
          Image generation unavailable on the API server — check MAGNIFIC_API_KEY and restart the API. Captions and visual hints still work.
        </p>
      )}

      {imagesLoading && (
        <div className="case-story-gen-progress" role="status" aria-busy="true">
          <div className="case-story-gen-progress-track">
            <div className="case-story-gen-progress-bar" />
          </div>
          <p className="case-story-gen-progress-label">
            Sending 2×3 storyboard plate to Magnific — usually 1–3 minutes…
          </p>
        </div>
      )}

      {hasGrid && (
        <figure className="case-story-grid-plate">
          <img src={gridImageUrl} alt="Case story 2×3 storyboard plate" />
          <figcaption>Six beats · one plate · panels read left-to-right, top-to-bottom</figcaption>
        </figure>
      )}

      <div className="case-story-storyboard-grid case-story-storyboard-grid--captions">
        {(beats || []).map((beat, i) => (
          <article key={beat.id || i} className="case-story-storyboard-panel">
            <span className="case-story-storyboard-num">{i + 1}</span>
            {!hasGrid && (
              beat.imageUrl ? (
                <figure className="case-story-storyboard-figure">
                  <img src={beat.imageUrl} alt={beat.heading || `Panel ${i + 1}`} />
                </figure>
              ) : (
                <div className={`case-story-storyboard-placeholder${imagesLoading ? ' is-busy' : ''}`}>
                  {imagesLoading ? 'Rendering…' : 'Included in 2×3 plate above'}
                </div>
              )
            )}
            <h3>{beat.heading}</h3>
            <p className="case-story-storyboard-caption">{beat.body}</p>
            {beat.visualHint && (
              <p className="case-story-storyboard-visual" title="Image generation brief">
                {beat.visualHint}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function StoryReadinessChecklist({ readiness, lateralityIssues = [] }) {
  if (!readiness) return null;
  const items = [
    {
      ok: readiness.hasCharacterMap,
      label: readiness.hasCharacterMap
        ? `Character map · ${readiness.characterMapFile || 'shipped'}`
        : 'Character map (white-bg) — missing for this case',
    },
    {
      ok: readiness.hasNarrative,
      label: readiness.hasNarrative ? 'Story compiled' : 'Story not compiled — Refresh',
    },
    {
      ok: !readiness.laterality?.locked || readiness.lateralityOk,
      label: readiness.laterality?.locked
        ? `Laterality lock · ${readiness.laterality.label}`
        : 'Laterality · not locked in case context',
    },
    {
      ok: readiness.hasGridPlate || readiness.hasMasterImage,
      label: readiness.hasGridPlate
        ? '2×3 storyboard plate'
        : readiness.hasMasterImage
          ? readiness.oversightSource === 'beat' && readiness.oversightBeatId
            ? `Oversight still · beat ${readiness.oversightBeatId}`
            : 'Master oversight still'
          : 'Images · generate storyboard',
    },
  ];
  return (
    <div
      className={`case-story-readiness${readiness.readyForReview ? ' is-ready' : ''}`}
      role="status"
    >
      <p className="case-story-readiness-title">
        {readiness.readyForReview ? 'Ready for review' : 'Story checklist'}
      </p>
      <ul className="case-story-readiness-list">
        {items.map((row) => (
          <li key={row.label} className={row.ok ? 'ok' : 'pending'}>
            {row.ok ? '✓' : '○'} {row.label}
          </li>
        ))}
      </ul>
      {lateralityIssues.length > 0 && (
        <p className="case-story-readiness-warn">
          Laterality drift: {lateralityIssues.join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function CaseStoryPanel({
  open,
  onClose,
  caseData,
  sessionContext = null,
  portraitNote = '',
  medicalSequence = null,
}) {
  const [compiling, setCompiling] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [error, setError] = useState('');
  const [story, setStory] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [view, setView] = useState('prose');
  const [storyboardBeats, setStoryboardBeats] = useState(null);
  const [gridImageUrl, setGridImageUrl] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageGen, setImageGen] = useState(true);
  const hasOverride = Boolean(readCaseStoryOverride(caseData?.id));

  const applyStory = useCallback(
    (base) => mergeCaseStoryWithOverride(base, caseData?.id),
    [caseData?.id],
  );

  const previewBeats = useMemo(
    () => chaptersToStoryboardBeats(story?.chapters || []),
    [story?.chapters],
  );

  const compileStory = useCallback(
    async (refresh = false) => {
      if (!caseData?.id) return;
      setCompiling(true);
      setError('');
      try {
        const data = await fetchCaseStory({
          caseData,
          sessionContext,
          portraitNote,
          medicalSequence,
          refresh,
          generateImage: false,
        });
        setStory(applyStory(data));
        setStoryboardBeats(null);
      setGridImageUrl(null);
        if (editing) {
          setDraft(emptyDraft(applyStory(data)));
        }
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setCompiling(false);
      }
    },
    [caseData, sessionContext, portraitNote, medicalSequence, applyStory, editing],
  );

  const generateMasterImage = useCallback(async () => {
    if (!caseData?.id) return;
    setMasterLoading(true);
    setError('');
    try {
      const data = await fetchCaseStoryMasterImage({
        caseData,
        sessionContext,
        portraitNote,
        refresh: false,
      });
      setImageGen(data.imageGen !== false);
      if (data.masterImageUrl) {
        setStory((prev) => (prev ? { ...prev, masterImageUrl: data.masterImageUrl } : prev));
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setMasterLoading(false);
    }
  }, [caseData, sessionContext, portraitNote]);

  const syncStoryboardUrls = useCallback(async () => {
    if (!caseData?.id || !story?.chapters?.length) return;
    try {
      const data = await fetchCaseStoryStoryboard({
        caseData,
        chapters: story.chapters,
        patientLock: story.patientLock,
        portraitNote,
        generateImages: false,
      });
      setImageGen(data.imageGen !== false);
      setStoryboardBeats(data.beats || previewBeats);
      setGridImageUrl(data.gridImageUrl || null);
    } catch {
      setStoryboardBeats(previewBeats);
    }
  }, [caseData, story, portraitNote, previewBeats]);

  const generatePanelImages = useCallback(
    async (refresh = false) => {
      if (!caseData?.id || !story?.chapters?.length) return;
      setImagesLoading(true);
      setError('');
      setStoryboardBeats(previewBeats);
      try {
        const data = await fetchCaseStoryStoryboard({
          caseData,
          chapters: story.chapters,
          patientLock: story.patientLock,
          portraitNote,
          refresh,
          generateImages: true,
        });
        setImageGen(data.imageGen !== false);
        setStoryboardBeats(data.beats || previewBeats);
        setGridImageUrl(data.gridImageUrl || null);
        if (data.readiness) {
          setStory((prev) => (prev ? { ...prev, readiness: data.readiness } : prev));
        }
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setImagesLoading(false);
      }
    },
    [caseData, story, portraitNote, previewBeats],
  );

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDraft(null);
      setView('prose');
      setStoryboardBeats(null);
      setGridImageUrl(null);
      setStory(null);
      setError('');
      return;
    }
    void compileStory(false);
    fetch(apiUrl('/api/health'))
      .then((r) => r.json())
      .then((h) => {
        if (h?.magnific) setImageGen(true);
        else if (h && h.magnific === false) setImageGen(false);
      })
      .catch(() => {});
  }, [open, caseData?.id, compileStory]);

  useEffect(() => {
    if (view === 'storyboard' && story?.chapters?.length) {
      void syncStoryboardUrls();
    }
  }, [view, story?.chapters, syncStoryboardUrls]);

  const startEdit = () => {
    const override = readCaseStoryOverride(caseData?.id);
    const base = story || {};
    setDraft({
      title: override?.title ?? base.title ?? '',
      synopsis: override?.synopsis ?? base.synopsis ?? '',
      twist: override?.twist ?? '',
      twistHeading: override?.twistHeading ?? 'Your twist',
      chapters: (override?.chapters?.length ? override.chapters : base.chapters || [])
        .filter((c) => c.id !== 'twist')
        .map((c) => ({ id: c.id, heading: c.heading, body: c.body })),
    });
    setEditing(true);
    setView('prose');
  };

  const saveEdit = () => {
    if (!draft || !caseData?.id) return;
    writeCaseStoryOverride(caseData.id, {
      title: draft.title.trim(),
      synopsis: draft.synopsis.trim(),
      twist: draft.twist.trim(),
      twistHeading: draft.twistHeading.trim() || 'Your twist',
      chapters: draft.chapters.map((c) => ({
        id: c.id,
        heading: c.heading.trim(),
        body: c.body.trim(),
      })),
    });
    setStory(applyStory(story));
    setStoryboardBeats(null);
    setEditing(false);
  };

  const resetEdits = () => {
    if (!caseData?.id) return;
    clearCaseStoryOverride(caseData.id);
    setEditing(false);
    setDraft(null);
    setStoryboardBeats(null);
    void compileStory(false);
  };

  const beats = storyboardBeats || previewBeats;
  const sessionOrders = sessionContext?.stacksPlaced?.length || 0;
  const sessionChat = sessionContext?.chatMessages?.length || 0;

  if (!open) return null;

  return (
    <div className="case-story-overlay" role="dialog" aria-label="Case story">
      <div className={`case-story-panel${view === 'storyboard' ? ' is-storyboard' : ''}`}>
        <header className="case-story-head">
          <div>
            <p className="case-story-kicker">Case story · Case {caseData?.id}</p>
            {editing ? (
              <input
                className="case-story-edit-title"
                value={draft?.title ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                aria-label="Story title"
              />
            ) : (
              <h2 className="case-story-title">{story?.title || caseData?.title || 'Oversight'}</h2>
            )}
            {story?.patientLock && !editing && (
              <p className="case-story-lock">Likeness: {story.patientLock}</p>
            )}
            {hasOverride && !editing && (
              <p className="case-story-edited-badge">Your edits applied</p>
            )}
            {!editing && sessionContext?.hasSessionData && (
              <p className="case-story-session-badge">
                Session compiled · {sessionOrders} orders · {sessionChat} chat turns
              </p>
            )}
          </div>
          <div className="case-story-head-actions">
            {!editing ? (
              <button type="button" className="case-story-btn" onClick={startEdit}>
                Edit
              </button>
            ) : (
              <>
                <button type="button" className="case-story-btn case-story-btn-primary" onClick={saveEdit}>
                  Save edits
                </button>
                <button type="button" className="case-story-btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </>
            )}
            <button
              type="button"
              className="case-story-btn"
              onClick={() => void compileStory(true)}
              disabled={compiling}
              title="Recompile story from attendant chat, patient replies, orders, exam proof"
            >
              {compiling ? 'Compiling…' : 'Refresh'}
            </button>
            <button type="button" className="case-story-btn case-story-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {!editing && (
          <StoryReadinessChecklist
            readiness={story?.readiness}
            lateralityIssues={story?.lateralityIssues || story?.readiness?.lateralityIssues}
          />
        )}

        {!editing && (
          <div className="case-story-view-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`case-story-view-tab${view === 'prose' ? ' is-active' : ''}`}
              aria-selected={view === 'prose'}
              onClick={() => setView('prose')}
            >
              Prose
            </button>
            <button
              type="button"
              role="tab"
              className={`case-story-view-tab${view === 'storyboard' ? ' is-active' : ''}`}
              aria-selected={view === 'storyboard'}
              onClick={() => setView('storyboard')}
            >
              Storyboard
            </button>
          </div>
        )}

        {editing ? (
          <div className="case-story-edit-form">
            <label className="case-story-edit-label">
              Synopsis
              <textarea
                className="case-story-edit-textarea"
                rows={3}
                value={draft?.synopsis ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, synopsis: e.target.value }))}
              />
            </label>
            <label className="case-story-edit-label">
              Your twist (optional — appended as its own beat)
              <textarea
                className="case-story-edit-textarea"
                rows={3}
                value={draft?.twist ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, twist: e.target.value }))}
                placeholder="e.g. showered with emboli, not peppered with guilt — your line for the family room"
              />
            </label>
            {(draft?.chapters || []).map((ch, idx) => (
              <div key={ch.id || idx} className="case-story-edit-chapter">
                <input
                  className="case-story-edit-heading"
                  value={ch.heading}
                  onChange={(e) =>
                    setDraft((d) => {
                      const chapters = [...d.chapters];
                      chapters[idx] = { ...chapters[idx], heading: e.target.value };
                      return { ...d, chapters };
                    })
                  }
                  aria-label={`Chapter ${idx + 1} heading`}
                />
                <textarea
                  className="case-story-edit-textarea"
                  rows={4}
                  value={ch.body}
                  onChange={(e) =>
                    setDraft((d) => {
                      const chapters = [...d.chapters];
                      chapters[idx] = { ...chapters[idx], body: e.target.value };
                      return { ...d, chapters };
                    })
                  }
                />
              </div>
            ))}
            <button type="button" className="case-story-btn case-story-btn-muted" onClick={resetEdits}>
              Reset my edits
            </button>
          </div>
        ) : view === 'storyboard' ? (
          <>
            {error && <p className="case-story-error">{error}</p>}
            {compiling && !story?.chapters?.length && (
              <p className="case-story-loading-img">Compiling story from session…</p>
            )}
            <StoryboardPanel
              beats={beats}
              gridImageUrl={gridImageUrl}
              imageGen={imageGen}
              imagesLoading={imagesLoading}
              onGenerateImages={() => void generatePanelImages(false)}
              onRefreshImages={() => void generatePanelImages(true)}
            />
          </>
        ) : (
          <>
            {story?.synopsis && <p className="case-story-synopsis">{story.synopsis}</p>}

            {story?.masterImageUrl ? (
              <figure className="case-story-master">
                <img src={story.masterImageUrl} alt="Third-person oversight view of patient" />
                <figcaption>
                  {story.oversightSource === 'beat' && story.oversightBeatId
                    ? `Recontextualization beat (${story.oversightBeatId}) — third-person oversight`
                    : 'Master oversight view — third-person clinical angle'}
                </figcaption>
              </figure>
            ) : (
              <ImagePlate
                loading={masterLoading}
                label="Third-person oversight plate — generates after story compiles"
                onGenerate={() => void generateMasterImage()}
                disabled={compiling || !story?.chapters?.length || !imageGen}
              />
            )}

            {compiling && !story?.chapters?.length && (
              <p className="case-story-loading-img">Compiling story from session…</p>
            )}

            {error && <p className="case-story-error">{error}</p>}

            <div className="case-story-chapters">
              {(story?.chapters || []).map((ch) => (
                <article
                  key={ch.id}
                  className={`case-story-chapter${ch.id === 'twist' ? ' case-story-chapter-twist' : ''}`}
                >
                  <h3>{ch.heading}</h3>
                  <p>{ch.body}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {story?.source && !editing && (
          <p className="case-story-foot">
            Source: {story.source}
            {sessionOrders ? ` · ${sessionOrders} orders in session` : ''}
            {sessionChat ? ` · ${sessionChat} chat turns` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
