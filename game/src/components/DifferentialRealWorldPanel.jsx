import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildYouTubeSearchUrl, youtubeEmbedUrl } from '../lib/realWorldCases.js';
import { fetchGeminiRealWorld } from '../lib/fetchGeminiRealWorld.js';

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
                Video {index + 1} of {total} — click sides or use ← →
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
            {hasMultiple && (
              <>
                <button
                  type="button"
                  className="diff-rw-lightbox-hit diff-rw-lightbox-hit--prev"
                  onClick={() => step(-1)}
                  aria-label="Previous video"
                />
                <button
                  type="button"
                  className="diff-rw-lightbox-hit diff-rw-lightbox-hit--next"
                  onClick={() => step(1)}
                  aria-label="Next video"
                />
              </>
            )}
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
          {hasMultiple && (
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

function StoryVideos({ videos = [], patientName = '', diagnosis = '', onOpenFullView }) {
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
      <button
        type="button"
        className="diff-rw-iframe-wrap"
        onClick={openFull}
        aria-label={`Play ${current.title} in full view`}
      >
        <iframe
          title={current.title}
          src={youtubeEmbedUrl(current.youtubeId)}
          loading="lazy"
          tabIndex={-1}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <span className="diff-rw-iframe-expand-hint" aria-hidden>
          Tap for full view
        </span>
      </button>
    </div>
  );
}

function StoryStage({ story, index, diagnosis = '', active, onOpenFullView }) {
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
            {sourceLabel && (
              <span className={`diff-rw-source diff-rw-source--${story.source}`}> · {sourceLabel}</span>
            )}
          </h3>
          {story.headline && <p className="diff-rw-headline">{story.headline}</p>}
        </div>
      </header>
      {story.summary && <p className="diff-rw-summary">{story.summary}</p>}
      <StoryVideos
        videos={story.videos}
        patientName={story.name}
        diagnosis={diagnosis}
        onOpenFullView={onOpenFullView}
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
}) {
  const [remoteStories, setRemoteStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  const curated = useMemo(
    () => curatedStories.map((s) => ({ ...s, source: s.source || 'curated' })),
    [curatedStories],
  );

  const displayStories = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of [...curated, ...remoteStories]) {
      const key = `${s.name}|${s.headline}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 2) break;
    }
    return out;
  }, [curated, remoteStories]);

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

  const runSearch = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchGeminiRealWorld({
          caseId,
          topic,
          diagnosis,
          chiefComplaint,
          hpiSnippet,
          refresh,
        });
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
      } catch (e) {
        setError(e?.message || 'Real-world search failed');
      } finally {
        setLoading(false);
      }
    },
    [caseId, topic, diagnosis, chiefComplaint, hpiSnippet],
  );

  useEffect(() => {
    if (!active || !caseId) return;
    setRemoteStories([]);
    setStoryIndex(0);
    setLightboxOpen(false);
    setMeta(null);
    void runSearch(false);
  }, [active, caseId, runSearch]);

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

      {(loading && !displayStories.length) || error || (loading && displayStories.length > 0) ? (
        <p
          className={error ? 'diff-rw-error' : 'diff-rw-status'}
          role={error ? 'alert' : 'status'}
        >
          {error || (displayStories.length ? 'Checking video links…' : 'Finding patient stories…')}
        </p>
      ) : null}

      {displayStories.length > 1 && (
        <div className="diff-rw-story-tabs" role="tablist" aria-label="Patient stories">
          {displayStories.map((story, index) => (
            <button
              key={`${story.id}-${index}`}
              type="button"
              role="tab"
              className={`diff-rw-story-tab${storyIndex === index ? ' diff-rw-story-tab--active' : ''}`}
              aria-selected={storyIndex === index}
              onClick={() => setStoryIndex(index)}
            >
              <span className="diff-rw-story-tab-num">{index + 1}</span>
              <span className="diff-rw-story-tab-name">{story.name}</span>
            </button>
          ))}
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
      />
    </div>
  );
}
