# Psychiatry (1) — unzip inventory

**Source zip:** `C:\Users\steve\Downloads\PSYCHIATRY (1).zip` (101 MB)  
**Extracted:** 2026-06-18 → `C:\Users\steve\MeWorld\data\uword-incoming\psychiatry-1\`  
**Status:** Inventoried only — **not** imported into `preparedCases.json`

## Format

- **Vendor export:** UWorld USMLE saved test-interface HTML (`apps.uworld.com` in saved URL comment)
- **Per file:** one `.htm` block + sibling `*_files/` folder (CSS/JS/assets)
- **Mac junk:** `__MACOSX/` + `.DS_Store` — ignore on parse
- **Not** JSON — needs HTML parse → rewrite → Immersa case schema (see `game/docs/UWORD_CASE_BANK_ROADMAP.md`)

## Layout

| Folder | Block `.htm` files | Notes |
|--------|-------------------|--------|
| `PSYCHIATRY/Psychiatry v02_01/` | 40 | Block saves `Psychiatry v02_01_N.htm` |
| `PSYCHIATRY/Psychiatry v02_02/` | 40 | Block saves `Psychiatry v02_02_N.htm` |
| **Total** | **80** | Each block contains **multiple questions** in left navigator |

## Sample block

`PSYCHIATRY/Psychiatry v02_02/Psychiatry v02_02_31.htm` — multi-question NBME-style interface; clinical content in `#common-content` region.

## Next step (when formatting pass starts)

1. Parser script: extract question stem, choices, explanation per `questionindex` row
2. Map to `uword` catalog section (not CCS)
3. Human/agent rewrite — no verbatim UWorld text in learner UI
