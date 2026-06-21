# MeWorld character bank (recurring patient actors)

Same face + name across cases so learners build memory — not a new stranger every vignette.

## Progression arc (proposed — ~181 cases)

| Tier | Who | Cases each | Running total | Unlock rule |
|------|-----|------------|---------------|-------------|
| **1 — Tom** | Tom Hayes (`tom-hayes`) | **10** | 10 | Default — truck / withdrawal thread (U12 + members) |
| **2 — Core cast** | 9 named actors (pick from bank below) | **9** each | 91 | Unlock after Tom tier complete |
| **3 — Partners** | Girlfriends / partners of tier-2 cast | **9–10** each | ~180 | Unlock when linked actor tier done |

**Why this works:** learners anchor on one voice (Tom’s I-80 pre-call → ED ants), then the map opens like a series — same face, new mechanism. Uber **memberCaseIds** already merge multiple CCS threads into one patient (see U10 Jordan, U12 Tom). Extend that pattern: each actor = 1 uber anchor + 8–9 catalog members, same `faceSlug` + `patientName`.

**Math:** 10 + (9 × 9) = 91 core · + ~90 partner tier ≈ **181** without inventing 181 strangers.

## Actor roster

| Actor | Slug | Face map | First case | Notes |
|-------|------|----------|------------|-------|
| **Tom Hayes** | `tom-hayes` | `craniofacial-asymmetry-goatee` | **U12** — alcohol withdrawal | Pre-call: braked for an **ant** at highway speed. ED: **ants on skin**. Same hallucination thread. |
| **Jordan Reyes** | `jordan-reyes` | `vitiligo-wink-diastema` | **U10** | Psych uber — bipolar trap |
| **Darius Webb** | `darius-webb` | `copper-afro-headwrap-africa` | **U11** | Psychosis thread |
| **Amina Laurent** | `amina-laurent` | `nevus-speckled-laugh` | **U13** | Trauma / PTSD |
| *(pick 5 more from bank)* | | `dev/uber-portrait-refs` bank slugs | | See **Character map folders** below |

## Character map folders (open to pick faces)

| Folder | Purpose |
|--------|---------|
| `game/dev/uber-portrait-refs/character-maps-pending/` | A/B alts awaiting approval → ship to `public/` |
| `game/dev/uber-portrait-refs/sources/` | Source refs per slug |
| `game/public/assets/patient/uber/*-CHARACTER-MAP.png` | **Shipped** identity sheets (U01–U08, Tom, etc.) |
| `game/dev/character-maps/` | Ladies / mixed rotation (`CHARACTER_MAPS.md`) |
| `game/src/data/patientUberRefs.json` | Registry: slug → uber cases, `bankSlugs` for alternates |

**Bank slugs ready to promote** (in `patientUberRefs.json`): `pipe-tweed-mustache-bank`, `elder-bush-brows-mustache-bank`, `station-mega-afro-beard-bank`, `elder-asian-conical-hat-bank`, `amputee-crutches-rollerblade-bank`, `santa-beard-grass-fullbody-bank`, `strongman-caricature-bank`.

## Rules for new cases

1. **`uberCases.json`** — set `patientName` (full name) and `faceSlug` (portrait registry).
2. **Learning mode title** — shows `patientName` only (no diagnosis in briefing header).
3. **`practiceHpi`** in `uberCaseExtensions.json` — spoiler-free briefing HPI; **`hpiNarrative`** — teach/notes only.
4. **Differential tab** — numbered stack only in learning/briefing; full teaching after **Teach Me** or case complete.

## Tom Hayes — asset index

- Character map: `dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png`
- Pre-call pack: `dev/u12-tom-precall/agent-visual-pack/`
- Game plate: `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png`
