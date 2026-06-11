import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildYouTubeSearchUrl } from '../lib/realWorldCases.js';
import { mergeStoriesByTier } from '../lib/realWorldStoryMerge.js';
import { formatYoutubeTimestamp, seekYoutubeEmbed, youtubeEmbedUrl } from '../lib/youtubePlayer.js';
import {
  getRealWorldPrefetch,
  invalidateRealWorldPrefetch,
  prefetchRealWorldStories,
  subscribeRealWorldPrefetch,
} from '../lib/realWorldPrefetch.js';
import { IconCircleCheck } from './sceneToolbar/SceneToolbarIcons.jsx';
import {
  readCaseAvatarSource,
  readStoredCaseAvatarSource,
  setCaseAvatarFromVideo,
  avatarPickMatches,
} from '../lib/caseAvatar.js';
import { fetchYoutubeTranscript } from '../lib/fetchYoutubeTranscript.js';
import { saveCaseYoutubeTranscript } from '../lib/caseYoutubeTranscripts.js';

function AvatarIconButton({ selected, busy, onClick, title = 'Use as case avatar' }) {
  return (
    <button
      type="button"
      className={`diff-rw-avatar-icon-btn${selected ? ' diff-rw-avatar-icon-btn--on' : ''}${busy ? ' diff-rw-avatar-icon-btn--busy' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={busy}
      aria-pressed={selected}
      title={selected ? 'Case avatar selected' : title}
      aria-label={selected ? 'Case avatar selected' : title}
    >
      <IconCircleCheck className="diff-rw-avatar-icon" aria-hidden />
    </button>
  );
}

function AvatarPickButton({ selected, busy, onClick, compact = false, className = '' }) {
  if (compact) {
    return <AvatarIconButton selected={selected} busy={busy} onClick={onClick} />;
  }
  return (
    <button
      type="button"
      className={`diff-rw-avatar-btn${selected ? ' diff-rw-avatar-btn--selected' : ''}${busy ? ' diff-rw-avatar-btn--busy' : ''} ${className}`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={busy}
      aria-pressed={selected}
      title={selected ? 'Case avatar — this patient' : 'Use as case avatar'}
      aria-label={selected ? 'Case avatar selected' : 'Use as case avatar'}
    >
      <IconCircleCheck className="diff-rw-avatar-icon" aria-hidden />
      <span>{busy ? 'Building…' : 'Avatar'}</span>
    </button>
  );
}

function primaryVideoForStory(story) {
  for (const raw of story?.videos || []) {
    const youtubeId = String(raw?.youtubeId || '').trim();
    if (!youtubeId || youtubeId.includes(' ')) continue;
    return {
      youtubeId,
      title: String(raw?.title || 'YouTube').trim(),
      patientName: story.name,
    };
  }
  return null;
}

function buildCasePlaylist(stories = []) {
  const items = [];
  const seen = new Set();

  stories.forEach((story, storyIndex) => {
    for (const raw of story.videos || []) {
      const youtubeId = String(raw?.youtubeId || '').trim();
      if (!youtubeId || youtubeId.includes(' ') || seen.has(youtubeId)) continue;
      seen.add(youtubeId);
      items.push({
        youtubeId,
        title: String(raw?.title || 'YouTube').trim(),
        url: raw?.url || `https://www.youtube.com/watch?v=${youtubeId}`,
        patientName: story.name,
        storyIndex,
      });
    }
  });

  return items;
}

function RealWorldVideoLightbox({
  open,
  playlist = [],
  index = 0,
  onIndexChange,
  onClose,
  selectedAvatar = null,
  onSelectAvatar,
}) {
  const video = playlist[index];
  const total = playlist.length;
  const hasMultiple = total > 1;

  const step = useCallback(
    (delta) => {
      if (!total) return;
      onIndexChange((index + delta + total) % total);
    },
    [index, onIndexChange, total],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, step]);

  if (!open || !video?.youtubeId) return null;

  return createPortal(
    <div className="diff-rw-lightbox" role="dialog" aria-modal="true" aria-label="Case videos full view">
      <button
        type="button"
        className="diff-rw-lightbox-backdrop"
        onClick={onClose}
        aria-label="Close video"
      />
      <div className="diff-rw-lightbox-panel">
        <header className="diff-rw-lightbox-head">
          <div className="diff-rw-lightbox-head-text">
            <p className="diff-rw-lightbox-patient">{video.patientName}</p>
            <p className="diff-rw-lightbox-title">{video.title}</p>
            {hasMultiple && (
              <p className="diff-rw-lightbox-counter">
                Video {index + 1} of {total} — use ‹ › or ← →
              </p>
            )}
          </div>
          <button type="button" className="diff-rw-lightbox-close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="diff-rw-lightbox-stage">
          {hasMultiple && (
            <button
              type="button"
              className="diff-rw-lightbox-nav diff-rw-lightbox-nav--prev"
              onClick={() => step(-1)}
              aria-label="Previous video"
            >
              ‹
            </button>
          )}

          <div className="diff-rw-lightbox-frame">
            <iframe
              key={video.youtubeId}
              title={video.title}
              src={youtubeEmbedUrl(video.youtubeId)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {hasMultiple && (
            <button
              type="button"
              className="diff-rw-lightbox-nav diff-rw-lightbox-nav--next"
              onClick={() => step(1)}
              aria-label="Next video"
            >
              ›
            </button>
          )}
        </div>

        <footer className="diff-rw-lightbox-foot">
          {onSelectAvatar && video?.youtubeId && (
            <AvatarPickButton
              selected={avatarPickMatches(selectedAvatar, video)}
              onClick={() =>
                onSelectAvatar({
                  youtubeId: video.youtubeId,
                  title: video.title,
                  patientName: video.patientName,
                })
              }
            />
          )}
          {hasMultiple && (
            <div className="diff-rw-lightbox-strip">
              <button
                type="button"
                className="diff-rw-lightbox-strip-btn"
                onClick={() => step(-1)}
              >
                ‹ Prev
              </button>
              <div className="diff-rw-lightbox-dots" role="tablist" aria-label="Case videos">
              {playlist.map((item, i) => (
                <button
                  key={item.youtubeId}
                  type="button"
                  role="tab"
                  className={`diff-rw-lightbox-dot${i === index ? ' diff-rw-lightbox-dot--active' : ''}`}
                  aria-selected={i === index}
                  aria-label={`${item.patientName}: ${item.title}`}
                  onClick={() => onIndexChange(i)}
                />
              ))}
              </div>
              <button
                type="button"
                className="diff-rw-lightbox-strip-btn"
                onClick={() => step(1)}
              >
                Next ›
              </button>
            </div>
          )}
          <a
            className="diff-rw-lightbox-yt"
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube ↗
          </a>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function StoryVideos({
  videos = [],
  patientName = '',
  diagnosis = '',
  onOpenFullView,
  videoIframeRef = null,
}) {
  const [active, setActive] = useState(0);
  const embeddable = (videos || []).filter((v) => v.youtubeId && !String(v.youtubeId).includes(' '));
  const searchUrl = buildYouTubeSearchUrl({ name: patientName, diagnosis });

  if (!embeddable.length) {
    return (
      <div className="diff-rw-video-stage diff-rw-video-stage--empty">
        <p className="diff-rw-video-missing">
          No embed.{' '}
          <a href={searchUrl} target="_blank" rel="noopener noreferrer">
            Search YouTube ↗
          </a>
        </p>
      </div>
    );
  }

  const safeActive = Math.min(active, embeddable.length - 1);
  const current = embeddable[safeActive];
  const openFull = () => onOpenFullView?.(current.youtubeId);

  return (
    <div className="diff-rw-video-stage">
      <div className="diff-rw-video-meta">
        {embeddable.length > 1 ? (
          <div className="diff-rw-video-tabs" role="tablist" aria-label="Story videos">
            {embeddable.map((video, index) => (
              <button
                key={video.youtubeId || video.url}
                type="button"
                role="tab"
                className={`diff-rw-video-tab${safeActive === index ? ' diff-rw-video-tab--active' : ''}`}
                aria-selected={safeActive === index}
                onClick={() => setActive(index)}
              >
                Clip {index + 1}
              </button>
            ))}
          </div>
        ) : (
          <span className="diff-rw-video-clip-label">Clip</span>
        )}
        <p className="diff-rw-video-title" title={current.title}>
          {current.title}
        </p>
        <div className="diff-rw-video-actions">
          <button type="button" className="diff-rw-expand-btn" onClick={openFull}>
            Full view
          </button>
          <a
            className="diff-rw-video-open"
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open on YouTube"
          >
            YouTube ↗
          </a>
        </div>
      </div>
      <div className="diff-rw-iframe-wrap">
        <iframe
          ref={videoIframeRef}
          title={current.title}
          src={youtubeEmbedUrl(current.youtubeId)}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <button
          type="button"
          className="diff-rw-iframe-expand-btn"
          onClick={openFull}
          aria-label={`Full view: ${current.title}`}
        >
          ⛶
        </button>
      </div>
    </div>
  );
}

function TranscriptCueList({ cues = [], activeStart = null, onSeek }) {
  if (!cues.length) {
    return <p className="diff-rw-status">No timed captions for this clip.</p>;
  }

  return (
    <ol className="diff-rw-transcript-cues" aria-label="Video transcript with timestamps">
      {cues.map((cue, index) => {
        const isActive = activeStart != null && Math.abs(activeStart - cue.start) < 0.05;
        return (
          <li key={`${cue.start}-${index}`} className={`diff-rw-transcript-cue${isActive ? ' diff-rw-transcript-cue--active' : ''}`}>
            <button
              type="button"
              className="diff-rw-transcript-cue-btn"
              onClick={() => onSeek?.(cue.start)}
              title={`Jump to ${formatYoutubeTimestamp(cue.start)}`}
            >
              <span className="diff-rw-transcript-time">{formatYoutubeTimestamp(cue.start)}</span>
              <span className="diff-rw-transcript-text">{cue.text}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StoryReadPanel({
  story,
  youtubeId = null,
  caseId = null,
  videoTitle = '',
  onSeekVideo,
  onTranscriptSaved,
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('summary');
  const [transcriptCues, setTranscriptCues] = useState([]);
  const [activeCueStart, setActiveCueStart] = useState(null);
  const [transcriptState, setTranscriptState] = useState('idle');

  const storySummary = String(story.summary || story.headline || '').trim();
  const preview = storySummary
    ? storySummary.replace(/\s+/g, ' ').slice(0, 220) + (storySummary.length > 220 ? '…' : '')
    : '';
  if (!preview && !youtubeId) return null;

  useEffect(() => {
    if (!expanded || mode !== 'transcript' || !youtubeId) return undefined;
    let cancelled = false;
    setTranscriptState('loading');
    setTranscriptCues([]);
    setActiveCueStart(null);
    void fetchYoutubeTranscript(youtubeId)
      .then((data) => {
        if (cancelled) return;
        setTranscriptCues(data.cues || []);
        setTranscriptState('ready');
        if (caseId && data.text) {
          saveCaseYoutubeTranscript(caseId, {
            youtubeId,
            title: videoTitle || story?.headline || story?.name || 'YouTube',
            text: data.text,
            cues: data.cues,
          });
          onTranscriptSaved?.();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTranscriptCues([]);
        setTranscriptState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, mode, youtubeId]);

  useEffect(() => {
    setExpanded(false);
    setMode('summary');
    setTranscriptCues([]);
    setActiveCueStart(null);
    setTranscriptState('idle');
  }, [story.id, story.name, youtubeId, story.summary, story.headline]);

  const handleSeekCue = useCallback(
    (seconds) => {
      setActiveCueStart(seconds);
      onSeekVideo?.(seconds);
    },
    [onSeekVideo],
  );

  return (
    <section className={`diff-rw-read${expanded ? ' diff-rw-read--open' : ''}`}>
      <div className="diff-rw-read-head">
        <button
          type="button"
          className="diff-rw-read-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Read story summary'}
        </button>
        {expanded && (
          <div className="diff-rw-read-tabs" role="tablist" aria-label="Story text">
            <button
              type="button"
              role="tab"
              className={`diff-rw-read-tab${mode === 'summary' ? ' diff-rw-read-tab--active' : ''}`}
              aria-selected={mode === 'summary'}
              onClick={() => setMode('summary')}
            >
              Summary
            </button>
            <button
              type="button"
              role="tab"
              className={`diff-rw-read-tab${mode === 'transcript' ? ' diff-rw-read-tab--active' : ''}`}
              aria-selected={mode === 'transcript'}
              onClick={() => setMode('transcript')}
              disabled={!youtubeId}
              title={youtubeId ? 'YouTube captions — click a time to jump' : 'No video for transcript'}
            >
              Transcript
            </button>
          </div>
        )}
      </div>
      {!expanded ? (
        <p className="diff-rw-summary diff-rw-summary--preview">{preview}</p>
      ) : mode === 'summary' ? (
        <div className="diff-rw-read-body">
          {story.headline && <p className="diff-rw-headline diff-rw-headline--body">{story.headline}</p>}
          <p className="diff-rw-summary diff-rw-summary--full">{story.summary || story.headline || '—'}</p>
        </div>
      ) : (
        <div className="diff-rw-read-body">
          {transcriptState === 'loading' && (
            <p className="diff-rw-status" role="status">
              Loading video transcript…
            </p>
          )}
          {transcriptState === 'error' && (
            <p className="diff-rw-error" role="alert">
              No transcript for this clip — use Summary or watch the video.
            </p>
          )}
          {transcriptState === 'ready' && (
            <TranscriptCueList cues={transcriptCues} activeStart={activeCueStart} onSeek={handleSeekCue} />
          )}
        </div>
      )}
    </section>
  );
}

function StoryStage({
  story,
  index,
  diagnosis = '',
  active,
  onOpenFullView,
  caseId = null,
  onTranscriptSaved,
}) {
  const videoIframeRef = useRef(null);
  const primary = primaryVideoForStory(story);

  const handleSeekVideo = useCallback((seconds) => {
    seekYoutubeEmbed(videoIframeRef.current, seconds);
  }, []);
  const sourceLabel =
    story.source === 'deepseek'
      ? 'DeepSeek'
      : story.source === 'gemini'
        ? 'Gemini'
        : story.source === 'curated'
          ? 'curated'
          : null;

  return (
    <article
      className={`diff-rw-stage${active ? ' diff-rw-stage--active' : ''}`}
      hidden={!active}
      aria-hidden={!active}
    >
      <header className="diff-rw-stage-head">
        <span className="diff-rw-num" aria-hidden>
          {index + 1}
        </span>
        <div className="diff-rw-stage-titles">
          <h3 className="diff-rw-name">
            {story.name}
            {story.tier === 'adjacent' && (
              <span className="diff-rw-tier diff-rw-tier--adjacent"> · broader context</span>
            )}
            {story.tier !== 'adjacent' && (
              <span className="diff-rw-tier diff-rw-tier--direct"> · direct match</span>
            )}
            {sourceLabel && (
              <span className={`diff-rw-source diff-rw-source--${story.source}`}> · {sourceLabel}</span>
            )}
          </h3>
          {story.headline && <p className="diff-rw-headline">{story.headline}</p>}
        </div>
      </header>
      <StoryReadPanel
        story={story}
        youtubeId={primary?.youtubeId || null}
        caseId={caseId}
        videoTitle={primary?.title || story.headline || story.name}
        onSeekVideo={handleSeekVideo}
        onTranscriptSaved={onTranscriptSaved}
      />
      <StoryVideos
        videos={story.videos}
        patientName={story.name}
        diagnosis={diagnosis}
        onOpenFullView={onOpenFullView}
        videoIframeRef={videoIframeRef}
      />
    </article>
  );
}

export default function DifferentialRealWorldPanel({
  caseId,
  curatedStories = [],
  searchUrl = '',
  diagnosis = '',
  topic = '',
  chiefComplaint = '',
  hpiSnippet = '',
  active = false,
  prefetchParams = null,
  onTranscriptSaved,
}) {
  const [remoteStories, setRemoteStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [avatarLabel, setAvatarLabel] = useState('');

  const curated = useMemo(
    () => curatedStories.map((s) => ({ ...s, source: s.source || 'curated' })),
    [curatedStories],
  );

  const displayStories = useMemo(
    () => mergeStoriesByTier([...curated, ...remoteStories], 2),
    [curated, remoteStories],
  );

  const casePlaylist = useMemo(() => buildCasePlaylist(displayStories), [displayStories]);

  const openLightboxAt = useCallback(
    (youtubeId) => {
      const idx = casePlaylist.findIndex((v) => v.youtubeId === youtubeId);
      setLightboxIndex(idx >= 0 ? idx : 0);
      setLightboxOpen(true);
    },
    [casePlaylist],
  );

  const handleLightboxIndex = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(lightboxIndex) : next;
      setLightboxIndex(value);
      const item = casePlaylist[value];
      if (item?.storyIndex >= 0) setStoryIndex(item.storyIndex);
    },
    [casePlaylist, lightboxIndex],
  );

  const searchParams = useMemo(
    () =>
      prefetchParams || {
        caseId,
        topic,
        diagnosis,
        chiefComplaint,
        hpiSnippet,
      },
    [prefetchParams, caseId, topic, diagnosis, chiefComplaint, hpiSnippet],
  );

  const applySearchResult = useCallback((data) => {
    setRemoteStories(data.stories || []);
    setStoryIndex(0);
    setLightboxOpen(false);
    setMeta({
      source: data.source,
      provider: data.provider,
      model: data.model,
      webSearchQueries: data.webSearchQueries,
      videosRepaired: data.videosRepaired,
    });
  }, []);

  const runSearch = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError('');
      try {
        if (refresh) invalidateRealWorldPrefetch(caseId);
        const data = await prefetchRealWorldStories(searchParams, { refresh });
        applySearchResult(data);
      } catch (e) {
        setError(e?.message || 'Real-world search failed');
      } finally {
        setLoading(false);
      }
    },
    [applySearchResult, caseId, searchParams],
  );

  useEffect(() => {
    if (!caseId) return undefined;

    const syncFromCache = () => {
      const hit = getRealWorldPrefetch(caseId);
      if (hit?.status === 'ready' && hit.data) {
        applySearchResult(hit.data);
        setLoading(false);
        setError('');
        return;
      }
      setRemoteStories([]);
      setStoryIndex(0);
      setLightboxOpen(false);
      setMeta(null);
      if (hit?.status === 'loading') {
        setLoading(true);
        setError('');
      } else if (hit?.status === 'error') {
        setLoading(false);
        setError(hit.error?.message || 'Real-world search failed');
      } else {
        setLoading(true);
        setError('');
      }
    };

    syncFromCache();

    const unsub = subscribeRealWorldPrefetch((key, entry) => {
      if (key !== String(caseId)) return;
      if (entry.status === 'ready' && entry.data) {
        applySearchResult(entry.data);
        setLoading(false);
        setError('');
      } else if (entry.status === 'loading') {
        setLoading(true);
      } else if (entry.status === 'error') {
        setLoading(false);
        setError(entry.error?.message || 'Real-world search failed');
      }
    });

    void prefetchRealWorldStories(searchParams).catch(() => {});

    return unsub;
  }, [caseId, searchParams, applySearchResult]);

  useEffect(() => {
    if (!caseId) return;
    const local = readStoredCaseAvatarSource(caseId);
    if (local) {
      setSelectedAvatar(local);
      setAvatarLabel(local.patientName || local.title || '');
    }
    let cancelled = false;
    void readCaseAvatarSource(caseId).then((source) => {
      if (cancelled) return;
      setSelectedAvatar(source?.youtubeId ? source : null);
      setAvatarLabel(source?.patientName || source?.title || '');
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleSelectAvatar = useCallback(
    ({ youtubeId, title, patientName, storyId = null }) => {
      if (!caseId || !youtubeId) return;
      setAvatarError('');
      try {
        const data = setCaseAvatarFromVideo({
          caseId,
          youtubeId,
          title,
          patientName,
          storyId,
        });
        setSelectedAvatar(data.sourceVideo);
        setAvatarLabel(patientName || title || '');
        return data;
      } catch (e) {
        setAvatarError(String(e.message || e));
      }
    },
    [caseId],
  );

  useEffect(() => {
    if (storyIndex >= displayStories.length) setStoryIndex(0);
  }, [displayStories.length, storyIndex]);

  const fallbackUrl = searchUrl || buildYouTubeSearchUrl({ diagnosis, topic });
  const providerLabel = meta?.provider === 'gemini' ? 'Gemini' : 'DeepSeek + YouTube';

  return (
    <div className="diff-rw-panel diff-rw-panel--fit">
      <div className="diff-rw-toolbar">
        <p className="diff-rw-kicker">
          Real patients · {providerLabel}
          {meta?.source?.includes('cache') && ' · cached'}
          {meta?.videosRepaired && ' · videos fixed'}
          {casePlaylist.length > 0 && ` · ${casePlaylist.length} videos`}
          {selectedAvatar?.patientName && avatarLabel && (
            <span className="diff-rw-avatar-kicker"> · Avatar: {avatarLabel}</span>
          )}
        </p>
        <div className="diff-rw-toolbar-actions">
          <a className="diff-rw-search-inline" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
            More ↗
          </a>
          <button
            type="button"
            className="diff-rw-gemini-btn"
            onClick={() => void runSearch(true)}
            disabled={loading}
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {(loading && !displayStories.length) || error || avatarError || (loading && displayStories.length > 0) ? (
        <p
          className={error || avatarError ? 'diff-rw-error' : 'diff-rw-status'}
          role={error || avatarError ? 'alert' : 'status'}
        >
          {error || avatarError || (displayStories.length ? 'Checking video links…' : 'Finding patient stories…')}
        </p>
      ) : null}

      {displayStories.length > 0 && (
        <div className="diff-rw-story-tabs" role="tablist" aria-label="Patient stories">
          {displayStories.map((story, index) => {
            const primary = primaryVideoForStory(story);
            const storySelected =
              primary &&
              avatarPickMatches(selectedAvatar, {
                youtubeId: primary.youtubeId,
                patientName: primary.patientName,
                storyId: story.id,
              });
            return (
              <div
                key={`${story.id}-${index}`}
                role="tab"
                className={`diff-rw-story-tab${storyIndex === index ? ' diff-rw-story-tab--active' : ''}`}
                aria-selected={storyIndex === index}
              >
                <button
                  type="button"
                  className="diff-rw-story-tab-select"
                  onClick={() => setStoryIndex(index)}
                >
                  <span className="diff-rw-story-tab-num">{index + 1}</span>
                  <span className="diff-rw-story-tab-name">{story.name}</span>
                </button>
                {primary && (
                  <AvatarIconButton
                    selected={storySelected}
                    onClick={() =>
                      handleSelectAvatar({
                        youtubeId: primary.youtubeId,
                        title: primary.title,
                        patientName: primary.patientName,
                        storyId: story.id,
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {displayStories.length ? (
        <div className="diff-rw-stage-wrap">
          {displayStories.map((story, index) => (
            <StoryStage
              key={`${story.id}-${index}`}
              story={story}
              index={index}
              diagnosis={diagnosis}
              active={storyIndex === index}
              onOpenFullView={openLightboxAt}
              caseId={caseId}
              onTranscriptSaved={onTranscriptSaved}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <p className="diff-study-empty">
            No stories yet. Add DEEPSEEK_API_KEY to MeWorld/.env or search YouTube.
          </p>
        )
      )}

      <RealWorldVideoLightbox
        open={lightboxOpen}
        playlist={casePlaylist}
        index={lightboxIndex}
        onIndexChange={handleLightboxIndex}
        onClose={() => setLightboxOpen(false)}
        selectedAvatar={selectedAvatar}
        onSelectAvatar={handleSelectAvatar}
      />
    </div>
  );
}
