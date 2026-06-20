# Physical exam pin layout

**Global JSON:** `src/data/physicalExamPinLayout.json`  
**Runtime:** `src/lib/physicalExamPinLayout.js`

## Coordinates

Each CCS section (`general`, `chest`, `heart`, …) has normalized **cx / cy** (0–1) relative to the **play scene** — same space as drag-to-move pins.

## Default behavior

When you place physical exam sections (picker or typed order), labels snap to saved positions instead of the old left/right rails.

Priority:

1. Pin’s own `cx` / `cy` (after drag)
2. Saved layout (browser localStorage, then baked JSON)
3. Legacy rail fallback in `pinLayout.js`

## Save your layout (Steve workflow)

1. Place all exam sections (`phys` or Physical Exam picker).
2. Tap **move** (arrows icon) on the order dock.
3. Drag each label to the anatomical spot you want.
4. Tap **file/medical icon** next to move — **Save physical exam layout**.
   - Writes to this browser (`schoonmaker_physical_exam_pin_layout`).
   - Copies full JSON to clipboard.

To ship globally: paste `sections` into `src/data/physicalExamPinLayout.json` and commit.

## Auto-save on drag

Dragging a physical exam label updates that section in localStorage immediately (no need to hit Save unless you want clipboard export).

## Section ids

| id | Label |
|----|--------|
| `general` | General Appearance |
| `chest` | Chest / Lungs |
| `heart` | Heart / Cardiovascular |
| `abdomen` | Abdomen |
| `genitalia` | Genitalia |
| `heent` | HEENT / Neck |
| `skin` | Skin |
| `extremities` | Extremities / Spine |
| `neuro` | Neuro / Psych |
| `lymph` | Lymph Nodes |
| `rectal` | Rectal |
