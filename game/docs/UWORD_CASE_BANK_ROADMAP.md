# U-Word case banks & Immersa catalog roadmap

**Status:** Planning — archives inventoried; formatting and import **not started**.  
**Owner intent:** Expand beyond CCS into transformed **U-Word** cases, then unify under **Immersa** branding at public release.

---

## 1. Incoming case bank archives (Downloads)

These zips are the next raw case banks to format, ingest, and promote into production scripts. **Do not import until a dedicated formatting pass** (same quality bar as four-layer MeWorld scripts + demographics validation).

| # | Path | Notes (from filename) |
|---|------|------------------------|
| 1 | `C:\Users\steve\Downloads\SURGERY (1).zip` | Surgery |
| 2 | `C:\Users\steve\Downloads\PSYCHIATRY (1).zip` | Psychiatry |
| 3 | `C:\Users\steve\Downloads\OBSPSCYCHE17-22.zip` | OB/Psych bundle 17–22 |
| 4 | `C:\Users\steve\Downloads\OBSPSCYCHE12-16.zip` | OB/Psych bundle 12–16 |
| 5 | `C:\Users\steve\Downloads\OBSPSCYCHE1-5.zip` | OB/Psych bundle 1–5 |
| 6 | `C:\Users\steve\Downloads\OBSPSCYCHE7-11.zip` | OB/Psych bundle 7–11 |
| 7 | `C:\Users\steve\Downloads\ABC PEDICS 2.zip` | Pediatrics (ABC) |
| 8 | `C:\Users\steve\Downloads\ABC PEDICS.zip` | Pediatrics (ABC) |
| 9 | `C:\Users\steve\Downloads\PAEDIATRICS 2.zip` | Paediatrics |
| 10 | `C:\Users\steve\Downloads\PAEDIATRICS.zip` | Paediatrics |
| 11 | `C:\Users\steve\Downloads\OBS.zip` | OB |
| 12 | `C:\Users\steve\Downloads\SURGERY 2.zip` | Surgery |
| 13 | `C:\Users\steve\Downloads\OTHERS.zip` | Mixed / other |
| 14 | `C:\Users\steve\Downloads\PSYCH RE.zip` | Psychiatry review |
| 15 | `C:\Users\steve\Downloads\BIOSTAT.zip` | Biostatistics |
| 16 | `C:\Users\steve\Downloads\MEDICINE 1 .zip` | Medicine (note space in filename) |
| 17 | `C:\Users\steve\Downloads\MEDICINE 2.zip` | Medicine |
| 18 | `C:\Users\steve\Downloads\PSYCHIATRY.zip` | Psychiatry |
| 19 | `C:\Users\steve\Downloads\SURGERY.zip` | Surgery |

**Next step (when ready):** unzip → inventory schema → map to `preparedCases` / catalog fields → dedupe against existing 181 CCS + 8 Uber composites.

### Unzip started (2026-06-18)

| Zip | Extracted to | Inventory |
|-----|--------------|-----------|
| `PSYCHIATRY (1).zip` | `data/uword-incoming/psychiatry-1/` | `psychiatry-1/INVENTORY.md` — 80 UWorld HTML blocks (v02_01 + v02_02) |

Remaining 18 zips still in `Downloads\` — extract on demand per domain.

---

## 2. Two catalog sections (learner-facing structure)

| Section | Internal codename | What it is | Today in app |
|---------|-------------------|------------|--------------|
| **CCS** | `ccs` | Legacy / exam-style cases from scraped CCS bank + prepared pipeline | `ccsCatalog.json`, categories, case #001–181 |
| **U-Word** | `uword` | Transformed cases from new zips above — same clinical rigor, **new presentation** | *Not built* — separate category rail or top-level tab |

**Uber cases** remain a third lane (multi-domain composites), not mixed into CCS category lists.

**2026-06-19:** **U09 (Maya)** — first Psychiatry pediatric Uber proof on **main** (`dev/uword-psych-uber/PSYCH_UBER_U09_MAYA.md`). Study snapshot not updated until Steve confirms.

**2026-06-19:** Trauma & Toxicology picker — **Core | Scenarios** tabs (`caseCatalogLanes.js`). Public UI never says CCS/UWorld. Extended lane reads `src/data/uwordTraumaToxCases.json` (empty until zip import). Inventory: `npm run inventory:uword-trauma-tox`.

**2026-06-19:** **U10–U13 (Jordan, Darius, Tom, Amina)** — adult Psychiatry Uber lane on **main** only (`dev/uword-psych-uber/PSYCH_UBER_U10_JORDAN.md` … `U13`). Anchors **193–196**. Pending Steve review before study sync.

Public release: both sections collapse to a single **Immersa Cases** experience — no “CCS” or “U-Word” labels in UI (see §4).

---

## 3. Product vision — one case = one situation (not always clinic)

Each case is a **situation**, not a template room. The setting follows the story.

### 3.1 Beat flow (end-to-end)

```
[Prequel]  →  [ED / scene load]  →  [Physician ↔ patient play]  →  [Outro storyboard]
 10–15s         Hospital (or unit)      Orders, chat, stacks           2×4 comic strip
 video           likeness-locked            Teach Me / practice          what you did + outcome
```

| Phase | Medium | Content |
|-------|--------|---------|
| **Prequel** | Short video or still sequence (~10–15s) | Patient **before** illness — ship deck, home kitchen, hiking trail, etc. Uses **likeness bank** (Pinterest refs → character maps → Magnific). |
| **Case load** | Play scene | Patient on stretcher / appropriate unit; vitals, HPI, stacks. Not forced to “generic clinic” if story says otherwise. |
| **Play** | Teleprompter + Order·Chat + stacks | Physician interviews (patient_sim), orders, labs, imaging — curate until workup complete. |
| **Outro** | **2×4 storyboard grid** (comic strip) | Panels show interventions and **health trajectory** — mirrors **Medical sequence** missed vs saved paths, but **personalized to this run**. |

### 3.2 Storyboard grid (outro)

- Layout: **2 rows × 4 columns** (8 panels).
- Panel 1–2: prequel echo (where they were).
- Middle panels: key orders you placed (or missed).
- Final panels: stabilized vs deteriorated — tied to attendant **mechanism** (Immersa explainer voice).
- Same engine family as **Medical sequence** (`fetchMedicalSequence`, order-tied beats) + **Case story** stills — outro is the **run summary** comic.

### 3.3 Likeness & refs

- **Likeness bank:** `patientLadyRefs.json`, `patientPediatricRefs.json`, `dev/character-maps/`, Pinterest board in pediatric README.
- **Rule:** one memorable patient per case; accessory/temperament from refs; scene lock for hospital plates (~38° foot-of-bed).
- Fetch more Pinterest / approved refs as needed per U-Word case domain.

### 3.4 Relation to existing features

| Feature | Role in vision |
|---------|----------------|
| **Medical sequence** | Teach Me prequel / missed / saved **storyboard** (offline + API); must pass **demographics validation** (`.cursor/rules/medical-sequence.mdc`). |
| **Case story** | Oversight narrative + optional master still — not the same as sequence; can feed outro art. |
| **Uber cases** | Multi-domain touchpoints in one take — separate from CCS and U-Word lanes. |
| **Four-layer scripts** | Production bar for any case promoted to recordable (`MEWORLD_FOUR_LAYER_FRAMEWORK.md`). |

---

## 4. Public release — Immersa branding

Before public launch:

1. **Strip** user-visible strings: “CCS”, “U-Word”, exam vendor names, case numbers where they imply source exams.
2. **Rename** to neutral Immersa language: **Cases**, **Categories**, **Practice**, **Teach Me**.
3. **Transform, don’t clone:** ~98% clinical similarity is fine; presentation, setting, likeness, and narrative beats are **original**. Cases are re-authored (HPI, exam, orders, sequence), not OCR paste.
4. **Settings vary:** ship, home, field clinic, ambulance — prequel establishes place; hospital scene is the play hub unless case design says otherwise.

---

## 5. Copyright & transformation (design principle)

- Source zips = **study material**, not shipped verbatim.
- Pipeline: extract clinical skeleton → rewrite voice + structure → new visuals (likeness, prequel, storyboard) → labeled internal provenance only in dev metadata (`source.status`, not learner UI).
- No 1:1 wording from copyrighted review banks in learner-facing text.
- Mechanisms and order logic remain teachable; **presentation** is Immersa-owned.

---

## 6. Implementation backlog (ordered)

1. **Inventory** — unzip each archive; document file format (JSON, PDF, HTML, etc.).
2. **Schema** — map fields to `preparedCases.json` + `ccsCatalog` (or parallel `uwordCatalog.json`).
3. **Catalog split** — `catalogSection: "ccs" | "uword"` in game data; Case Browser top-level tabs.
4. **Formatting pass** — human/agent rewrite per case; four-layer sections where recordable.
5. **Prequel pipeline** — 10–15s ComfyUI clip from approved still + motion prompt (policy: video = ComfyUI MCP).
6. **Outro 2×4** — render grid from session timeline + medical sequence beats.
7. **Public strip** — Immersa copy pass + remove CCS/U-Word strings.

---

## 7. References (repo)

- Medical sequence rules: `game/.cursor/rules/medical-sequence.mdc`
- Four-layer scripts: `MEWORLD_FOUR_LAYER_FRAMEWORK.md` (teleprompter-station) / `meworld-four-layer-scripts.mdc`
- Uber lane: `src/lib/uberCases.js`, `Uber Cases` category
- Character / pediatric refs: `dev/pediatric-portrait-refs/`, `dev/character-maps/CHARACTER_MAPS.md`
- Immersa attendant voice: `C:\Users\steve\.agents\skills\immersa-explainer\SKILL.md`

---

*Saved from planning session — archives on disk in Downloads; work proceeds after current study/smoke pass is stable.*
