# MeWorld character bank (recurring patient actors)

Same face + name across cases so learners build memory — not a new stranger every vignette.

| Actor | Slug | Face map | First case | Notes |
|-------|------|----------|------------|-------|
| **Tom Hayes** | `tom-hayes` | `craniofacial-asymmetry-goatee` | **U12** — alcohol withdrawal | Pre-call: braked for an **ant** at highway speed. ED: **ants on skin**. Same hallucination thread. |
| *(add rows as ubers ship)* | | | | |

## Rules for new cases

1. **`uberCases.json`** — set `patientName` (full name) and `faceSlug` (portrait registry).
2. **Learning mode title** — shows `patientName` only (no diagnosis in briefing header).
3. **`practiceHpi`** in `uberCaseExtensions.json` — spoiler-free briefing HPI; **`hpiNarrative`** — teach/notes only.
4. **Differential tab** — numbered stack only in learning/briefing; full teaching after **Teach Me** or case complete.

## Tom Hayes — asset index

- Character map: `dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png`
- Pre-call pack: `dev/u12-tom-precall/agent-visual-pack/`
- Game plate: `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png`
