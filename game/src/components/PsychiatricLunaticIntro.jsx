import { useCallback, useEffect, useRef, useState } from 'react';

const INTRO_SKIP_KEY = 'meworld-psych-lunatic-intro-skip';

/**
 * Bizarre psychiatric case-entry loop overlay (~15s).
 * Plays Comfy MP4 when shipped; CSS throw + lens-spill fallback while pending.
 */
export default function PsychiatricLunaticIntro({
  anchorUrl,
  videoUrl = null,
  durationSec = 15,
  caseId = '',
  onComplete,
}) {
  const [phase, setPhase] = useState('idle');
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    setPhase('done');
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    if (caseId) {
      try {
        sessionStorage.setItem(`${INTRO_SKIP_KEY}:${caseId}`, '1');
      } catch {
        /* ignore */
      }
    }
    finish();
  }, [caseId, finish]);

  useEffect(() => {
    if (startedRef.current) return undefined;
    startedRef.current = true;
    setPhase('playing');
    const timer = window.setTimeout(finish, durationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [durationSec, finish]);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return undefined;
    const el = videoRef.current;
    const onCanPlay = () => setVideoReady(true);
    const onError = () => setVideoReady(false);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);
    void el.play().catch(() => setVideoReady(false));
    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
    };
  }, [videoUrl]);

  if (phase === 'done') return null;

  const useVideo = Boolean(videoUrl && videoReady);

  return (
    <div
      className={`psych-lunatic-intro ${useVideo ? 'psych-lunatic-intro--video' : 'psych-lunatic-intro--css'}`}
      role="presentation"
      aria-hidden
    >
      {useVideo ? (
        <video
          ref={videoRef}
          className="psych-lunatic-intro-video"
          src={videoUrl}
          muted
          playsInline
          loop
        />
      ) : (
        <>
          <img className="psych-lunatic-intro-anchor" src={anchorUrl} alt="" />
          <div className="psych-lunatic-intro-throw" />
          <div className="psych-lunatic-intro-spill" />
          <div className="psych-lunatic-intro-shake" />
        </>
      )}
      <button type="button" className="psych-lunatic-intro-skip btn-ghost" onClick={skip}>
        Skip intro
      </button>
    </div>
  );
}

export function shouldSkipPsychiatricLunaticIntro(caseId) {
  if (!caseId) return false;
  try {
    return sessionStorage.getItem(`${INTRO_SKIP_KEY}:${caseId}`) === '1';
  } catch {
    return false;
  }
}
