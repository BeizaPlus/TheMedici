# Clinical accuracy rules — case story & portrait prompts

**Purpose:** Hard constraints for MeWorld hospital stills so generated images pass Immersa-level clinical review. Injected into `buildPortraitPrompt()`, `buildCaseStoryMasterImagePrompt()`, and `buildCaseStoryBeatImagePrompt()` via `server/clinicalAccuracyRules.js`.

**Reference voice:** Immersa explainer skill — mechanism-first, spatially grounded; visuals must match what an attending would expect in an ED bay.

---

## ECG / telemetry (mandatory when monitor or leads in frame)

| Rule | Detail |
|------|--------|
| **Electrodes on bare skin** | ECG/telemetry pads on **exposed chest skin** only — hospital gown **open at front** or patient **shirtless under gown**. **NEVER** electrodes on top of shirt, jacket, gown fabric, or clothing layers. |
| **Chest exposure** | For telemetry beats: anterior chest visible with 3–5 lead pads on skin (sternum, left lateral chest). Gown parted or open-back exam gown draped to sides. |
| **Monitor content** | When vitals monitor is visible: show **numeric heart rate** (e.g. 72–110 bpm), **SpO₂ %**, and a **live ECG waveform trace** (green or white scrolling line) — NOT blank screen, NOT random dots, NOT MRI/DWI scatter as the only monitor content. |
| **Pulse ox** | Finger probe on patient finger when monitor in frame — optional but preferred. |

**Forbidden:** ECG pads over plaid shirt, polo, sweater, or closed hospital gown; monitor showing only abstract speckles with no HR/ECG trace.

---

## IV access (ED beats)

| Rule | Detail |
|------|--------|
| **Site** | Peripheral IV: **20g antecubital** (inner elbow crease) preferred — left or right per case. |
| **When absent** | Arrival / triage beats: **no IV** unless beat narrative says lines placed. |
| **Securement** | Transparent dressing + taped tubing; no central lines unless case specifies. |

Per `server/casePortrait.js` IV variant and `sceneElementRegistry.js`.

---

## Wardrobe & ED logic

| Rule | Detail |
|------|--------|
| **Adult male ED** | Bare chest or **open-back hospital exam gown** — NO street clothes, NO tweed, NO shirt under telemetry (see `getHospitalWardrobePrompt()` in `sceneCameraLock.js`). |
| **Adult female ED** | Light blue hospital gown; preserve cultural markers from identity ref. |
| **Pediatric** | Age-appropriate gown; follow pediatric portrait rules. |
| **Home / pre-hospital beats** | Casual home clothes or pajamas OK — clinical device rules N/A unless EMS scene. |

---

## Monitor placement (game lock)

- Vitals monitor **upper-right** of frame when in ED bay.
- IV pole / line **upper-left** when IV present.
- Both stretcher rails visible; patient supine on stretcher only.

---

## Beat-specific notes (case 051 — TIA / embolic shower)

| Beat | Clinical focus |
|------|------------------|
| **c0 Home** | Bedroom floor fall or withdrawn at home — **no hospital equipment**. Same 70yo likeness. |
| **c1 Disruption** | ED triage — gown on, **no telemetry yet** unless narrative says placed. |
| **c2 Embodiment** | Exam beat — stethoscope at carotid; monitor may show soft vitals; **no ECG pads required yet**. |
| **c3 Escalation** | **Telemetry on bare chest** + monitor with **HR + ECG waveform + SpO₂**. DWI “peppered specks” may appear on a **secondary screen or tablet** — not instead of vitals trace. |
| **c4–c5** | Admission / family — maintain gown continuity; IV if narrative implies admission. |

---

## Regeneration checklist (Magnific)

1. `npm run verify:magnific`
2. Single beat: `node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c3 --variant=v3`
3. Home beat: `node scripts/generate-case-story-images.mjs 051 --beats-only --beat=c0 --variant=home`
4. Do **not** `--force` canonical files until Steve approves variant.

---

## Wiring

| Consumer | Function |
|----------|----------|
| `server/clinicalAccuracyRules.js` | `readClinicalAccuracyRules()`, `buildClinicalAccuracyPromptBlock()` |
| `server/caseStory.js` | Master + beat prompts |
| `server/casePortrait.js` | `buildPortraitPrompt()` |
| `scripts/generate-case-story-images.mjs` | Uses `caseStory.js` builders (automatic) |
