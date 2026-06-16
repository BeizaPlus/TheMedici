import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  FiCrosshair,
  FiGitBranch,
  FiLogOut,
  FiSettings,
  FiUser,
  FiZap,
} from 'react-icons/fi';
import { apiUrl } from '../lib/apiBase.js';
import { getCatalog, getCaseById } from '../data/useCcsCatalog.js';
import { getBranding } from '../data/gameData.js';
import {
  getCompletionStats,
  getLastPlayedCaseId,
  pickRandomId,
  readProgress,
} from '../data/caseProgress.js';
import { clearVisionZones, scrubInvalidSceneStorage } from '../lib/patientImage.js';
import { readTheme, writeTheme } from '../lib/theme.js';
import { defaultBriefingUiLayout, writeBriefingUiLayout } from '../lib/briefingUiLayout.js';
import {
  defaultBriefingDockLayout,
  writePlayDockLayout,
} from '../lib/playDockLayout.js';
import { applyPlayUiFavorite } from '../lib/playUiFavorite.js';
import { STORAGE } from '../lib/storageKeys.js';
import {
  getAllowedCaseIds,
  getConditionChoices,
  levelFromSlider,
  readAudienceProfile,
  sliderFromLevel,
  writeAudienceProfile,
} from '../lib/audienceProfile.js';
import {
  DEFAULT_NAME_REGION,
  NAME_REGION_CHOICES,
  normalizeNameRegion,
} from '../lib/patientNameRegions.js';
import { DEFAULT_TIMER_SECONDS, normalizeTimerSeconds } from '../lib/caseTimer.js';
import { getReadyPracticeCount, getStackTestingCount } from '../lib/caseReadyPractice.js';
import { getFavoriteCount, getFlaggedReviewCount } from '../data/caseProgress.js';
import { fetchOverallUserStats } from '../lib/caseUserLog.js';
import { getCaseVisitHistory, formatCaseVisitWhen } from '../lib/caseVisitHistory.js';
import { toTitleCase } from '../lib/clinicalTextFormat.js';
import {
  applyPhysicianProfile,
  hasCompletedOnboarding,
  markOnboardingComplete,
} from '../lib/onboarding.js';
import { endSessionMonitor } from '../lib/audio.js';
import GridPlacementLayer from './GridPlacementLayer.jsx';
import AudioSettingsPanel from './AudioSettingsPanel.jsx';
import GlobalUiSettingsPanel from './GlobalUiSettingsPanel.jsx';
import ResumeSessionBanner from './ResumeSessionBanner.jsx';
import {
  createGridItem,
  moveGridItem,
  readGridItems,
  writeGridItems,
} from '../lib/gridPlacement.js';
import { usePrivateVideoSrc } from '../hooks/usePrivateVideoSrc.js';
import { VIDEO_NO_DOWNLOAD_ATTRS } from '../lib/privateVideoSrc.js';

const NAV = [
  { id: 'play', label: 'Play', Icon: FiZap, action: 'play' },
  { id: 'continue', label: 'Continue', Icon: FiCrosshair, action: 'continue' },
  { id: 'differential', label: 'Differentials', Icon: FiGitBranch, action: 'differential' },
  { id: 'profiles', label: 'Profiles', Icon: FiUser, action: 'panel' },
  { id: 'settings', label: 'Settings', Icon: FiSettings, action: 'panel' },
  { id: 'exit', label: 'Exit', Icon: FiLogOut, action: 'exit' },
];

export default function WelcomeScreen({
  onPlay,
  onOpenCases,
  onOpenReadyCases,
  onOpenStackTestingCases,
  onOpenFavoritesCases,
  onOpenFlaggedCases,
  onOpenRecentCases,
  onOpenDifferential,
  resumeCheckpoint,
  resumeCase,
  onResumeSession,
  onDiscardSession,
  studioBuild = false,
}) {
  const brand = getBranding();
  const plateSrc = brand.welcomePlate || '/welcome-plate.png';
  const plateVideoSrc = brand.welcomePlateVideo || '';
  const resolvedPlateVideoSrc = usePrivateVideoSrc(plateVideoSrc);
  const plateVideoLoop =
    brand.welcomePlateVideoHoldLastFrame === false ? brand.welcomePlateVideoLoop !== false : false;
  const holdLastFrame = brand.welcomePlateVideoHoldLastFrame !== false;
  const plateVideoIdleMs = Number(brand.welcomePlateVideoIdleMs) > 0 ? Number(brand.welcomePlateVideoIdleMs) : 3000;
  const welcomeVideoRef = useRef(null);
  const idleTimerRef = useRef(null);
  const replayLockRef = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [idleVideoTriggered, setIdleVideoTriggered] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoAtEnd, setVideoAtEnd] = useState(false);
  const [lastFrameSrc, setLastFrameSrc] = useState('');
  const hasPlateVideo = Boolean(plateVideoSrc && resolvedPlateVideoSrc) && !videoFailed;
  const plateStillSrc = lastFrameSrc || plateSrc;

  useEffect(() => {
    void endSessionMonitor({ fadeMs: 400 });
  }, []);

  const silenceWelcomeVideo = useCallback(() => {
    const el = welcomeVideoRef.current;
    if (!el) return;
    el.muted = true;
    el.volume = 0;
    el.defaultMuted = true;
  }, []);

  const captureWelcomeLastFrame = useCallback(() => {
    const el = welcomeVideoRef.current;
    if (!el || el.videoWidth <= 0) {
      setVideoPlaying(false);
      setVideoAtEnd(true);
      return;
    }

    const paintStill = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = el.videoWidth;
        canvas.height = el.videoHeight;
        canvas.getContext('2d')?.drawImage(el, 0, 0);
        setLastFrameSrc(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        /* same-origin asset — ignore capture failures */
      }
      el.pause();
      setVideoPlaying(false);
      setVideoAtEnd(true);
    };

    // `ended` already leaves the decoder on the last frame — avoid seeking (causes flash).
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      paintStill();
      return;
    }

    const onSeeked = () => {
      el.removeEventListener('seeked', onSeeked);
      paintStill();
    };
    el.addEventListener('seeked', onSeeked, { once: true });
    const dur = el.duration;
    if (Number.isFinite(dur) && dur > 0) {
      el.currentTime = Math.max(0, dur - 0.04);
    } else {
      paintStill();
    }
  }, []);

  const replayWelcomeVideo = useCallback(() => {
    const el = welcomeVideoRef.current;
    if (!el || replayLockRef.current) return;
    replayLockRef.current = true;
    setVideoAtEnd(false);
    setLastFrameSrc('');
    setVideoPlaying(true);
    el.currentTime = 0;
    silenceWelcomeVideo();
    void el.play().catch(() => setVideoFailed(true));
    window.setTimeout(() => {
      replayLockRef.current = false;
    }, 1500);
  }, [silenceWelcomeVideo]);

  useEffect(() => {
    if (!hasPlateVideo) return undefined;

    const armIdleTimer = () => {
      if (videoAtEnd || idleVideoTriggered) return;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setIdleVideoTriggered(true);
      }, plateVideoIdleMs);
    };

    const onActivity = () => {
      if (videoAtEnd) {
        replayWelcomeVideo();
        return;
      }
      armIdleTimer();
    };

    armIdleTimer();
    const events = ['mousemove', 'pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [
    hasPlateVideo,
    idleVideoTriggered,
    plateVideoIdleMs,
    videoAtEnd,
    replayWelcomeVideo,
  ]);

  useEffect(() => {
    if (!idleVideoTriggered || !hasPlateVideo) return undefined;
    const el = welcomeVideoRef.current;
    if (!el) return undefined;
    silenceWelcomeVideo();
    const play = () => {
      silenceWelcomeVideo();
      void el.play().catch(() => setVideoFailed(true));
    };
    play();
    el.addEventListener('canplay', play);
    return () => el.removeEventListener('canplay', play);
  }, [idleVideoTriggered, hasPlateVideo, silenceWelcomeVideo]);
  const catalog = getCatalog();
  const stats = useMemo(() => getCompletionStats(catalog.totalCases), [catalog.totalCases]);
  const readyCount = getReadyPracticeCount();
  const stackTestingCount = useMemo(() => getStackTestingCount(catalog.cases), [catalog.cases]);
  const [activeNav, setActiveNav] = useState('play');
  const [panel, setPanel] = useState(null);
  const favoriteCount = useMemo(() => getFavoriteCount(), [panel]);
  const flaggedCount = useMemo(() => getFlaggedReviewCount(), [panel]);
  const lastCaseId = useMemo(() => getLastPlayedCaseId(), []);
  const lastCase = lastCaseId ? getCaseById(lastCaseId) : null;
  const [theme, setTheme] = useState(() => readTheme());
  const [showGrid, setShowGrid] = useState(studioBuild);
  const [placeMode, setPlaceMode] = useState(studioBuild);
  const [gridItems, setGridItems] = useState(() => readGridItems(STORAGE.welcomeGridItems));
  const [selectedGridId, setSelectedGridId] = useState(null);
  const [placingNavId, setPlacingNavId] = useState(null);
  const [audienceReady, setAudienceReady] = useState(() => hasCompletedOnboarding());
  const [showFullSetup, setShowFullSetup] = useState(false);
  const [condition, setCondition] = useState('diabetes');
  const [understanding, setUnderstanding] = useState(1);
  const [playRole, setPlayRole] = useState('doctor');
  const [difficulty, setDifficulty] = useState('standard');
  const [timerMinutes, setTimerMinutes] = useState(2.5);
  const [nameRegion, setNameRegion] = useState(DEFAULT_NAME_REGION);
  const [learningMode, setLearningMode] = useState(true);
  const magicFileRef = useRef(null);
  const [patientSet, setPatientSet] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE.patientImage));
    } catch {
      return false;
    }
  });
  const [magicEmail, setMagicEmail] = useState('');
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const [magicMsg, setMagicMsg] = useState('');
  const [journalStats, setJournalStats] = useState(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const visitHistory = useMemo(() => {
    void historyVersion;
    void panel;
    return getCaseVisitHistory({ limit: 12 });
  }, [historyVersion, panel]);
  const audienceLevel = useMemo(() => levelFromSlider(understanding), [understanding]);
  const conditionChoices = useMemo(() => getConditionChoices(audienceLevel), [audienceLevel]);
  useEffect(() => {
    if (!conditionChoices.some((c) => c.id === condition)) {
      setCondition(conditionChoices[0]?.id || 'diabetes');
    }
  }, [conditionChoices, condition]);
  const allowedCaseIds = useMemo(
    () => getAllowedCaseIds(catalog.cases, { level: audienceLevel, condition }),
    [catalog.cases, audienceLevel, condition],
  );

  const persistGrid = useCallback((next) => {
    setGridItems(next);
    writeGridItems(STORAGE.welcomeGridItems, next);
  }, []);

  useEffect(() => {
    if (!studioBuild) return;
    writeGridItems(STORAGE.welcomeGridItems, gridItems);
  }, [studioBuild, gridItems]);

  useEffect(() => {
    const saved = readAudienceProfile();
    if (!saved) return;
    setCondition(saved.condition);
    setUnderstanding(sliderFromLevel(saved.level));
    if (saved.playRole) setPlayRole(saved.playRole);
    if (saved.difficulty) setDifficulty(saved.difficulty);
    if (saved.timerSeconds) setTimerMinutes(Math.round((saved.timerSeconds / 60) * 10) / 10);
    if (saved.nameRegion) setNameRegion(normalizeNameRegion(saved.nameRegion));
    if (saved.learningMode === false) setLearningMode(false);
  }, []);

  useEffect(() => {
    if (panel !== 'profiles') return undefined;
    setHistoryVersion((v) => v + 1);
    let cancelled = false;
    fetchOverallUserStats().then((stats) => {
      if (!cancelled) setJournalStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [panel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('magic');
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl(`/api/magic/${encodeURIComponent(token)}`));
        if (!r.ok) throw new Error('Magic link invalid or expired');
        const data = await r.json();
        const url = `data:${data.mimeType || 'image/png'};base64,${data.personalizedImageBase64}`;
        localStorage.setItem(STORAGE.patientImage, url);
        localStorage.setItem(STORAGE.patientMime, data.mimeType || 'image/png');
        clearVisionZones();
        if (!cancelled) {
          setPatientSet(true);
          setMagicMsg('Personalized photo loaded from your magic link.');
        }
        const next = new URL(window.location.href);
        next.searchParams.delete('magic');
        window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
      } catch (e) {
        if (!cancelled) setMagicMsg(e.message || 'Could not apply magic link.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlay = () => {
    const allCaseIds = catalog.cases.map((c) => c.id);
    const pool = allowedCaseIds.length ? allowedCaseIds : allCaseIds;
    const id = pickRandomId(pool);
    const gameCase = id ? getCaseById(id) : null;
    if (gameCase) onPlay(gameCase, 'random');
  };

  const handleContinue = () => {
    if (resumeCheckpoint?.caseId && onResumeSession) {
      onResumeSession();
      return;
    }
    if (lastCase) {
      onPlay(lastCase, readProgress().lastMode || 'browse');
      return;
    }
    handlePlay();
  };

  const dismissEntryModal = useCallback(() => {
    writeAudienceProfile({
      level: audienceLevel,
      condition,
      playRole,
      difficulty,
      timerSeconds: normalizeTimerSeconds(Math.round(timerMinutes * 60), DEFAULT_TIMER_SECONDS),
      nameRegion: normalizeNameRegion(nameRegion),
      learningMode,
    });
    markOnboardingComplete();
    setAudienceReady(true);
  }, [audienceLevel, condition, playRole, difficulty, timerMinutes, nameRegion, learningMode]);

  const continueAsPhysician = useCallback(() => {
    const profile = applyPhysicianProfile(timerMinutes);
    setUnderstanding(sliderFromLevel(profile.level));
    setPlayRole(profile.playRole);
    setDifficulty(profile.difficulty);
    setAudienceReady(true);
    setShowFullSetup(false);
  }, [timerMinutes]);

  const ensureReadyForCases = useCallback(() => {
    if (audienceReady) return;
    continueAsPhysician();
  }, [audienceReady, continueAsPhysician]);

  const runNavAction = (id) => {
    if (id === 'play') handlePlay();
    else if (id === 'continue') handleContinue();
    else if (id === 'differential') {
      ensureReadyForCases();
      onOpenDifferential?.();
    } else if (id === 'profiles' || id === 'settings') setPanel(id);
    else if (id === 'exit') window.close();
  };

  const onNav = (id) => {
    if (!audienceReady && id !== 'profiles' && id !== 'settings') return;
    setActiveNav(id);
    runNavAction(id);
  };

  const placeGridItem = (cell) => {
    const nav = NAV.find((n) => n.id === placingNavId);
    const label = nav?.label || `Item ${gridItems.length + 1}`;
    const item = createGridItem({
      ...cell,
      label,
      meta: { navId: placingNavId || null, action: nav?.action },
    });
    persistGrid([...gridItems, item]);
    setPlacingNavId(null);
  };

  const onGridMarkerClick = (item) => {
    if (studioBuild && placeMode) {
      setSelectedGridId(item.id === selectedGridId ? null : item.id);
      return;
    }
    if (item.meta?.navId) {
      runNavAction(item.meta.navId);
    } else if (item.meta?.action === 'play') {
      handlePlay();
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    writeTheme(next);
  };

  const loadPatientImage = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      localStorage.setItem(STORAGE.patientImage, dataUrl);
      localStorage.setItem(STORAGE.patientMime, file.type || 'image/png');
      clearVisionZones();
      setPatientSet(true);
    } catch {
      /* ignore */
    }
  };

  const clearPatientImage = () => {
    try {
      localStorage.removeItem(STORAGE.patientImage);
      localStorage.removeItem(STORAGE.patientMime);
      clearVisionZones();
      setPatientSet(false);
    } catch {
      /* ignore */
    }
  };

  const createMagicLink = async () => {
    const file = magicFileRef.current?.files?.[0];
    if (!file) {
      setMagicMsg('Upload a face photo first.');
      return;
    }
    setMagicBusy(true);
    setMagicMsg('');
    setMagicLink('');
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const imageBase64 = dataUrl.split(',')[1] || '';
      const mimeType = file.type || 'image/png';
      const r = await fetch(apiUrl('/api/magic/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          email: magicEmail.trim(),
          origin: window.location.origin,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to create magic link');
      setMagicLink(data.magicLink || '');
      setMagicMsg(data.note || 'Magic link ready.');
      if (data.magicLink) {
        try {
          await navigator.clipboard.writeText(data.magicLink);
          setMagicMsg('Magic link ready and copied to clipboard.');
        } catch {
          /* ignore clipboard failures */
        }
      }
    } catch (e) {
      setMagicMsg(e.message || 'Failed to create magic link.');
    } finally {
      setMagicBusy(false);
    }
  };

  return (
    <main className="welcome-screen" aria-label="Welcome">
      <img
        className={`welcome-plate-img${videoPlaying ? ' welcome-plate-img--faded' : ''}${videoAtEnd && lastFrameSrc ? ' welcome-plate-img--hold' : ''}`}
        src={plateStillSrc}
        alt=""
        draggable={false}
      />
      {hasPlateVideo && (
        <video
          ref={welcomeVideoRef}
          className={`welcome-plate-img welcome-plate-video${videoPlaying ? ' welcome-plate-video--visible' : ''}`}
          src={resolvedPlateVideoSrc}
          poster={plateSrc}
          muted
          defaultMuted
          playsInline
          loop={plateVideoLoop}
          preload={idleVideoTriggered || videoAtEnd ? 'auto' : 'metadata'}
          draggable={false}
          aria-hidden
          {...VIDEO_NO_DOWNLOAD_ATTRS}
          onLoadedMetadata={silenceWelcomeVideo}
          onPlaying={() => {
            silenceWelcomeVideo();
            setVideoPlaying(true);
            setVideoAtEnd(false);
          }}
          onEnded={() => {
            if (holdLastFrame) captureWelcomeLastFrame();
            else setVideoPlaying(false);
          }}
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="welcome-plate-scrim" aria-hidden />

      {studioBuild && (
        <div className="welcome-studio-bar">
          <button type="button" className={showGrid ? 'btn-primary' : 'btn-ghost'} onClick={() => setShowGrid((v) => !v)}>
            {showGrid ? 'Grid on' : 'Grid off'}
          </button>
          <button type="button" className={placeMode ? 'btn-primary' : 'btn-ghost'} onClick={() => setPlaceMode((v) => !v)}>
            {placeMode ? 'Place on' : 'Place off'}
          </button>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={placingNavId === n.id ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setPlacingNavId(placingNavId === n.id ? null : n.id)}
              title={`Place ${n.label} on grid`}
            >
              + {n.label}
            </button>
          ))}
        </div>
      )}

      <GridPlacementLayer
        frame={{ x: 0, y: 0, w: 1, h: 1 }}
        items={gridItems}
        visible={showGrid}
        placeMode={studioBuild && (placeMode || Boolean(placingNavId))}
        selectedId={selectedGridId}
        onPlaceCell={placeGridItem}
        onSelect={studioBuild ? setSelectedGridId : undefined}
        onItemClick={!studioBuild ? onGridMarkerClick : undefined}
        onMove={(id, cell) => {
          persistGrid(moveGridItem(gridItems, id, cell));
          setSelectedGridId(null);
        }}
        onRemove={(id) => {
          persistGrid(gridItems.filter((it) => it.id !== id));
        }}
      />

      {!audienceReady && (
        <>
          <div className="welcome-entry-backdrop" aria-hidden />
          <section className="welcome-entry-modal welcome-entry-card welcome-onboarding-slim" aria-label="One-time setup">
            <p className="welcome-entry-kicker">One-time setup</p>
            <h2>Physician mode</h2>
            <p className="welcome-entry-note">
              Full case library, clinical prompts, drag-and-drop CCS stacks. This screen appears once — then
              straight to cases.
            </p>
            <button type="button" className="btn-primary welcome-physician-cta" onClick={continueAsPhysician}>
              Continue as physician →
            </button>
            <button
              type="button"
              className="btn-ghost welcome-customize-toggle"
              onClick={() => setShowFullSetup((v) => !v)}
              aria-expanded={showFullSetup}
            >
              {showFullSetup ? 'Hide custom setup' : 'Customize audience & timer…'}
            </button>
            {showFullSetup && (
              <div className="welcome-onboarding-custom">
                <p className="welcome-entry-note muted">
                  Reddit-informed common conditions for launch: layperson mode limits case complexity.
                </p>
                <div className="welcome-condition-grid">
                  {conditionChoices.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={condition === opt.id ? 'welcome-cond-pill active' : 'welcome-cond-pill'}
                      onClick={() => setCondition(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <label className="welcome-understanding">
                  <span>Explain it like I&apos;m…</span>
                  <strong>
                    {audienceLevel === 'kid'
                      ? 'a 5-year-old'
                      : audienceLevel === 'layperson'
                        ? 'a curious adult'
                        : audienceLevel === 'mid'
                          ? 'a pre-med student'
                          : 'a physician'}
                  </strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={understanding}
                  onChange={(e) => setUnderstanding(Number(e.target.value))}
                />
                <div className="welcome-understanding-meta">
                  <span>5 years old</span>
                  <span>physician</span>
                </div>
                <p className="welcome-entry-note">
                  Available right now: {allowedCaseIds.length} cases in {audienceLevel} mode
                </p>
                <div className="welcome-session-row">
                  <span className="welcome-entry-kicker">Play as</span>
                  <div className="welcome-session-toggle">
                    <button
                      type="button"
                      className={playRole === 'doctor' ? 'active' : ''}
                      onClick={() => setPlayRole('doctor')}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      className={playRole === 'patient' ? 'active' : ''}
                      onClick={() => setPlayRole('patient')}
                    >
                      Patient
                    </button>
                  </div>
                </div>
                <div className="welcome-session-row">
                  <span className="welcome-entry-kicker">Session difficulty</span>
                  <div className="welcome-session-toggle">
                    <button
                      type="button"
                      className={difficulty === 'easy' ? 'active' : ''}
                      onClick={() => setDifficulty('easy')}
                    >
                      Easier
                    </button>
                    <button
                      type="button"
                      className={difficulty === 'standard' ? 'active' : ''}
                      onClick={() => setDifficulty('standard')}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={difficulty === 'hard' ? 'active' : ''}
                      onClick={() => setDifficulty('hard')}
                    >
                      Harder
                    </button>
                  </div>
                </div>
                <label className="welcome-timer-field">
                  <span className="welcome-entry-kicker">Case timer (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    step={0.5}
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Number(e.target.value))}
                  />
                </label>
                <button type="button" className="btn-primary" onClick={dismissEntryModal}>
                  Save &amp; continue
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <div className="welcome-hud">
        <header className="welcome-brand">
          <h1 className="welcome-title">{brand.name}</h1>
          <div className="welcome-tagline" aria-label={brand.tagline}>
            <span className="welcome-tagline-line" aria-hidden />
            <span className="welcome-tagline-text">{brand.tagline}</span>
            <span className="welcome-tagline-line" aria-hidden />
          </div>
        </header>

        {resumeCheckpoint?.caseId && onResumeSession && onDiscardSession && (
          <ResumeSessionBanner
            checkpoint={resumeCheckpoint}
            caseMeta={resumeCase}
            onResume={onResumeSession}
            onDiscard={onDiscardSession}
          />
        )}

        <nav className="welcome-nav" aria-label="Main menu">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`welcome-nav-item ${activeNav === id ? 'active' : ''}`}
              onClick={() => onNav(id)}
              onMouseEnter={() => setActiveNav(id)}
              onFocus={() => setActiveNav(id)}
              disabled={
                (id === 'continue' && !lastCase && !resumeCheckpoint?.caseId) ||
                (id === 'differential' && !onOpenDifferential) ||
                (!audienceReady && id !== 'settings' && id !== 'profiles')
              }
              aria-disabled={
                (id === 'continue' && !lastCase && !resumeCheckpoint?.caseId) ||
                (id === 'differential' && !onOpenDifferential) ||
                (!audienceReady && id !== 'settings' && id !== 'profiles')
              }
              title={
                id === 'continue' && !lastCase && !resumeCheckpoint?.caseId
                  ? 'No saved session yet'
                  : id === 'continue' && resumeCheckpoint?.caseId
                    ? 'Resume your recent in-progress case'
                    : label
              }
            >
              <Icon className="welcome-nav-icon" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <blockquote className="welcome-quote">
          <p>&ldquo;{brand.quote}&rdquo;</p>
          <cite>— {brand.quoteAuthor}</cite>
        </blockquote>
      </div>

      {panel && (
        <div className="welcome-panel-backdrop" role="presentation" onClick={() => setPanel(null)} />
      )}
      {panel === 'profiles' && (
        <aside className="welcome-panel" aria-label="Profiles">
          <button type="button" className="welcome-panel-close" onClick={() => setPanel(null)}>
            ✕
          </button>
          <h2>Your progress</h2>
          <p className="welcome-panel-stat">
            <strong>{stats.completed}</strong> / {stats.total} cases mastered
          </p>
          <p className="welcome-panel-stat muted">{stats.pct}% complete · {stats.played} played</p>
          {journalStats && (
            <div className="welcome-journal-stats">
              <p className="welcome-panel-kicker">Practice journal</p>
              <p className="welcome-panel-stat muted">
                {journalStats.totalSessions} runs · {journalStats.totalChatMessages} chat ·{' '}
                {journalStats.totalRecordings} recordings · {journalStats.totalNoteEvents} notes logged
              </p>
            </div>
          )}
          {visitHistory.length > 0 && (
            <div className="welcome-case-history" aria-label="Recent case history">
              <p className="welcome-panel-kicker">History</p>
              <p className="welcome-panel-stat muted welcome-case-history-hint">
                Cases you opened or chatted with — tap to reopen.
              </p>
              <ul className="welcome-case-history-list">
                {visitHistory.map((row) => (
                  <li key={row.caseId}>
                    <button
                      type="button"
                      className="welcome-case-history-row"
                      onClick={() => {
                        const gameCase = getCaseById(row.caseId);
                        if (!gameCase) return;
                        ensureReadyForCases();
                        setPanel(null);
                        onPlay(gameCase, 'browse');
                      }}
                    >
                      <span className="welcome-case-history-main">
                        <strong>#{row.ccsNumber}</strong>{' '}
                        {toTitleCase(row.title)}
                      </span>
                      <span className="welcome-case-history-meta">
                        {formatCaseVisitWhen(row.at)}
                        {row.chatMessages > 0 ? ` · ${row.chatMessages} chat` : ''}
                        {row.completed ? ' · done' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lastCase && (
            <p className="welcome-panel-meta">
              Last case: <strong>{lastCase.title}</strong>
            </p>
          )}
          <div className="welcome-panel-actions">
            {onOpenDifferential && (
              <button
                type="button"
                className="welcome-panel-btn welcome-panel-btn--accent"
                onClick={() => {
                  ensureReadyForCases();
                  onOpenDifferential();
                }}
              >
                🧠 Differential practice →
              </button>
            )}
            <button
              type="button"
              className="welcome-panel-btn"
              onClick={() => {
                ensureReadyForCases();
                onOpenReadyCases();
              }}
            >
              Ready to practice ({readyCount}) →
            </button>
            {stackTestingCount > 0 && onOpenStackTestingCases && (
              <button
                type="button"
                className="welcome-panel-btn"
                onClick={() => {
                  ensureReadyForCases();
                  onOpenStackTestingCases();
                }}
              >
                Stack testing ({stackTestingCount}) →
              </button>
            )}
            {onOpenRecentCases && visitHistory.length > 0 && (
              <button
                type="button"
                className="welcome-panel-btn"
                onClick={() => {
                  ensureReadyForCases();
                  onOpenRecentCases();
                }}
              >
                History ({visitHistory.length}) →
              </button>
            )}
            {onOpenFavoritesCases && (
              <button
                type="button"
                className="welcome-panel-btn"
                onClick={() => {
                  ensureReadyForCases();
                  onOpenFavoritesCases();
                }}
              >
                ⭐ Favorites ({favoriteCount}) →
              </button>
            )}
            {onOpenFlaggedCases && (
              <button
                type="button"
                className="welcome-panel-btn"
                onClick={() => {
                  ensureReadyForCases();
                  onOpenFlaggedCases();
                }}
              >
                Review next ({flaggedCount}) →
              </button>
            )}
            <button
              type="button"
              className="welcome-panel-btn btn-ghost"
              onClick={() => {
                ensureReadyForCases();
                onOpenCases();
              }}
            >
              Browse all cases →
            </button>
          </div>
        </aside>
      )}
      {panel === 'settings' && (
        <aside className="welcome-panel welcome-panel--settings" aria-label="Settings">
          <button type="button" className="welcome-panel-close" onClick={() => setPanel(null)}>
            ✕
          </button>
          <h2>Settings</h2>
          <div className="welcome-settings-layout">
            <section className="welcome-settings-col" aria-label="General settings">
              <h3 className="welcome-settings-col-title">General</h3>
              <label className="welcome-settings-field">
                <span>Case timer (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={0.5}
                  value={timerMinutes}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTimerMinutes(next);
                    const profile = readAudienceProfile() || {};
                    writeAudienceProfile({
                      ...profile,
                      timerSeconds: normalizeTimerSeconds(Math.round(next * 60), DEFAULT_TIMER_SECONDS),
                    });
                  }}
                />
              </label>
              <label className="welcome-settings-field">
                <span>Patient name region</span>
                <select
                  value={nameRegion}
                  onChange={(e) => {
                    const next = normalizeNameRegion(e.target.value);
                    setNameRegion(next);
                    const profile = readAudienceProfile() || {};
                    writeAudienceProfile({ ...profile, nameRegion: next, patientName: '' });
                  }}
                >
                  {NAME_REGION_CHOICES.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="welcome-settings-scene-hint muted">
                  Default patient names in HPI come from this region&apos;s name bank (181+ per region).
                </span>
              </label>
              <label className="welcome-settings-field welcome-settings-field--checkbox">
                <span>Learning mode (hide diagnosis until case complete)</span>
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setLearningMode(next);
                    const profile = readAudienceProfile() || {};
                    writeAudienceProfile({ ...profile, learningMode: next });
                  }}
                />
              </label>
              <button type="button" className="welcome-panel-btn" onClick={toggleTheme}>
                Theme: {theme === 'light' ? 'Light' : 'Dark'}
              </button>
              <div className="welcome-settings-scene-preview" aria-hidden={false}>
                <p className="welcome-settings-col-kicker">Patient scene preview</p>
                <div className="welcome-settings-scene-frame">
                  <img
                    src="/assets/patient/patient-scene.png"
                    alt=""
                    className="welcome-settings-scene-img"
                  />
                </div>
                <p className="welcome-settings-scene-hint muted">
                  This is what cases should show in the ER scene (not a black screen).
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => loadPatientImage(e.target.files?.[0])}
              />
              {patientSet ? (
                <button type="button" className="welcome-panel-btn" onClick={clearPatientImage}>
                  Revert patient photo
                </button>
              ) : (
                <button type="button" className="welcome-panel-btn" onClick={() => fileRef.current?.click()}>
                  Override patient photo…
                </button>
              )}
              <button
                type="button"
                className="welcome-panel-btn btn-ghost"
                onClick={() => {
                  writeBriefingUiLayout(defaultBriefingUiLayout());
                  applyPlayUiFavorite();
                  writePlayDockLayout(defaultBriefingDockLayout(), STORAGE.briefingDockLayout);
                  localStorage.removeItem(STORAGE.patientImage);
                  localStorage.removeItem(STORAGE.patientMime);
                  localStorage.removeItem(STORAGE.sceneVariants);
                  localStorage.removeItem(STORAGE.caseRegenImages);
                  scrubInvalidSceneStorage();
                  setPatientSet(false);
                  alert('UI layout reset. Hard-refresh the page (Ctrl+Shift+R), then start a case.');
                }}
              >
                Reset case UI layout (fix black screen)
              </button>
            </section>
            <section className="welcome-settings-col" aria-label="Global UI settings">
              <GlobalUiSettingsPanel embedded />
            </section>
            <section className="welcome-settings-col" aria-label="Audio settings">
              <AudioSettingsPanel embedded />
            </section>
          </div>
        </aside>
      )}
    </main>
  );
}
