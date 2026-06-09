import { useCallback, useEffect, useRef } from 'react';

export default function CaseTeachingVideoOverlay({
  src,
  open = false,
  frozen = false,
  objectPosition = 'center center',
  onEnded,
  onSkip,
  onError,
}) {
  const videoRef = useRef(null);
  const endedRef = useRef(false);
  const playTokenRef = useRef(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const freezeFrame = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;

    const seekToEnd = () => {
      try {
        el.pause();
        if (Number.isFinite(el.duration) && el.duration > 0) {
          el.currentTime = Math.max(0, el.duration - 0.05);
        }
      } catch {
        /* ignore seek errors */
      }
    };

    if (Number.isFinite(el.duration) && el.duration > 0) {
      seekToEnd();
      return;
    }

    el.addEventListener('loadedmetadata', seekToEnd, { once: true });
  }, []);

  useEffect(() => {
    if (!open || !src) {
      endedRef.current = false;
      playTokenRef.current = null;
      return undefined;
    }
    if (frozen || endedRef.current) return undefined;

    const token = src;
    if (playTokenRef.current === token) return undefined;
    playTokenRef.current = token;

    const el = videoRef.current;
    if (!el) return undefined;

    let cancelled = false;

    const startPlayback = () => {
      if (cancelled || endedRef.current || frozen || playTokenRef.current !== token) return;
      if (!el.paused && el.currentTime > 0.15) return;
      el.muted = false;
      el.currentTime = 0;
      el.play().catch(() => {
        if (cancelled) return;
        el.muted = true;
        el.play().catch(() => {
          onErrorRef.current?.('Tap play on the video to continue.');
        });
      });
    };

    el.preload = 'auto';
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
    } else {
      el.addEventListener('canplay', startPlayback, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [open, src, frozen]);

  useEffect(() => {
    if (open && frozen) freezeFrame();
  }, [open, frozen, freezeFrame]);

  const handleEnded = () => {
    endedRef.current = true;
    freezeFrame();
    onEnded?.();
  };

  const handleSkip = () => {
    endedRef.current = true;
    freezeFrame();
    onSkip?.();
  };

  if (!open || !src) return null;

  return (
    <div
      className={`thanks-video-overlay ${frozen ? 'frozen' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Case teaching video"
    >
      <p className="thanks-video-kicker">Teaching video — learn the case takeaway</p>
      <video
        ref={videoRef}
        className="thanks-video-player"
        src={src}
        style={{ objectPosition }}
        playsInline
        preload="auto"
        muted
        onError={() => onError?.('Video failed to load. Check public/assets/video paths.')}
        onEnded={handleEnded}
      />
      {!frozen && (
        <button type="button" className="thanks-video-skip btn-ghost" onClick={handleSkip}>
          Skip →
        </button>
      )}
    </div>
  );
}
