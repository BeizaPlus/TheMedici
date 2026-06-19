# Portrait rules — Magnific + scene lock

**Canonical:** **`.cursor/RULES_IMAGE_GENERATION.md`** — all agents start there.

**Magnific app:** https://www.magnific.com/app

**Rule files:** `.cursor/rules/patient-character-maps.mdc` · `meworld-magnific-mcp.mdc`  
**Character maps:** `dev/character-maps/CHARACTER_MAPS.md`

## Pipeline

1. **Scene lock** — approved 16:9 ED baseplate (`SCENE_LOCK.json`) — camera never changes per case
2. **Identity** — Magnific `imagen-nano-banana-2` · 9:16 character map · **2k** · hospital gown
3. **Ship** — `public/case-portraits/case_{id}.png` via `POST /api/case-portrait/generate`
4. **Runtime** — `CasePortraitBriefControl` → Portrait button on dock + briefing

## Framing (non-negotiable)

- Crown → toes, bare feet at bottom of frame
- Female: `patient-scene-female.png` + `female-ed-anatomic-plate.txt`
- Male default ED plate for adult cases
- **Pediatric** (`category` Pediatrics / Neonatology / HPI mentions child): prompt must state **child age 4–10**, smaller proportions — `patientDemographics.isPediatric` in chat context

## Case slug map

`src/data/patientLadyRefs.json` — female likeness by case id or region  
`src/data/patientPediatricRefs.json` — pediatric body-scale lock (cases `054`, `089`, …)

## Smoke

Play-case smoke must:

1. Open case #073 or random play scene
2. Click **Portrait** — panel opens
3. If no cached portrait, trigger generate (or assert placeholder + API 200)
4. Screenshot `portrait-panel.png` in incremental run folder
5. After regen, scene `img` src updates without full page reload

## Do not

- Face-only crop or mid-thigh framing
- Fal (expired) — Magnific only per `meworld-magnific-mcp.mdc`
- Cloud Photoshop / Adobe generative
