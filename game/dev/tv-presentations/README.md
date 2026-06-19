# TV / CCS presentation — BEIZA on-brand broadcast stills

**Agent handoff (read first):** [`AGENT_HANDOFF_TV_PRESENTATION.md`](./AGENT_HANDOFF_TV_PRESENTATION.md) — Magnific REST, single-gen pipeline, TV degrade, anti-patterns.

**Review all session images:** [`../REVIEW_ALL_IMAGES.md`](../REVIEW_ALL_IMAGES.md) — folder index + file counts (TV pending, shipped, v1 archive, refs).

**Layout master (Steve pick):** `sources/layout-master-kwabena-polymath-tv.png`
From Downloads `hf_…211932 (2).png` — NBC-style lower third layout (replace logo with **gold BEIZA lion mascot badge**).

## Spec (v3 — final plate)

| Element | Rule |
|---------|------|
| **Look** | Live TV feed — slightly soft, mild compression, faint chromatic aberration — **not** razor-sharp AI |
| **Lower third** | **NONE in final ship** — composited in After Effects. Review comps: `--with-lower-third` |
| **Framing** | Slight profile / three-quarter angle (~15–25° off center) — not dead-on |
| **Wardrobe** | Black ribbed turtleneck + dark blazer + gold lion left chest — `refs/BEIZA_Hero_Wardrobe_v03A.png` + `refs/BEIZA_TV_Apparel_TARGET_ChestPain.png` |
| **Mascot canonical** | `dev/tv-presentations/refs/BEIZA_Lion_Mascot_MASTER.png` — chest embroidery shape lock |

**Too-clean v1:** archived under `processed-v1-too-clean/` (Magnific pass without TV degradation). **Process-to-clean:** `node scripts/process-tv-presentations.mjs` — swaps NBC peacock → BEIZA lion badge, fixes wardrobe, outputs to `pending-approval/`.

## Generate

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/process-tv-presentations.mjs --force --degrade
# Review pending-approval/ → ship with --direct --degrade --ship-ccs (no lower third by default)
# Review comp with name strap: add --with-lower-third
```

## Outputs

`processed/beiza-tv/` — approved files only. New gens → `pending-approval/` (timestamped).

| File | CCS type |
|------|----------|
| `kwabena-polymath-tv-beiza-master-approved.png` | **Shipped** final plate (pre-degrade, no lower third) |
| `kwabena-polymath-tv-beiza-master-approved-tvfeed.png` | **Canonical TV feed ship** (after degrade) |
| `presentation_1_Chest_Pain_presenter.png` | Chest Pain |
| `presentation_2_Altered_Mental_Status_presenter.png` | AMS |
| `presentation_3_Pelvic_Pain_presenter.png` | Pelvic Pain |
| `presentation_4_Abdominal_Pain_presenter.png` | Abdominal Pain |

Presentations 5–8: generate more HF layout alts or re-run with `--only` when script supports variants.

After `tv:degrade`, all four `presentation_*` files are copies of the tvfeed master (not separate Magnific calls).

**Interview ref (planned):** `interview-ref/CXKCoFz3WRs/` — not yet populated; see handoff doc for `extract-interview-frames.mjs`.

## Brand doc

`C:\Users\steve\.cursor\rules\beiza-personal-brand-on-brand.mdc`

---

## Interview reference (60 Minutes → Polymath session)

**Source:** [CXKCoFz3WRs @ 38:46](https://www.youtube.com/watch?v=CXKCoFz3WRs&t=2326s) — Clavicular 60 Minutes Australia interview.

| Path | Contents |
|------|----------|
| `interview-ref/CXKCoFz3WRs/angles/` | **12 curated shot picks** (`01-…` through `12-…`) |
| `interview-ref/CXKCoFz3WRs/INTERVIEW_ANGLE_CARD.md` | Timestamp · shot type · lens · BEIZA recreation notes |
| `interview-ref/CXKCoFz3WRs/frames/interval/` | Every 2s stills (400 total across 3 segments) |
| `interview-ref/CXKCoFz3WRs/frames/scenes/` | Scene-change cuts (102 total) |
| `interview-ref/CXKCoFz3WRs/video/` | 720p MP4 segments (600–900, 1800–2100, **2300–2500**) |

```powershell
cd C:\Users\steve\MeWorld\game
npm run extract:interview-frames
node scripts/pick-interview-angles.mjs
```

Recreate in **same Polymath lobby** as `processed/beiza-tv/` — host = Kwabena (BEIZA wardrobe), lower third = lion + KWABENA OPPONG / POLYMATH.
