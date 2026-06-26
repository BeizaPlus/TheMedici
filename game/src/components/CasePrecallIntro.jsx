import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pre-hospital cinematic overlay (e.g. U12 truck brake on I-80) before briefing.
 * Autoplays on load; learner can skip, begin case, or browse — watching is optional.
 */
export default function CasePrecallIntro({
  videoUrl,
  posterUrl = null,
  title = 'Pre-hospital',
  durationSec = 6,
  caseId = '',
  onComplete,
}) {
  const [phase, setPhase] = useState('playing');
  const [mediaReady, setMediaReady] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const srcRef = useRef('');

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('done');
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const tryPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    void el
      .play()
      .then(() => {
        setNeedsTap(false);
        setMediaReady(true);
      })
      .catch(() => setNeedsTap(true));
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    setPhase('playing');
    setMediaReady(false);
    setNeedsTap(false);
    srcRef.current = '';
  }, [videoUrl]);

  useEffect(() => {
    if (!mediaReady) return undefined;
    const fallbackMs = Math.max((durationSec + 4) * 1000, 12000);
    const timer = window.setTimeout(finish, fallbackMs);
    return () => window.clearTimeout(timer);
  }, [mediaReady, durationSec, finish]);

  useEffect(() => {
    if (!videoUrl) return undefined;
    const el = videoRef.current;
    if (!el) return undefined;

    const revealMedia = () => setMediaReady(true);
    const onPlaying = () => {
      setMediaReady(true);
      setNeedsTap(false);
    };
    const onError = () => {
      setMediaReady(false);
      setNeedsTap(true);
    };
    const onEnded = () => finish();

    el.addEventListener('canplaythrough', revealMedia);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);

    if (srcRef.current !== videoUrl) {
      srcRef.current = videoUrl;
      el.src = videoUrl;
    }
    el.muted = true;
    el.preload = 'auto';
    tryPlay();

    return () => {
      el.removeEventListener('canplaythrough', revealMedia);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, [videoUrl, finish, tryPlay]);

  if (phase === 'done') return null;

  const showPoster = Boolean(posterUrl);

  return (
    <div className="case-precall-intro" role="dialog" aria-label={title}>
      <div className="case-precall-intro-stack">
        {videoUrl ? (
          <video
            ref={videoRef}
            className={`case-precall-intro-video${mediaReady ? ' is-ready' : ''}`}
            muted
            playsInline
            preload="auto"
          />
        ) : null}
        {showPoster ? (
          <img
            className={`case-precall-intro-poster${mediaReady ? ' is-hidden' : ''}`}
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
      {needsTap ? (
        <button type="button" className="case-precall-intro-play btn-primary" onClick={tryPlay}>
          Tap to play
        </button>
      ) : null}
      <button type="button" className="case-precall-intro-skip btn-ghost" onClick={skip}>
        Skip to briefing
      </button>
    </div>
  );
}
