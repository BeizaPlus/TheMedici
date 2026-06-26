import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Full-viewport pre-call replay while pointer is over the briefing scene.
 * Pointer leave pauses and returns to the static case plate.
 */
export default function CasePrecallHoverReplay({
  active = false,
  videoUrl,
  posterUrl = null,
  title = 'Pre-call',
  onMediaReadyChange,
}) {
  const videoRef = useRef(null);
  const srcRef = useRef('');
  const [mediaReady, setMediaReady] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState('');

  const markReady = useCallback(
    (ready) => {
      setMediaReady(ready);
      onMediaReadyChange?.(ready);
    },
    [onMediaReadyChange],
  );

  const bindVideo = useCallback((el) => {
    if (!el || !videoUrl) return undefined;

    const revealMedia = () => markReady(true);
    const onPlaying = () => markReady(true);
    const onError = () => markReady(false);

    el.addEventListener('canplaythrough', revealMedia);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('error', onError);

    if (srcRef.current !== videoUrl) {
      srcRef.current = videoUrl;
      markReady(false);
      setLoadedUrl(videoUrl);
      el.src = videoUrl;
      el.muted = true;
      el.preload = 'auto';
      el.load();
    }

    return () => {
      el.removeEventListener('canplaythrough', revealMedia);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('error', onError);
    };
  }, [videoUrl, markReady]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return undefined;
    return bindVideo(el);
  }, [bindVideo, videoUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !loadedUrl) return undefined;
    if (!active) {
      el.pause();
      el.currentTime = 0;
      return undefined;
    }
    if (!mediaReady) return undefined;
    el.currentTime = 0;
    el.muted = true;
    void el.play().catch(() => {});
    return () => {
      el.pause();
      el.currentTime = 0;
    };
  }, [active, loadedUrl, mediaReady]);

  if (!videoUrl) return null;

  const showOverlay = active && mediaReady;

  return (
    <div
      className={`case-precall-intro case-precall-intro--hover-replay${active ? ' is-active' : ''}${mediaReady ? ' is-media-ready' : ''}`}
      aria-hidden={!showOverlay}
    >
      <div className="case-precall-intro-stack">
        <video
          ref={videoRef}
          className={`case-precall-intro-video${mediaReady ? ' is-ready' : ''}`}
          muted
          playsInline
          preload="auto"
          loop
        />
        {posterUrl ? (
          <img
            className={`case-precall-intro-poster${showOverlay ? ' is-hidden' : ''}`}
            src={posterUrl}
            alt=""
            aria-hidden
          />
        ) : null}
      </div>
      <div className="case-precall-intro-caption">
        <span className="case-precall-intro-kicker">Pre-call</span>
        <p className="case-precall-intro-title">{title}</p>
      </div>
    </div>
  );
}
