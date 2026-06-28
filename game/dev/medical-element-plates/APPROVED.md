# Medical element plates — approval status (Steve 2026-06-19)

## O2 mask — APPROVED (gold set)

Hudson RCI HUD1040 — ship for compositing.

| File | Status |
|------|--------|
| `raw/o2-mask-hudson-1040-hero-a.png` | **approved** |
| `raw/o2-mask-hudson-1040-hero-b.png` | **approved** |
| `raw/o2-mask-hudson-1040-r45.png` | **approved** |
| `raw/o2-mask-hudson-1040-r90.png` | **approved** |
| `raw/o2-mask-hudson-1040-r270.png` | **approved** |

Pick hero: `o2-mask-hudson-1040-hero-a.png` unless Steve picks B.

---

## IV catheter — partial approval + regen note

| File | Status |
|------|--------|
| `raw/iv-bd-insyte-antecubital-hero-b.png` | **best candidate** — regen: needle must enter **neck** (jugular/CVC site), not antecubital; single tube path |
| `raw/iv-bd-insyte-antecubital-hero-a.png` | **rejected** — tubes out on both sides |
| `raw/iv-bd-insyte-antecubital-r35.png` | **rejected** — dual tubes |
| `raw/iv-bd-insyte-antecubital-r90.png` | **rejected** — dual tubes |

### Regen prompt addendum

```
Single BD Insyte-class winged catheter. ONE continuous extension set — no duplicate parallel tubes.
Insertion site: internal jugular or central neck access (needle into neck skin at sternocleidomastoid triangle),
NOT antecubital fossa. Transparent hub + Tegaderm tape. Tubing exits frame toward IV pole only.
```

Update `prompts/iv-bd-insyte-antecubital-hero.txt` before next Magnific run.
