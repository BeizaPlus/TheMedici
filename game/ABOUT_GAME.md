# About Game — Codebase Map & Dynamics Anchors

Architecture in one line: **`App.jsx` routes screens** → **`Home` / `Briefing` / `Play` / `Complete`**; cases come from **`ccsCatalog.json` → `toGameCase()` → `applySessionToCase()`**; all live play state lives in **`Play.jsx`** (no Redux/Zustand).

Use this document as the source of truth when writing game dynamics specs — every anchor below maps to actual code paths.

---

## Screen flow (state machine)

```
Home (Welcome / CaseBrowser)
  → startCase → Briefing (caseData)
  → beginPlay → Play
  → onComplete → Complete
  → onQuit / Exit → Home (checkpoint kept)
```

**App state:** `screen`, `currentCase`, `stats`, `playMode`, `resumeCheckpoint`, `homeKey`

---

## Specific answers (game dynamics anchors)

### Where is the current case loaded and stored?

| Layer | Location | What |
|--------|----------|------|
| **App root** | `App.jsx` | `currentCase` state (`useState(null)`) — single source while in briefing/play/complete |
| **Load path** | `useCcsCatalog.js` → `getCaseById(id)` | `ccsCatalog.json` row → `toGameCase(raw, catalog)` → `applySessionToCase()` (audience profile) |
| **Start case** | `App.startCase(gameCase)` | Sets `currentCase`, `playMode`, screen `briefing` |
| **Resume** | `App.resumeSavedSession()` | `readPlayCheckpoint()` → `getCaseById(cp.caseId)` → screen `play` + `initialCheckpoint` |
| **Mid-play snapshot** | `playSessionResume.js` | `localStorage` key `STORAGE.activePlayCheckpoint` (written every ~900ms from `Play.buildCheckpoint()`) |

Play receives case only via **`caseData` prop** from App; it does not reload the catalog itself.

---

### Where are stacks rendered and what triggers "placed"?

| Concern | Location |
|---------|----------|
| **Stack list UI** | `Play.jsx` → `renderStackPill()` inside dock `CaseContextPanel` treatment panel; `shuffledStackEntries` from `buildShuffledStackEntries()` |
| **Drag** | `useDragGame.js` / `useGridDragGame.js` → `onDrop` → `Play.handleDrop` |
| **Type order** | `Play.submitOrderCommand()` — form `.stack-command-ui` in dock |
| **Placed state** | `Play` state: `placed` — `Record<ivId, zoneId \| gridCell>` |
| **Placement trigger** | **`handleDrop`**: `setPlaced`, `setPlacementOrder`, `setPins`, toast, `logTimeline` |
| **Command placement** | **`submitOrderCommand`**: sets `placed[s.id] = s.correct_zone` + pin (no drag) |
| **Decoy placement** | `processDecoyOrder` → practice: silent place; teach: feedback + snap home |
| **Visual "placed"** | `placed[iv.id]` → CSS `is-placed`, `data-placed`, pins on patient, progress dots |
| **Done count** | `doneCount = interventions.filter(iv => placed[iv.id]).length` |

---

### Where does the order input bar live and what happens on Order?

| Item | Detail |
|------|--------|
| **UI** | `Play.jsx` — sidebar dock, class `stack-command-ui` (input + submit "Order") |
| **State** | `orderCommand` string |
| **Matching** | `commandMatch` (real stacks), `decoyCommandMatch`, `knownOrderMatch` (`medical-orders.json`) |
| **Submit flow** | `submitOrderCommand()` → location commands switch unit → decoy → `processDecoyOrder` → real stack: validate teach order → `setPlaced` / pins / clear review → toast → `logTimeline` |
| **Teach Me** | Blocks wrong stack order; shows "not indicated" for master-list orders |

---

### Where is patient life / vitals state managed?

| Item | Detail |
|------|--------|
| **Vitals numbers** | `getCaseFlow(caseData)` in `caseFlows.js` → `vitals` object (prepared / parsed / authored defaults) |
| **In Play** | `const vitals = caseFlow.vitals` — read-only during session |
| **Life %** | `patientLife.js` → `computePatientLife({ vitals, doneCount, total, misses, timeLeft, timerTotal })` |
| **Life state** | `patientLifeState(lifePct)` → `stable` / `guarded` / `critical` |
| **Play state** | `lifePct`, `lifeState` derived in `useMemo`; `attempts` / `correctAttempts` from reviews |
| **Display** | Top-left life bar, `IcuMonitorStrip`, ICU alarm CSS on scene |
| **Not simulated over time** | Vitals do not tick down; only life bar reacts to placement/mistakes/timer |

---

### Where does the timer live and what does advancing time do?

| Item | Detail |
|------|--------|
| **Config** | `layout.timerSeconds`, `caseTimer.js`, audience `timerSeconds` × difficulty multiplier |
| **State** | `timeLeft`, `timerTotal`, `timedOut`, `timedMode` (`readUiPrefs`) |
| **Tick** | `useEffect` in `Play.jsx`: every 1s `setTimeLeft(prev => prev - 1)` when timed + not teach + not timed out + not all placed |
| **On zero** | `setTimedOut(true)` + toast — **does not end case**; user can keep placing until review threshold |
| **Pause** | Timer pauses in Teach Me (`teachMeMode`) and when all stacks placed |
| **Checkpoint** | `timeLeft` saved in checkpoint; `hydrateCheckpointTimer` subtracts elapsed wall time on resume |
| **Display** | `play-hud` timer + sidebar stats when timed |

---

### Where is the chat/message log stored?

| Item | Detail |
|------|--------|
| **In-session UI log** | `Play` state: `conversationLog` — array `{ id, role, content }` |
| **Writers** | `logTimeline`, `addConversationMessage` (orders/decoys), SOAP updates, chat events |
| **Display** | Bottom `conversation-log` when `logOpen` (toolbar chat toggle) |
| **Persistence** | **Not** persisted to localStorage; cleared on case change |
| **Server chat** | `CaseChatPanel.jsx` + `caseChat.js` — separate Ollama API session (optional panel) |
| **Server play log** | `caseUserLog.js` → `logPlayEvent` / `startPlaySession` / `endPlaySession` (API, if server up) |

---

### Where does Teach Me mode start and what does each step do?

| Step | Behavior |
|------|----------|
| **Toggle** | Sidebar footer button → `setTeachMeMode` |
| **Drag gate** | `canStartStackDrag`: only `nextExpectedId` (+ decoys always draggable) |
| **Next step** | `nextExpectedId` = first intervention id not in `placed` |
| **Wrong drag** | Snap home + toast with required step |
| **Wrong zone** | Snap home + "wrong body zone" |
| **UI** | Locked pills, `teach-pill-next`, `TeachMeSceneOverlay` on patient, flow chips in dock |
| **Focus** | `teachFocusId`, `focusTeachStep(id)` scrolls dock |
| **Auto-complete** | When all placed → auto `reviewPlacements()` |
| **Decoy** | `revealedMode = teachMeMode` → immediate Ollama teaching; no silent place |
| **Timer** | Off in Teach Me |

---

### Where is the cases list and how does selecting a case load it?

| Step | Path |
|------|------|
| **List** | `Home` → `CaseBrowser.jsx` (or `BriefingCasePicker` in briefing) |
| **Data** | `getCatalog()`, `getCasesInCategory()`, filters: ready / stacks / flagged |
| **Select** | `setSelectedId` → preview panel |
| **Play** | `onPlay(selectedGameCase)` or `getCaseById(id)` → **`App.startCase(gameCase)`** |
| **Pipeline** | Catalog row → `toGameCase` → `applySessionToCase` → `currentCase` → Briefing → Begin → Play |

---

### Data shape of a loaded case object (`toGameCase` + session merge)

```ts
{
  id: string,                    // "105" padded in places as "105"
  ccsNumber: number,
  title: string,                 // UPPERCased in toGameCase
  category: string,
  diagnosis: string | null,
  playbookKey: string,
  chief_complaint: string,
  vitalsText: string,
  historyText: string,
  clinical_tip: string,
  objective: string,
  timeLimit: string | null,
  interventions: Array<{
    id, label, correct_zone, why?, guideline?, aliases?
  }>,
  decoys?: Array<{ id, label, why, correct_zone?, ... }>,  // from preparedCases
  zones, zoneColors,           // from gameConfig
  patientScene, patientSex,
  algorithm: { title, steps[] },
  layout,
  completionThreshold: number,
  thanksDoctorVideos: string[],
  // After applySessionToCase:
  playRole: 'doctor' | 'patient',
  sessionDifficulty: 'easy' | 'standard' | 'hard',
  preparedVitals, preparedExam, flowTrack, dispositionUnits,
  hpi_narrative?: string,       // if on prepared/ollama merge
  physical_exam?: Record<system, string | null>,
  stacks?: Array<{ label, type, finding, aliases }>,  // ollama path if merged
}
```

**Interventions** drive play; **`stacks`** is mainly for display/count when present on raw data.

---

### Where does the review/checklist tab get its data?

| Phase | Source |
|-------|--------|
| **In-case Review button** | `reviewPlacements()` → `reviewResults`, `orderReview`, `reviewed`, `reviewedAt` |
| **Post-video panel** | `openFinalReview()` → `postVideoRows = computePostVideoRows()` from `interventions`, `placementOrder`, `reviewResults`, `placed` |
| **Checklist ticks** | `reviewChecked` state + `reviewChecked.js` localStorage per case id |
| **Sections** | `extraOrders`, missed rows (`!row.ok`), `decoyAttempts` (+ lazy `handleDecoyOrder` on open) |
| **Complete** | `completeNow(result)` → `App.finishCase` → `caseProgress.recordCaseComplete` |

---

## Win / loss / completion (actual code)

| Condition | Code path |
|-----------|-----------|
| **Review** | User clicks Review → `reviewPlacements()` |
| **Pass threshold** | `accuracy >= completionThreshold` (default 99%) AND `correct >= ceil(total * threshold/100)` |
| **Pass outcome** | `playTeachingVideo` → video ends → `openFinalReview` → user checks all cards → Continue → `completeNow` |
| **Fail outcome** | Still plays teaching video + review; lower accuracy in stats |
| **Timer expiry** | `timedOut` — informational; no auto-fail |
| **Wrong drop (practice)** | Toast "Killed the patient" / snap back; increments `attempts` on review |
| **Decoy (practice)** | Silent accept + log in `decoyAttempts` |
| **Mastered** | `recordCaseComplete` when accuracy ≥ threshold |

---

## File-by-file map

Format: **path** — purpose | **state** | **key functions** | **reads** | **writes**

---

### Entry

**`src/main.jsx`** — React bootstrap, theme, storage migration, CSS imports | none | `migrateLegacyStorage`, `applyTheme` | `localStorage`, layout JSON | DOM root, localStorage

**`src/App.jsx`** — Top-level router and case session | `screen`, `currentCase`, `stats`, `playMode`, `resumeCheckpoint` | `startCase`, `beginPlay`, `finishCase`, `goHome`, `resumeSavedSession`, `playNextInMode` | `getCaseById`, checkpoint, progress | child props, `recordCaseComplete`, checkpoint clear, audio

---

### Screens (`src/components/`)

**`Play.jsx`** — Main gameplay: drag stacks, timer, life, review, SOAP drawer, decoys, completion | `placed`, `pins`, `placementOrder`, `reviewResults`, `teachMeMode`, `timeLeft`, `conversationLog`, `decoyAttempts`, `careUnit`, `showPostVideoReview`, … (40+ useState) | `handleDrop`, `submitOrderCommand`, `reviewPlacements`, `processDecoyOrder`, `buildCheckpoint`, `completeNow`, `confirmExitCase` | `caseData` prop, `getCaseFlow`, hooks, localStorage prefs | All play state, checkpoint, `onComplete`/`onQuit`, timeline API, conversation log

**`Briefing.jsx`** — Pre-play case intro, HPI/exam tabs, Begin | `readState`, `uiLayout`, dock layout | `handleReadCase`, layout studio drag | `caseData`, `getCaseFlow`, presentation | `onBegin`, `onBack`, `onSelectCase`, briefing layout storage

**`BriefingCasePicker.jsx`** — Floating case switcher on briefing | picker position, search, filter | `readPickerPos` | catalog, progress | `onSelectCase(gameCase)`

**`CaseBrowser.jsx`** — Full cases list + detail preview | `selectedId`, `listFilter`, `activeCategory` | play random/shuffle, category filter | `getCatalog`, `getCaseOrderCount`, progress | `onPlay(gameCase)`, `onBack`

**`Home.jsx`** — Welcome vs cases sub-view | `view`, `casesFilter` | toggles views | `resumeCheckpoint`, `getCaseById` | `onPlay`, resume handlers

**`WelcomeScreen.jsx`** — Landing, audience profile, mode entry | profile form state | `readAudienceProfile`, exam prep links | localStorage profile | `onOpenCases`, `onPlay`, profile writes

**`Complete.jsx`** — Post-case stats screen | none | displays `stats` | `caseData`, `stats` props | `onAgain`, `onHome`, `onNext`

**`CaseContextPanel.jsx`** — Sidebar HPI / exam / treatment / notes tabs | internal `infoTab` | tab switching, read-aloud section | `hpiText`, `examSummary`, `caseData` | `onReadCase`, tab content only

**`PatientScene.jsx`** — Renders patient image/video | none | image load handlers | `scene`, `caseData`, `forceSrc` | load events to parent

**`IcuMonitorStrip.jsx`** — Vitals + orders progress strip | none | formats vitals display | `vitals`, `ordersDone`, `careUnit` props | none

**`ClinicalAlgorithm.jsx`** — Algorithm step list in play dock | none | highlights placed steps | `algorithm`, `placed` | none

**`WhyPanel.jsx`** — Modal for stack rationale after review | none | close | `intervention`, `ok` | `onClose`

**`CaseTeachingVideoOverlay.jsx`** — End-of-case teaching video | none | `onEnded` → open review | `src`, `open` | `onSkip`, `onEnded`

**`TeachMeSceneOverlay.jsx`** — Patient overlay arrows for teach sequence | none | step positions from zones | `interventions`, `placed`, `nextExpectedId` | `onSelectStep`

**`PlaySceneToolbar.jsx`** — Bottom toolbar (exam, SOAP, settings, exit) | none | toggles drawers/settings | callback props from Play | invokes Play handlers

**`SceneToolbarIcons.jsx`** — **Tabler Icons** (https://tabler.io/icons) as inline SVG; single source for play-dock icons (`IconStethoscope`, `IconMicrophone`, `IconPlayerStop`, etc.) | none | icon components | none | none

**`CaseChatPanel.jsx`** — Case chat sidebar | messages, session id | `sendCaseChatMessage` | `caseChat.js` API | chat state, API; `**bold**` via `chatMessageFormat.jsx`

**`CaseNotesPanel.jsx`** — Notes tab + saved recordings list | none | text notes + playback | `caseNotes.js`, `caseUserLog.js` | none

**`CaseRecordButton.jsx`** — Voice record (mic/stop); icons from `SceneToolbarIcons.jsx`; uploads via `POST .../recording` | `useCaseRecording` hook | Tabler mic/stop | `caseUserLog.js` | session required

**`AudioSettingsPanel.jsx`** — Monitor/voice volume sliders | local prefs | read/write audio prefs | `audioPrefs.js` | localStorage

**`ClinicalTextControls.jsx`** / **`ClinicalFontControls.jsx`** — Font scale/weight for clinical text | prefs | update prefs | `clinicalTextPrefs` | localStorage

**`CcsScreenshotLink.jsx`** — Link to CCS reference screenshot | none | URL builder | `ccsScreenshot.js` | opens URL

**`CaseScreenshotThumb.jsx`** — Thumbnail for screenshots | none | display | image path | none

**`CaseProgressTag.jsx`** / **`CaseReadyTag.jsx`** / **`CaseReviewFlagButton.jsx`** / **`CaseReviewFlagTag.jsx`** — List badges and flag toggle | none | read progress / flag | `caseProgress.js` | `setCaseReviewFlag`

**`CasePresentationPanel.jsx`** — Presentation mode UI (if used) | varies | presentation helpers | `casePresentation.js` | none

**`GlobalUiSettingsPanel.jsx`** — Global settings UI | none | prefs | storage | localStorage

**`ResumeSessionBanner.jsx`** — Home banner for saved session | none | summary text | `formatPlayCheckpointSummary` | resume/discard callbacks

**`RegeneratePatientButton.jsx`** — Regen patient image | none | API/regen | `patientRegen.js` | localStorage image

**`SceneGridOverlay.jsx`** / **`GridPlacementLayer.jsx`** / **`GridPlacedMarker.jsx`** — Grid placement mode overlays | none | grid snap | `sceneGrid`, `placementGrid` | DOM positions

**`SceneExplainer.jsx`** — Case explainer overlay | none | display | `caseData` | none (likely legacy)

**`MapScreen.jsx`** — ER map navigation UI | none | unit enter | `mapData` | **Not wired in App.jsx** (orphan)

**`StudioMode.jsx`** — Zone studio for authoring | studio state | zone edit | `zoneStudio`, storage | localStorage zones

**`ZoneRail.jsx`** — Zone list in studio | none | zone select | zones config | studio state

**`AudioVolumeControl.jsx`** — Reusable volume slider | none | onChange | value prop | parent callback

---

### Hooks (`src/hooks/`)

**`useDragGame.js`** — interact.js drag from dock to patient zones | refs for callbacks | draggable/dropzone setup | `sceneRef`, `placed`, `onDrop` | calls `handleDrop`, DOM transforms

**`useGridDragGame.js`** — Grid-cell drag placement variant | same pattern | grid drop handlers | grid config | `setPlaced`, pins

**`usePlayDockLayout.js`** — Draggable/resizable play sidebar | dock x/y/width/height | `startDrag`, `resetLayout` | `playDockLayout.js` storage | localStorage dock layout

---

### Data (`src/data/`)

**`useCcsCatalog.js`** — Catalog access API | none | `getCaseById`, `getCasesInCategory`, `getAllGameCases` | `ccsCatalog.json`, `toGameCase`, session | returns game case objects

**`gameData.js`** — `toGameCase`, branding, zones, algorithm builder | none | `toGameCase`, `buildAlgorithm`, `getBranding` | catalog, playbooks, preparedCases, gameConfig | game case object

**`resolvePlaybook.js`** — Maps CCS case → intervention playbook | none | `resolvePlaybook`, `getCaseOrderCount` | playbooks.json, caseSpecificPlaybooks | intervention list

**`caseFlows.js`** — Per-case vitals, exam, disposition | none | `getCaseFlow` | preparedCases, CASE_FLOW_DICTIONARY, vitals parse | flow object

**`caseProgress.js`** — User progress persistence | none (reads/writes storage) | `recordCaseComplete`, `readProgress`, shuffle queue | localStorage | localStorage `schoonmaker_progress`

**`cases.js`** — Legacy/demo hardcoded cases (SEPSIS, DKA, …) | none | static CASES array | none | reference only if imported

**`gameConfig.json`** — Zones, drag config, branding, cinematics | N/A | getters in gameData | file | consumed at build

**`ccsCatalog.json`** — Master case index (~181 CCS cases) | N/A | via useCcsCatalog | file | none

**`playbooks.json`** — Presentation → default interventions | N/A | resolvePlaybook | file | none

**`caseSpecificPlaybooks.json`** — Per-case authored stacks (25 cases) | N/A | resolvePlaybook priority | file | none

**`preparedCases.json`** — Rich narrative, interventions, decoys, vitals per case id | N/A | `getPreparedCase` | file | merged at runtime

**`medical-orders.json`** — Master order search list | N/A | `ALL_ORDERS` in Play | file | none

**`presentationPlaybooks.js`** — Presentation metadata helpers | N/A | exports | playbooks | none

**`mapData.js`** / **`erMap.json`** — Map screen data | N/A | MapScreen | files | none

**`evalSuite.js`** — Dev eval runner | N/A | `runEvalSuite` | cases | console output

**`zones.js`** — Zone definitions export | N/A | re-exports | gameConfig | none

**`demoPatient.jsx`** — Demo patient asset | N/A | component | none | none

**`preparedCases_backup_*.json`** — Backups | N/A | none | files | none

---

### Lib (`src/lib/`)

**`caseBriefing.js`** — HPI/exam/treatment/notes text for sidebars | none | `getBriefingHpi`, `getCaseHpiNarrative`, `getBriefingExam` | caseData, caseFlow | strings only

**`caseNarrative.js`** — Merge prepared narrative into game case | none | `getPreparedCase`, `applySessionToCase` | preparedCases.json, session | merged case fields

**`casePresentation.js`** — Intro/HPI/vitals by play role | none | `getPresentationHistory`, `getPresentationIntro` | caseData narratives | strings

**`caseExam.js`** — Physical exam resolution chain | none | `resolveCaseExam`, `deriveExamFromHistory` | history, vitals, prepared exam | exam rows array

**`patientLife.js`** — Life bar formula | none | `computePatientLife`, `patientLifeState` | vitals, progress, timer | number 8–100

**`caseTimer.js`** — Timer duration math | none | `getSessionTimerSeconds`, `formatTimerLabel` | audience profile, difficulty | seconds

**`playSessionResume.js`** — Play checkpoint save/load | none | `read/write/clearPlayCheckpoint`, `hydrateCheckpointTimer` | localStorage | localStorage

**`caseUserLog.js`** — Server play session events | none | `startPlaySession`, `logPlayEvent`, `endPlaySession` | HTTP API :3001 | server DB/logs

**`caseReader.js`** — TTS read-aloud | none | `readCaseAloud`, `stopCaseReader` | API or browser speech | audio

**`caseChat.js`** — Ollama chat session for case | session cache | `ensureCaseChatSession`, `sendCaseChatMessage` | API | API messages

**`decoyOrder.js`** — Decoy teaching via Ollama | none | `handleDecoyOrder`, `decoyReason` | caseChat API | teaching string

**`shuffleStacks.js`** — Seeded stack shuffle | none | `buildShuffledStackEntries`, `seededShuffle` | interventions, decoys | ordered entries

**`stackDragHelpers.js`** — Drag ghost, snap home, drop highlight | none | `snapWrapHome`, `createDragGhost`, etc. | DOM | DOM classes/styles

**`placementGrid.js`** — Grid placement correctness | none | `isCorrectGridPlacement`, `zoneIdForCell` | zones, cells | boolean

**`sceneGrid.js`** / **`gridPlacement.js`** — Grid overlay math | none | snap, read/write grid items | layout | localStorage (studio)

**`clinicalTextFormat.js`** — HPI formatting, title case | none | `formatClinicalText`, `toTitleCase` | raw strings | formatted strings

**`clinicalTextPrefs.js`** — Font prefs | none | read/write prefs | localStorage | localStorage

**`uiPrefs.js`** — Timed mode, intervention filter | none | `getCaseInterventions`, `readUiPrefs` | caseData, storage | localStorage

**`audienceProfile.js`** — Doctor/patient, difficulty, timer | none | `readAudienceProfile`, `writeAudienceProfile` | localStorage | localStorage

**`sessionProfile.js`** — Completion threshold by difficulty | none | `getCompletionThresholdAdjust` | difficulty | number

**`reviewChecked.js`** — Post-review checklist persistence | none | `read/writeReviewChecked`, `toggleReviewCheckedSeq` | localStorage per case | localStorage

**`caseReadyPractice.js`** — "Ready" and stack-testing filters | none | `getReadyPracticeCases`, `getCaseOrderCount` re-export | catalog, playbooks | filtered lists

**`caseTeachingVideo.js`** — Pick/preload teaching video | none | `pickTeachingVideo`, `preloadTeachingVideo` | caseData cinematics | video src

**`patientImage.js`** — Scene src resolution, signatures | none | `resolveSceneSrc`, `getBuiltInPatientSrc` | storage, caseData | URLs

**`patientRegen.js`** — Regenerated patient images | none | read/write regen | localStorage | localStorage

**`patientSex.js`** — Infer patient sex from text | none | `inferPatientSex` | case text | 'male'|'female'

**`vitalsParse.js`** — Parse vitals from text | none | `parseVitalsFromText` | vitals strings | vitals object

**`zoneStudio.js`** — Zone merge for play/studio | none | `mergeZonesForPlay` | studio + config zones | zone map

**`audio.js`** — ICU monitor ambience | module state | `startIcuMonitor`, `endSessionMonitor`, `playWrong` | audio files | WebAudio

**`audioPrefs.js`** — Volume defaults | none | read/write | localStorage | localStorage

**`theme.js`** — Dark/light theme | none | `readTheme`, `writeTheme`, `applyTheme` | localStorage | DOM, localStorage

**`storageKeys.js`** — All localStorage key names | N/A | `STORAGE`, `migrateLegacyStorage` | keys | localStorage

**`playDockLayout.js`** / **`briefingUiLayout.js`** — Panel position persistence | none | read/write layout | localStorage | localStorage

**`captureScreenshot.js`** — Play screenshot capture | none | `saveScreenshotToServer` | API | server files

**`ccsScreenshot.js`** — CCS screenshot URLs | none | path builders | case id | URLs

**`appMode.js`** — Studio vs player detection | none | `isStudioApp`, `playerAppHref` | build/env | none

**`deviceProfile.js`** — Mobile/desktop tweaks | none | `applyDeviceProfile` | UA/viewport | CSS vars

**`onboarding.js`** — First-run flags | none | read/write | localStorage | localStorage

**`examPrep.js`** — Exam prep mode metadata | none | helpers | config | none

**`narrativeRefine.js`** — Refined narrative overrides | none | `getActiveRefinedNarrative` | localStorage | localStorage

**`caseNotes.js`** — Notes helpers | none | small utilities | case data | none

---

### Styles

**`index.css`** — Main game UI (play HUD, review panel, dock, SOAP) | N/A | N/A | N/A | visual only

**`ui-overrides.css`** — Briefing/play overrides | N/A | N/A | N/A | visual only

**`styles/scene-toolbar.css`** — Bottom toolbar | N/A | N/A | N/A | visual only

---

### External / server (related)

**`scripts/extract_cases_from_screenshots.py`** — OCR → Ollama → `game/data/ollama/cases/case-{n}.json` (not auto-merged into runtime catalog yet)

**Game API** (`http://127.0.0.1:3001`) — case-chat, TTS, play logging, screenshots (used by `caseChat.js`, `caseUserLog.js`, etc.)

---

## Related docs

- [`AGENTS.md`](./AGENTS.md) — Run commands, data pipeline, agent handoff
- [`DATA.md`](./DATA.md) — Data layer details
- [`FEATURES.md`](./FEATURES.md) — Feature list
