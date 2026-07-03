# Dev fix queue (batch — does not touch study lane)

> **Trigger:** Steve says **“fix dev”**, **“promote 097”**, or **“done with case”** while continuing on `MeWorld-study` (`:5173`).  
> **Cwd:** `C:\Users\steve\MeWorld\game` only · **Never** sync to study mid-session unless Steve explicitly asks.

---

## Workflow

1. Steve finishes case on **study** lane.
2. Agent runs this queue **once** on **dev** (`:5174`).
3. Steve refreshes dev to verify; study session unchanged.

---

## A — Global (all cases)

### A1 · Tutor / chart markdown rendering

**Problem:** Attendant outputs GFM tables (`| Condition | … |`) but the session chart shows **raw pipe text** — especially when the model puts the whole table on **one line** after prose (`…mimics: | Condition | … | |---|`).

**Root cause:** `src/lib/chatMessageFormat.jsx` → `normalizeChatMarkdown` + `splitMarkdownBlocks` expect **newline-separated** table rows. Inline / single-line tables fall through to a single `<p>` paragraph.

**Fix (dev):**

- [x] Extend `normalizeChatMarkdown` to split inline GFM tables (`unfoldInlineGfmTables`)
- [x] Handle tables glued to prose — break before first `| Col |` row group
- [ ] Support tables **without** separator row (header + body rows only) — partial via `collectTableLines`
- [ ] Add unit tests for `chatMessageFormat` (inline table, multiline table, `---` hr, headings after prose)
- [ ] Verify in UI: `ChatMessageContent` → `CaseSessionThread` chart bubbles + order-result `attending-md-block`

**Files:** `src/lib/chatMessageFormat.jsx`, `src/ui-overrides.css`, optional `src/lib/chatMessageFormat.test.js`

---

### A2 · Patient sex / gender lock

**Problem:** Female-only presentations (e.g. **097 Dyspareunia** — vaginal dryness, menopause) ship with `patientSex: "male"` and male portrait (**Mr. Hao Zhu**). `resolvePatientSex` defaults to **male** when heuristics miss `vaginal` / `dyspareunia` / `menses`.

**Fix (dev):**

- [ ] Expand `src/lib/patientSex.js` female heuristics: `vaginal`, `dyspareunia`, `menses`, `amenorrhea`, `menopause`, `hot flashes`, `cervix`, `uterus`, `gravida`, `obstetric`
- [ ] Add `src/data/requiredPatientSex.json` (or map in `patientSex.js`): presentation title / case id → `female` | `male` (hard override)
- [ ] Seed female-required: `097` Dyspareunia, `100` Vaginal Itching, and other OB/GYN anatomy-locked CCS titles (audit via script)
- [ ] Update `scripts/audit-patient-sex.mjs`: flag **HPI-heuristic female** vs **declared male** (not only intro age/sex pattern)
- [ ] Add `.cursor/rules/patient-sex-lock.mdc` — block promote/regen when portrait sex ≠ clinical sex
- [ ] `build-prepared-cases.mjs`: run required-sex check before write

**Files:** `src/lib/patientSex.js`, `scripts/audit-patient-sex.mjs`, `scripts/build-prepared-cases.mjs`, `.cursor/rules/patient-sex-lock.mdc`

---

### A3 · Tutor pronoun / name consistency

**Problem:** Tutor opens with **“Mr. Hao Zhu”** then uses **she** in the same message when portrait metadata is wrong.

**Fix (dev):**

- [ ] Ensure server tutor context passes **resolved female** `patientSex` + female `patient_name` after A2
- [ ] Audit `server/caseChat` / tutor system prompt: name + pronouns must match `resolvePatientSex` output

---

### A3b · Tutor sees live order results — **done 2026-06-24**

**Problem:** Attendant tutor only received order **labels** in timeline — not lab/imaging **result text** — so coaching was blind to what the learner already ordered.

**Fix (dev) — completed:**

- [x] `getChatSessionContext` → `buildPortraitSessionContext` with `liveOrderResults`, `pins`, `caseFlow`
- [x] `orderResults` / `labResults` / `imagingResults` in every full tutor message `sessionContext`
- [x] Server appends `tutorSessionHint` so model uses placed results only

**Files:** `src/lib/buildPortraitSessionContext.js`, `src/components/Play.jsx`, `server/index.js`

---

### A3c · Play dock starts collapsed — **done 2026-06-24**

- [x] All cases/modes collapse chrome on case load (`collapseDockPanel` — removed learning-mode auto-expand)

---

### A4 · Learner-facing spoilers (HPI + exam) — **done 2026-06-24**

**Problem:** `hpi_narrative` / `narrative.*.hpi` and `exam` arrays dumped diagnosis, treatment, pathophysiology, and exam inferences into briefing/play.

**Fix (dev) — completed:**

- [x] Batch `practice_hpi` + `answer_key_hpi` for all **194** cases in `preparedCases.json`
- [x] Scrub exam inference language (`consistent with`, `rules out`, `pathognomonic`, …)
- [x] Runtime guards: `learningMode.js`, `caseFlows.js`, `caseExam.js`, `practiceHpi.js`
- [x] Tooling: `npm run audit:learner-spoilers` · `npm run fix:learner-presentation`
- [x] Rules: `.cursor/rules/practice-presentation.mdc`, `attendant-case-canon.mdc` Phase 3 table
- [x] Case spec gold template: `docs/cases/case-122-painful-rash.md` (learner vs answer-key sections)

**Re-run after `build-prepared-cases`:** `npm run fix:learner-presentation`

**Report:** `docs/learner-spoiler-audit.md`

**Not batch-synced:** `data/cases/case_N.json` bank files — promote per case or run sync when Steve asks.

---

### A5 · Imaging / procedure laterality anchor (order-result cache)

**Problem:** Independent LLM generation per order produces **contradictory anatomy** — e.g. case **091**: mammogram **left** UOQ vs standalone US + biopsy **right** breast (`extra-order-ultrasound-breast` vs `diagnostic-mammogram-us` cache).

**Root cause:** No shared `caseImagingAnchor` in order-result prompts; `caseStoryLaterality.js` site regex omits `breast`; extra orders do not reuse stack cache slices.

**Fix (dev):**

- [ ] Add `caseImagingAnchor` (or `mechanismTeaching.cases[id].patientAnchor`) — side, quadrant, clock, size, nipple distance
- [ ] Inject anchor block into stack + extra-order result generation (`orderResultApi` / server prompt)
- [ ] Extend `caseStoryLaterality.js` — `breast`, `axilla` in site pattern; audit on cache write
- [ ] Duplicate imaging extra order → return canonical stack result, not new LLM pass
- [ ] Script: `npm run audit:imaging-laterality` — flag left/right conflicts per case cache
- [ ] Learning vs tutor mode for **wrong extra labs** — see `case-091-lump-in-breast.md` § Patient vs tutor mode

**Files:** `src/lib/caseStoryLaterality.js`, `src/lib/orderResultApi.js`, server order-result route, `src/data/mechanismTeaching.json`, `scripts/audit-imaging-laterality.mjs`

**Case spec:** `docs/cases/case-091-lump-in-breast.md`

---

## B — Case 097 (Dyspareunia / GSM)

**Canon spec:** `docs/cases/case-097-dyspareunia.md`  
**Study session:** `MeWorld-study\game\user-data\cases\097.json` · `f67bb6d2f580cdff74dc2061`

Run **after** A1–A2 (portrait + markdown) or in same dev batch:

### B1 · Identity & portrait

- [ ] `patientSex: "female"` in `preparedCases.json` `"097"`
- [ ] Female patient name (replace Mr. Hao Zhu); `patient_name_default` + portrait persona
- [ ] Regen portrait on dev; clear stale `.case-portraits/case_097.json` male cache
- [ ] Fix tutor/patient voice: age ~51, female pronouns, GSM quotes

### B2 · Clinical data (attendant canon)

- [ ] Replace generic `exam` with pelvic findings + brief general exam
- [ ] `AUTHORED_CASE_LABS` profile `"097"`: FSH 68, E2 8, TSH 1.8
- [ ] `.order-result-cache/case_097.json`: FSH/E2/TSH results + keep pelvic exam text from study cache
- [ ] `interventions`: split diagnostic (`fsh-estradiol`, `tsh`, pelvic exam) vs treatment (`vaginal-estrogen`, lubricants, HRT discussion, Ca/Vit D/DEXA)
- [ ] Expand `orderWhyPlaybook.json` `"097"` with attendant mechanism blurbs
- [ ] Optional: `data/cases/case_97.json` bank parity

### B3 · Do not (097)

- [ ] **Do not** copy 051 lab panel or generic sepsis workup
- [ ] **Do not** push to study lane until Steve says port

---

## C — Backlog (from prior sessions — not 097-specific)

| Id | Item | Notes |
|----|------|--------|
| C1 | Case **051** promote | `case-051-altered-mental-status.md` — SDH diagnosis, CT cache, hold aspirin stacks |
| C2 | Fingerstick glucose in lab catalog | `medical-orders.json` / `LAB_ORDER_NAMES` |
| C3 | Bibliography popover clips right edge | Use `pdfPage1` from First Aid index |
| C4 | Case **061** Lyme | Screenshots, treatment stacks, story plates |
| C5 | **Confounder vignettes** | `docs/cases/CASE-VIGNETTE-BACKLOG-confounders.md` — pheo+stroke+blindness (161), osteoporosis+fracture (097 spin-off); play → markdown before promote |
| C6 | **First Aid coverage pass** | Rule: `.cursor/rules/first-aid-case-coverage.mdc` · script: `first-aid-case-coverage.py` — search all FA hits per topic/concern; touch each in case markdown before promote |
| C7 | Case **091** promote | `case-091-lump-in-breast.md` — left-breast anchor, exam/HPI scrub, playbook + cache fix |
| C8 | Case **103** promote | `case-103-routine-check-up.md` — hidden UTI, female patient, FA lactate/ceftriaxone, UA cache |
| C9 | Case **014** promote | ✅ 2026-06-24 — `promote-case-014.mjs` + portrait regen on dev `:5174` |
| C10 | Case **099** Cauda Equina — character assets | **Future: do not implement yet.** Refs stored: `24-cauda-equina-gemini-char.png` (AI-photoreal male ~55, salt-pepper hair, pained grimace) + `25-cauda-equina-amazon-ref.jpg` (lumbar brace product ref for world-building). Full identityPrompt + game scene prompt analyzed by vision agent 2026-07-01. Pipeline ready when Steve says go. |

---

## E — UI fixes (2026-06-24 batch)

| Id | Item | Status |
|----|------|--------|
| E1 | Dock **case chat** chevron re-expands on collapse | **done** — auto-expand only on new messages |
| E2 | Case **#** visible in learning mode on **dev** (`import.meta.env.DEV`) | **done** |
| E3 | Case Story **Scene 1–6** headings (not Storycraft jargon) | **done** — `CASE_STORY_PROMPT_VERSION` 13 |
| E4 | Case Story prose **collapse** + **Export** markdown | **done** |
| E5 | Teach-me **dock drag lag** | **done** — defer `localStorage` write until pointer-up |
| E6 | **Strip canvas placement constraints** | **done 2026-07-01** — removed `clampPinAwayFromUi` (UI pushback), `snapPoint` (grid snap), `imageFrame` clamping (margin bounds) from `commitStackPlacement` + pin `onDragEnd`. Orders now place at exact drop point anywhere on the full scene, no snapping or nudging. |

---

## D — Verification (dev smoke after batch)

- [ ] `npm run build:data` (if preparedCases touched)
- [ ] `node scripts/audit-patient-sex.mjs` — 097 passes female
- [ ] Open **097** on `:5174` — female portrait, tutor table renders as HTML table in chart
- [x] Study `:5173` — full port 2026-06-24 (UI E1–E5, shuffle coverage, case 014, chat markdown, preparedCases)

---

## Steve edit log

| Date | Change |
|------|--------|
| 2026-06-24 | Created queue: markdown chart rendering + gender lock + case 097 batch; study/dev split |
| 2026-06-24 | **A4 done:** batch learner spoiler fix (194 cases); audit tooling + case-122 markdown template |
| 2026-06-24 | **Case 091** markdown + **A5** imaging laterality queue from study session 8 |
| 2026-06-24 | **Dev batch:** tutor `orderResults` in session context; Play dock starts collapsed; A1 inline GFM tables |
| 2026-06-24 | **Case 103** markdown; UI batch E1–E5 (chat collapse, dev case #, story export/headings, dock drag) |
| 2026-06-24 | **Case 014** markdown — preeclampsia study session; male portrait bug documented |
