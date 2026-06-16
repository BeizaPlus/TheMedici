import { useCallback, useEffect, useRef, useState } from 'react';
import { getPatientScene } from '../data/gameData.js';
import {
  getBuiltInPatientSrc,
  isValidSceneSrc,
  resolveSceneSrc,
} from '../lib/patientImage.js';
import { STORAGE } from '../lib/storageKeys.js';
import {
  preloadPrivateVideos,
  resolvePrivateVideoSrc,
  VIDEO_NO_DOWNLOAD_ATTRS,
} from '../lib/privateVideoSrc.js';

const idleVideos = [
  '/assets/video/breathing_01.mp4',
  '/assets/video/breathing_02.mp4',
  '/assets/video/breathing_03.mp4',
];

const DEATH_VIDEO = '/assets/video/death.mp4';
const IDLE_CROSSFADE_MS = 800;

function pickIdle(exclude) {
  const pool = exclude ? idleVideos.filter((src) => src !== exclude) : idleVideos;
  if (pool.length === 0) return idleVideos[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slotSrc(slot) {
  if (!slot) return '';
  const logical = slot.dataset?.assetSrc;
  if (logical) return logical;
  const attr = slot.getAttribute('src');
  if (attr) return attr;
  const url = slot.currentSrc || slot.src;
  if (!url) return '';
  try {
    const path = new URL(url, window.location.href).pathname;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return url;
  }
}

const videoLayerStyle = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

const videoStyleBase = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: '100%',
  minHeight: '100%',
  width: 'auto',
  height: 'auto',
  maxWidth: 'none',
  objectFit: 'cover',
  pointerEvents: 'none',
  userSelect: 'none',
};

export default function PatientScene({
  scene = null,
  className = 'patient-scene-img',
  imgRef = null,
  onLoad = null,
  onSceneError = null,
  forceSrc = null,
  showVideoBackground = true,
  caseData = null,
}) {
  const cfg = scene || getPatientScene();
  const overrideSrc =
    typeof window !== 'undefined' ? window.localStorage?.getItem(STORAGE.patientImage) : null;
  const safeForce = isValidSceneSrc(forceSrc) ? forceSrc : null;
  const safeOverride = isValidSceneSrc(overrideSrc) ? overrideSrc : null;
  const builtinSrc = getBuiltInPatientSrc(caseData) || cfg?.src || '/assets/patient/patient-scene.png';

  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const displaySrc = useVideoFallback
    ? builtinSrc
    : resolveSceneSrc({
        forceSrc: safeForce,
        overrideSrc: safeOverride,
        sceneSrc: cfg?.src,
        caseData,
      });

  const wantsCustom = Boolean(safeForce || safeOverride) && !useVideoFallback;
  const showCustomScene = wantsCustom && displaySrc !== builtinSrc;
  /** Ambient breathing videos only — static image always on top (avoids black screen if autoplay fails). */
  const showAmbientVideo = showVideoBackground && !showCustomScene && !useVideoFallback;

  const activeRef = useRef(null);
  const nextRef = useRef(null);
  const deathRef = useRef(null);
  const idleSwappingRef = useRef(false);
  const [frontKey, setFrontKey] = useState('active');
  const [crossfading, setCrossfading] = useState(false);

  const frontRef = frontKey === 'active' ? activeRef : nextRef;
  const backRef = frontKey === 'active' ? nextRef : activeRef;

  useEffect(() => {
    setUseVideoFallback(false);
  }, [safeForce, safeOverride, cfg?.src, caseData?.id]);

  const loadSlot = useCallback(async (slot, videoSrc) => {
    if (!slot) return;
    slot.dataset.assetSrc = videoSrc;
    const blobSrc = await resolvePrivateVideoSrc(videoSrc);
    slot.src = blobSrc;
    slot.loop = false;
    slot.muted = true;
    slot.playsInline = true;
    slot.load();
  }, []);

  const crossfadeIdle = useCallback(async () => {
    if (idleSwappingRef.current || !showAmbientVideo) return;
    const frontSlot = frontRef.current;
    const backSlot = backRef.current;
    if (!frontSlot || !backSlot) return;

    idleSwappingRef.current = true;
    try {
      await backSlot.play().catch(() => {});
      setCrossfading(true);
      await sleep(IDLE_CROSSFADE_MS);

      frontSlot.pause();
      frontSlot.currentTime = 0;
      setCrossfading(false);
      setFrontKey((key) => (key === 'active' ? 'next' : 'active'));

      const nextFront = frontKey === 'active' ? nextRef.current : activeRef.current;
      const nextBack = frontKey === 'active' ? activeRef.current : nextRef.current;
      loadSlot(nextBack, pickIdle(slotSrc(nextFront)));
    } finally {
      idleSwappingRef.current = false;
    }
  }, [backRef, frontKey, frontRef, loadSlot, showAmbientVideo]);

  const onIdleEnded = useCallback(() => {
    crossfadeIdle();
  }, [crossfadeIdle]);

  useEffect(() => {
    preloadPrivateVideos([...idleVideos, DEATH_VIDEO]);
  }, []);

  useEffect(() => {
    if (!showAmbientVideo) return undefined;

    let cancelled = false;
    idleSwappingRef.current = false;
    setFrontKey('active');
    const activeSlot = activeRef.current;
    const nextSlot = nextRef.current;
    if (!activeSlot || !nextSlot) return undefined;

    const start = pickIdle(null);
    Promise.all([loadSlot(activeSlot, start), loadSlot(nextSlot, pickIdle(start))]).then(() => {
      if (cancelled) return;
      activeSlot.addEventListener('ended', onIdleEnded);
      activeSlot.play().catch(() => {});
    });

    return () => {
      cancelled = true;
      activeSlot.removeEventListener('ended', onIdleEnded);
      activeSlot.pause();
      nextSlot.pause();
    };
  }, [loadSlot, onIdleEnded, showAmbientVideo]);

  useEffect(() => {
    const deathSlot = deathRef.current;
    if (!deathSlot || !showAmbientVideo) return undefined;
    let cancelled = false;
    resolvePrivateVideoSrc(DEATH_VIDEO).then((blobSrc) => {
      if (!cancelled) deathSlot.src = blobSrc;
    });
    return () => {
      cancelled = true;
    };
  }, [showAmbientVideo]);

  useEffect(() => {
    const frontSlot = frontRef.current;
    if (!frontSlot || !showAmbientVideo) return undefined;

    const handler = () => onIdleEnded();
    frontSlot.addEventListener('ended', handler);
    return () => frontSlot.removeEventListener('ended', handler);
  }, [frontKey, frontRef, onIdleEnded, showAmbientVideo]);

  const handleImgError = useCallback(() => {
    onSceneError?.();
    if (!useVideoFallback) {
      setUseVideoFallback(true);
      onLoad?.();
    }
  }, [onLoad, onSceneError, useVideoFallback]);

  const slotOpacity = (key) => {
    const isFront = key === frontKey;
    if (crossfading) return isFront ? 0 : 1;
    return isFront ? 1 : 0;
  };

  const slotZIndex = (key) => {
    const isFront = key === frontKey;
    if (crossfading) return isFront ? 0 : 1;
    return isFront ? 1 : 0;
  };

  return (
    <>
      {showAmbientVideo && (
        <div className="video-layer patient-scene-video" style={videoLayerStyle}>
          <video
            ref={activeRef}
            className="idle-slot is-front patient-scene-img"
            muted
            playsInline
            preload="auto"
            {...VIDEO_NO_DOWNLOAD_ATTRS}
            style={{
              ...videoStyleBase,
              objectPosition: cfg.objectPosition || 'center center',
              transition: crossfading ? `opacity ${IDLE_CROSSFADE_MS}ms ease` : 'none',
              opacity: slotOpacity('active'),
              zIndex: slotZIndex('active'),
            }}
          />
          <video
            ref={nextRef}
            className="idle-slot is-back patient-scene-img"
            muted
            playsInline
            preload="auto"
            {...VIDEO_NO_DOWNLOAD_ATTRS}
            style={{
              ...videoStyleBase,
              objectPosition: cfg.objectPosition || 'center center',
              transition: crossfading ? `opacity ${IDLE_CROSSFADE_MS}ms ease` : 'none',
              opacity: slotOpacity('next'),
              zIndex: slotZIndex('next'),
            }}
          />
          <video
            ref={deathRef}
            id="death"
            className="patient-scene-img"
            muted
            playsInline
            preload="auto"
            {...VIDEO_NO_DOWNLOAD_ATTRS}
            style={{
              ...videoStyleBase,
              objectPosition: cfg.objectPosition || 'center center',
              opacity: 0,
              zIndex: 0,
            }}
          />
        </div>
      )}
      <img
        ref={imgRef}
        className={className}
        src={displaySrc}
        alt="Patient in hospital bed"
        draggable={false}
        onLoad={onLoad}
        onError={handleImgError}
        style={{
          objectFit: cfg.objectFit || 'cover',
          objectPosition: cfg.objectPosition || 'center',
          opacity: 1,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
