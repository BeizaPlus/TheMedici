# Case teaching imaging — drop workflow

When Steve drops an image for a case:

1. **Folder:** `docs/cases/case-{id}/imaging/`
2. **Rename:** `case-{id}-{topic}-{role}-source.{ext}` (e.g. `case-144-coarctation-xray-source.png`)
3. **Prompt:** `case-{id}-{topic}-magnific-prompt.txt` beside the source
4. **Markdown:** `docs/cases/case-{id}-{slug}.md` — table with relative links to source + outputs
5. **Magnific test:** `node scripts/enhance-case-teaching-xray.mjs {id} <sourcePath>`
6. **Exposure:** Radiopaedia diagnostic standard — **not overexposed**; lungs + mediastinum + bone texture visible
7. **Overlays:** First pass = clean plate only; arrows / dotted figure-3 lines added in app later

Radiographs ≠ patient portraits — see exposure rules in prompt template under `docs/cases/*/imaging/*-magnific-prompt.txt`.
