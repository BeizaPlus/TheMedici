# TheSchoonMaker — feature timeline (making-of)

Bundled: **2026-06-16** · folder: `game/docs/making-of/`

Use this for behind-the-scenes posts, articles, and demo reels. Pair screenshots in `screenshots/` with beats below.

---

## Product north star

**TheSchoonMaker** — drag-and-place clinical orders on a cinematic ED patient scene. **181 CCS cases**, React + Vite + Express. Teach Me mode for guided sequencing; practice mode for free exploration.

---

## Timeline (newest first)

### 2026-06-16 — Play UX polish & clinical plates

| Feature | What to show | Screenshot |
|---------|--------------|------------|
| **Results tab + lower-third carousel** | Lab/result text lives in Results tab; on-scene carousel at lower third | Play mode (capture manually) |
| **Practice vs Teach Me results** | Practice = raw values only; Teach Me adds interpretation | Results tab compare |
| **Compare tap = explanation only** | Tapping a stack in review shows rationale card — dock does not reopen | Teach Me compare |
| **Landscape compare rails** | Critical / General tiers, wrapped labels, lower-third layout | Case 4 DKA landscape |
| **Critical tier push-down** | Expanding Critical pushes General down (no truncation) | Flow compare panel |
| **IV access portal scope** | Green = torso exams; red = IV portals; antecubital first | `screenshots/anatomic-plates/*-anatomy.png` |
| **Male crop lock** | Full patient crown→toes framing | `male-ed-anatomic-plate-a.png` |
| **Female lady plate regen** | Akosua likeness + approved portal scope | `female-ed-anatomic-plate-a.png` |
| **Print fix** | Real printable HTML → Microsoft Print to PDF | Result card print |
| **IDM / video guard** | Blob URLs for in-app video (no download overlay) | Welcome / patient scene |

**Smoke set:** `screenshots/smoke/2026-06-16/`

---

### 2026-06-13 — ECG Vector Lab

| Feature | Screenshot |
|---------|------------|
| Heart model on/off | `ecg-lab-heart-on.png` / `ecg-lab-heart-off.png` |
| Single-lead focus (aVF) | `ecg-lab-lead-avf-solo.png` |
| Strip zoom | `ecg-lab-strip-zoomed.png` |

**Folder:** `screenshots/smoke/2026-06-12/` (ECG dated 06-13)

---

### 2026-06-12 — Differential study loop

| Step | File |
|------|------|
| Welcome | `01-welcome.png` |
| After physician pick | `02-after-physician.png` |
| Differential main | `03-differential-main.png` |
| Study Case tab | `04-study-case-tab.png` |
| Real World tab | `05-study-realworld-tab.png` |
| Floating chat | `06-floating-chat-open.png` |

**Folder:** `screenshots/smoke/2026-06-12/`

---

### 2026-06-10 — First automated smoke screenshots

Same six-step differential flow — baseline capture pipeline.

**Folder:** `screenshots/smoke/2026-06-10/`

---

### 2026-06-02 — Platform foundations (see `docs/session-2026-06-02.md`)

- Circular dependency fix (cases load again)
- DeepSeek + OpenAI chat routing
- Floating chat panel (drag, resize, orders + chat)
- Read-aloud (Chatterbox TTS)
- Notes mode, copy thread, favorites
- MeWorld rename from ER doc

---

## Suggested article angles

1. **"Building a CCS trainer that feels like a game, not a quiz"** — welcome → play → teach me arc (`06-10` / `06-12` smokes)
2. **"Why we locked the camera on the patient bed"** — anatomic plates + crop lock PNGs
3. **"Practice vs Teach Me"** — same case, two philosophies (AGENTS handoff)
4. **"Real patients in the syllabus"** — Real World tab + TSS case (`05-study-realworld-tab.png`)
5. **"ECG as a lab, not a slideshow"** — ECG vector lab smokes

---

## Social crop hints

| Asset | Suggested use |
|-------|----------------|
| `03-differential-main.png` | LinkedIn hero — dark UI + chief complaint |
| `*-anatomy.png` | Thread slide: "where IVs can go" |
| `ecg-lab-heart-on.png` | Reel cover — 3D heart + strips |
| `02-after-physician.png` | "Choose your lane" carousel first slide |

---

## Re-bundle after new work

```powershell
Set-Location C:\Users\steve\MeWorld\game
node scripts/bundle-making-of.mjs
npm run smoke:differential-session   # refreshes today's smoke PNGs first
```
