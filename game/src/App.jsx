import { useState, useCallback, useEffect, useMemo } from 'react';
import Home from './components/Home.jsx';
import Briefing from './components/Briefing.jsx';
import Play from './components/Play.jsx';
import Complete from './components/Complete.jsx';
import StudioMode from './components/StudioMode.jsx';
import { getCatalog, getCaseById, getAllGameCases } from './data/useCcsCatalog.js';
import {
  recordCaseComplete,
  nextInQueue,
  setLastMode,
  markCaseIncomplete,
  touchCaseVisited,
} from './data/caseProgress.js';
import { runEvalSuite } from './data/evalSuite.js';
import { isStudioApp, playerAppHref } from './lib/appMode.js';
import {
  clearPlayCheckpoint,
  clearCasePlayCheckpoint,
  readPlayCheckpoint,
  readCasePlayCheckpoint,
  writeCasePlayCheckpoint,
  listCasePlayCheckpointIds,
} from './lib/playSessionResume.js';
import { endPlaySession } from './lib/caseUserLog.js';
import { rememberCaseBrowse } from './lib/caseBrowseContext.js';
import { startIcuMonitor, endSessionMonitor, unlockAmbience, prefetchMonitorAudio } from './lib/audio.js';

const SCREENS = {
  home: 'home',
  map: 'map',
  briefing: 'briefing',
  play: 'play',
  complete: 'complete',
  studio: 'studio',
};

export default function App() {
  const studioBuild = useMemo(() => isStudioApp(), []);
  const [screen, setScreen] = useState(SCREENS.home);
  const [currentCase, setCurrentCase] = useState(null);
  const [stats, setStats] = useState({ attempts: 0, accuracy: 100, seconds: 0 });
  const [playMode, setPlayMode] = useState('browse');
  const [launchTeachMe, setLaunchTeachMe] = useState(false);
  const [homeKey, setHomeKey] = useState(0);
  const [resumeCheckpoint, setResumeCheckpoint] = useState(() => readPlayCheckpoint());

  const refreshResumeCheckpoint = useCallback(() => {
    setResumeCheckpoint(readPlayCheckpoint());
  }, []);

  useEffect(() => {
    prefetchMonitorAudio();
  }, []);

  // ── ?case=126 deep-link: auto-launch; resume play if checkpoint matches ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get('case');
    if (!caseId) return;
    const gameCase = getCaseById(caseId);
    if (!gameCase) return;
    const cp = readPlayCheckpoint();
    setCurrentCase(gameCase);
    unlockAmbience();
    startIcuMonitor({ fadeMs: 1800 });
    if (cp?.caseId != null && String(cp.caseId) === String(gameCase.id) && cp.screen === 'play') {
      setResumeCheckpoint(cp);
      setPlayMode(cp.playMode || 'browse');
      setScreen(SCREENS.play);
      return;
    }
    setScreen(SCREENS.briefing);
  }, []);

  useEffect(() => {
    if (!studioBuild || typeof window === 'undefined') return undefined;
    window.runEval = () => runEvalSuite();
    return () => {
      delete window.runEval;
    };
  }, [studioBuild]);

  useEffect(() => {
    if (!currentCase && screen !== SCREENS.home && screen !== SCREENS.studio) {
      setScreen(SCREENS.home);
    }
  }, [currentCase, screen]);

  useEffect(() => {
    if (!studioBuild && screen === SCREENS.studio) {
      setScreen(SCREENS.home);
    }
  }, [studioBuild, screen]);

  const startCase = useCallback((gameCase, mode = 'browse', { teachMe = false, skipBriefing = false } = {}) => {
    const cp = readPlayCheckpoint();
    if (!teachMe && cp && String(cp.caseId) !== String(gameCase.id)) {
      clearPlayCheckpoint();
      setResumeCheckpoint(null);
    }
    touchCaseVisited(gameCase.id, teachMe ? 'whys' : 'briefing');
    rememberCaseBrowse(gameCase.id, { entry: screen === SCREENS.home ? 'browser' : 'briefing' });
    setPlayMode(mode);
    setLastMode(mode);
    setCurrentCase(gameCase);
    setLaunchTeachMe(Boolean(teachMe));
    unlockAmbience();
    startIcuMonitor({ fadeMs: 1800 });
    if (skipBriefing && teachMe) {
      setScreen(SCREENS.play);
      return;
    }
    setScreen(SCREENS.briefing);
  }, [screen]);

  const resumeSavedSession = useCallback(() => {
    let cp = readPlayCheckpoint();
    if (!cp?.caseId) {
      let best = null;
      for (const id of listCasePlayCheckpointIds()) {
        const row = readCasePlayCheckpoint(id);
        if (!row?.savedAt) continue;
        if (!best || new Date(row.savedAt) > new Date(best.savedAt)) best = row;
      }
      cp = best;
    }
    if (!cp?.caseId) return;
    const gameCase = getCaseById(cp.caseId);
    if (!gameCase) {
      clearPlayCheckpoint();
      setResumeCheckpoint(null);
      return;
    }
    const mode = cp.playMode || 'browse';
    setPlayMode(mode);
    setLastMode(mode);
    setCurrentCase(gameCase);
    touchCaseVisited(gameCase.id, 'play');
    setResumeCheckpoint(cp);
    setScreen(SCREENS.play);
  }, []);

  const discardSavedSession = useCallback(() => {
    const cp = readPlayCheckpoint();
    if (cp?.caseId && cp?.playSessionId) {
      void endPlaySession(cp.caseId, cp.playSessionId, { discarded: true });
    }
    clearPlayCheckpoint();
    setResumeCheckpoint(null);
  }, []);

  const beginPlay = useCallback(() => {
    if (currentCase?.id) touchCaseVisited(currentCase.id, 'play');
    unlockAmbience();
    startIcuMonitor({ fadeMs: 0 });
    setScreen(SCREENS.play);
  }, [currentCase?.id]);

  const clearLaunchTeachMe = useCallback(() => {
    setLaunchTeachMe(false);
  }, []);

  const switchBriefingCase = useCallback((gameCase) => {
    touchCaseVisited(gameCase.id, 'briefing');
    setPlayMode('browse');
    setLastMode('browse');
    setCurrentCase(gameCase);
    startIcuMonitor({ fadeMs: 0 });
  }, []);

  const finishCase = useCallback(
    (result) => {
      if (currentCase?.id) {
        recordCaseComplete(currentCase.id, result);
        clearCasePlayCheckpoint(currentCase.id);
      }
      clearPlayCheckpoint();
      setResumeCheckpoint(null);
      setStats(result);
      startIcuMonitor({ fadeMs: 0 });
      setScreen(SCREENS.complete);
    },
    [currentCase],
  );

  const playAgain = useCallback(() => {
    clearPlayCheckpoint();
    setResumeCheckpoint(null);
    startIcuMonitor({ fadeMs: 0 });
    setScreen(SCREENS.briefing);
  }, []);

  const goHome = useCallback(() => {
    endSessionMonitor({ fadeMs: 900 });
    setScreen(SCREENS.home);
    refreshResumeCheckpoint();
    setHomeKey((k) => k + 1);
  }, [refreshResumeCheckpoint]);

  /** Exit play → case briefing preview (same case), not welcome home. */
  const exitToCasePreview = useCallback(() => {
    endSessionMonitor({ fadeMs: 900 });
    if (currentCase?.id) {
      rememberCaseBrowse(currentCase.id, { entry: 'briefing' });
    }
    refreshResumeCheckpoint();
    setScreen(SCREENS.briefing);
  }, [currentCase?.id, refreshResumeCheckpoint]);

  const openCaseFromPlay = useCallback(
    (caseId) => {
      const gameCase = getCaseById(caseId);
      if (!gameCase) return;
      startCase(gameCase, 'browse');
    },
    [startCase],
  );

  const skipToNextCase = useCallback(
    (meta = {}) => {
      if (!currentCase?.id) return;
      const caseId = currentCase.id;

      if (!meta?.sessionEnded) {
        const cp = readPlayCheckpoint();
        if (cp?.playSessionId && String(cp.caseId) === String(caseId)) {
          void endPlaySession(caseId, cp.playSessionId, {
            skipped: true,
            paused: true,
            incomplete: !meta?.reviewed,
            reviewed: Boolean(meta?.reviewed),
            placed: meta?.placed,
            total: meta?.total,
          });
        }
      }

      if (meta?.reviewed) {
        touchCaseVisited(caseId, 'play');
      } else {
        markCaseIncomplete(caseId);
      }

      clearPlayCheckpoint();
      setResumeCheckpoint(null);

      const allCases = getAllGameCases();
      const idx = allCases.findIndex((c) => String(c.id) === String(caseId));
      const nextCase =
        idx >= 0 && allCases.length > 1
          ? allCases[(idx + 1) % allCases.length]
          : null;

      if (!nextCase) {
        goHome();
        return;
      }

      setCurrentCase(nextCase);
      touchCaseVisited(nextCase.id, 'play');
      unlockAmbience();
      startIcuMonitor({ fadeMs: 0 });
      setScreen(SCREENS.play);
    },
    [currentCase, goHome],
  );

  const playNextInMode = useCallback(() => {
    const catalog = getCatalog();
    const allIds = catalog.cases.map((c) => c.id);

    if (playMode === 'shuffle') {
      const nextId = nextInQueue();
      const nextCase = nextId ? getCaseById(nextId) : null;
      if (nextCase) {
        startCase(nextCase, 'shuffle');
        return;
      }
    }

    if (playMode === 'random' || playMode === 'shuffle') {
      const pool = getAllGameCases();
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        startCase(pick, playMode);
        return;
      }
    }

    goHome();
  }, [playMode, startCase, goHome]);

  const showStudioToolbar = studioBuild && screen !== SCREENS.studio;

  return (
    <div className={`app ${studioBuild ? 'app--studio' : 'app--player'}`}>
      {showStudioToolbar && (
        <header className="studio-toolbar" aria-label="Studio tools">
          <span className="studio-toolbar-kicker">Studio build</span>
          <button
            type="button"
            className="eval-badge"
            onClick={() => window.runEval?.()}
            aria-label="Run self-evaluation suite"
          >
            ⚡ EVAL
          </button>
          <button
            type="button"
            className="studio-badge"
            onClick={() => setScreen(SCREENS.studio)}
            aria-label="Open zone studio"
          >
            🎯 Zone studio
          </button>
          <a className="studio-toolbar-link" href={playerAppHref()}>
            Launch player app →
          </a>
        </header>
      )}
      {studioBuild && screen === SCREENS.studio && <StudioMode onExit={goHome} />}
      {screen === SCREENS.home && (
        <Home
          key={homeKey}
          onPlay={startCase}
          resumeCheckpoint={resumeCheckpoint}
          onResumeSession={resumeSavedSession}
          onDiscardSession={discardSavedSession}
        />
      )}
      {screen === SCREENS.briefing && currentCase && (
        <Briefing
          caseData={currentCase}
          onBegin={beginPlay}
          onBack={goHome}
          onSelectCase={switchBriefingCase}
          studioCapture={studioBuild}
        />
      )}
      {screen === SCREENS.play && currentCase && (
        <Play
          key={currentCase.id}
          caseData={currentCase}
          playMode={playMode}
          initialTeachMe={launchTeachMe}
          onTeachMeConsumed={clearLaunchTeachMe}
          initialCheckpoint={(() => {
            const active = resumeCheckpoint || readPlayCheckpoint();
            if (active?.caseId != null && String(active.caseId) === String(currentCase.id)) {
              return active;
            }
            return readCasePlayCheckpoint(currentCase.id);
          })()}
          onComplete={finishCase}
          onQuit={exitToCasePreview}
          onSkipToNext={skipToNextCase}
          onOpenCase={openCaseFromPlay}
          studioCapture={studioBuild}
        />
      )}
      {screen === SCREENS.complete && currentCase && (
        <Complete
          caseData={currentCase}
          stats={stats}
          playMode={playMode}
          onAgain={playAgain}
          onHome={goHome}
          onNext={playNextInMode}
        />
      )}
    </div>
  );
}
