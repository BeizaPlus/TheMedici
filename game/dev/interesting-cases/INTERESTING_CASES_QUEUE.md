# Interesting cases — meme / reference queue

Steve-dropped meme and reference images for **future MeWorld interesting cases**. Catalog only — **not wired** to `data/cases/` or the case bank yet.

**Purpose:** Callable later for snappy attending voice, case-story pipeline, and portrait/scene generation when Steve promotes an entry to production.

**Architecture:** Cases built from this queue should follow the Brilliant Attending explanation stack — mechanism first, spatial logic, clinical anchor. See **`docs/BRILLIANT_ATTENDING_ARCHITECTURE.md`**.

---

## Queue

| ID | slug | category | dx candidates | ref image | status | notes |
|----|------|----------|---------------|-----------|--------|-------|
| `ic-001` | `adult-drowning-river-cup` | Adult drowning / near-drowning | Drowning (submersion injury), near-drowning with AMS, hypoxic brain injury, pulmonary edema / ARDS post-rescue | `sources/01-adult-drowning-river-cup-ref.png` | **queued** | Black man chest-deep in murky river, head on rock, holding white cup, dazed expression. Meme energy — **altered mental status in water**. **Distinct from `case_113`** (pediatric submersion / dock jump). Adult mechanism + AMS teaching angle. |
| `ic-002` | `scalp-geographic-ridges` | TBD — distinctive exam finding | Neurocutaneous disorder (e.g. NF1 scalp nodules), cutaneous manifestation of systemic disease, memorable dermatology/neuro exam finding — Steve said "something new" | `sources/02-scalp-geographic-ridges-ref.png` | **queued** | Black man profile, shaved scalp with raised geographic / map-like ridge pattern. Category and dx TBD at promotion time. |
| `ic-003` | `ams-wide-eyes-encephalitis` | Encephalitis or meningitis — AMS | Viral encephalitis (HSV), bacterial meningitis, toxic-metabolic encephalopathy, acute delirium | `sources/03-ams-wide-eyes-encephalitis-ref.png` | **queued** | Young Black man, wide eyes, stretched mouth, dazed/shocked meme face. **AMS presentation energy** — not primary Uber character-map pool until case JSON exists. |
| `ic-004` | `orange-jumpsuit-intense` | Correctional health / AMS / TBD | Acute psychosis, delirium in custody, hypertensive emergency, substance intoxication | `sources/04-orange-jumpsuit-intense-ref.png` | **queued** | Black man, very dark skin, intense stern scowl, orange V-neck over white tee — ID-photo / custody energy. Dx TBD. |
| `ic-005` | `macrocephaly-frontal-bossing` | Congenital / neuro exam — TBD | Macrocephaly, hydrocephalus, neurocutaneous syndrome, distinctive craniofacial finding | `sources/05-macrocephaly-frontal-bossing-ref.png` | **queued** | Side profile, extreme frontal bossing, buzz cut, small ear stud. Memorable craniofacial exam ref. |

---

## Character maps (Step 1 — identity lock)

| Step | Folder | Script |
|------|--------|--------|
| Sources | `sources/` | Steve meme drops (5 refs) |
| Pending maps | `character-maps-pending/` | `node scripts/generate-interesting-case-character-maps.mjs` |
| Ship (after approval) | `public/assets/patient/interesting/` | Pick one `*-altN.png` per slug |

Photoreal 9:16 contact sheet on white — four views. See `dev/character-maps/CHARACTER_MAP_TO_GAME_STYLE.md`. **Do not** ship maps directly into Play scenes; game-pass / portrait gen is Step 2 at promotion.

---

## Distinction from existing cases

| Existing | This queue |
|----------|------------|
| **`case_113`** — pediatric drowning, submersion injury, respiratory distress after water rescue | **`ic-001`** — **adult** drowning / near-drowning with river + cup + AMS meme ref; separate case when promoted |

Do not merge `ic-001` into `case_113` without explicit Steve approval.

---

## Routing rules (when promoted)

1. **Catalog only today** — no `case_*.json`, no `realWorldCases.json` entry, no attendant mechanism anchor until Steve says promote.
2. **Portrait / scene gen** — follow `dev/uber-portrait-refs/` patterns (`GAME_SCENE_CAMERA_LOCK.md`, game-pass workflow) when refs graduate from meme plate to shipped asset.
3. **Attending voice** — wire `mechanismTeaching.json` + case JSON per **`docs/BRILLIANT_ATTENDING_ARCHITECTURE.md`** at promotion.
4. **Programmatic lookup** — `interesting-cases.json` in this folder.

---

## Related

| Doc | Path |
|-----|------|
| Brilliant Attending architecture | `docs/BRILLIANT_ATTENDING_ARCHITECTURE.md` |
| Psychiatric / unsettling ref routing (style cousin) | `dev/uber-portrait-refs/PSYCHIATRIC_CASE_CANDIDATES.md` |
| Pediatric drowning (existing) | `data/cases/case_113.json` |
| JSON catalog | `dev/interesting-cases/interesting-cases.json` |

---

## Source provenance

Refs copied from teleprompter-station session assets (Steve drop **2026-06-19**). Original Cursor workspace-storage paths archived under teleprompter-station `assets/`; canonical copies live in `sources/` here.
