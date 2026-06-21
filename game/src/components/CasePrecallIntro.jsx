import { useCallback, useEffect, useRef, useState } from 'react';
import { markCasePrecallSkipped } from '../lib/resolveCasePrecall.js';

/**
 * Pre-hospital cinematic overlay (e.g. U12 truck brake on I-80) before briefing.
 * Plays once; skip persists for the session.
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
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('done');
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    if (caseId) markCasePrecallSkipped(caseId);
    finish();
  }, [caseId, finish]);

  useEffect(() => {
    const timer = window.setTimeout(finish, (durationSec + 1) * 1000);
    return () => window.clearTimeout(timer);
  }, [durationSec, finish]);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return undefined;
    const el = videoRef.current;
    const onCanPlay = () => setVideoReady(true);
    const onError = () => setVideoReady(false);
    const onEnded = () => finish();
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);
    void el.play().catch(() => setVideoReady(false));
    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, [videoUrl, finish]);

  useEffect(() => {
    const root = document.querySelector('.case-precall-intro');
    if (!root) return undefined;
    let startX = null;
    let startY = null;
    const onMove = (event) => {
      if (startX == null) {
        startX = event.clientX;
        startY = event.clientY;
        return;
      }
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > 48) {
        skip();
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [skip]);

  if (phase === 'done') return null;

  const showPoster = posterUrl && !videoReady;

  return (
    <div className="case-precall-intro" role="dialog" aria-label={title}>
      {videoUrl ? (
        <video
          ref={videoRef}
          className="case-precall-intro-video"
          src={videoUrl}
          poster={posterUrl || undefined}
          muted
          playsInline
          autoPlay
        />
      ) : null}
      {showPoster ? (
        <img className="case-precall-intro-poster" src={posterUrl} alt="" aria-hidden />
      ) : null}
      <div className="case-precall-intro-caption">
        <span className="case-precall-intro-kicker">Pre-call</span>
        <p className="case-precall-intro-title">{title}</p>
      </div>
      <button type="button" className="case-precall-intro-skip btn-ghost" onClick={skip}>
        Skip to briefing
      </button>
    </div>
  );
}
