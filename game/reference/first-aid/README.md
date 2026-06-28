# First Aid USMLE Step 1 — local concept source

**Canonical PDF (Steve machine only):**

`game/reference/first-aid/First_Aid_USMLE_Step_1_2025_35th_Edition.pdf`

35th edition (2025). Used as the **concept-picking** source when building or enriching Immersa cases — high-yield facts, mnemonics, and organ-system sections map to case topics and `orderWhy` / mechanism teaching.

## Agents

- **Read path:** `MANIFEST.json` in this folder, or `src/lib/referenceBooks.js` (`FIRST_AID_STEP1_2025_PDF`).
- **Do not commit** the PDF (gitignored). `MANIFEST.json` and this README are safe to commit.
- **Do not** paste long verbatim excerpts into shipped JSON — paraphrase in Steve's attending voice; cite page/section in dev notes only when useful.
- Study snapshot (`create-study-snapshot.ps1`) mirrors this folder into `MeWorld-study` so study mode has the same source.

## Local index (one-time build, no LLM)

```powershell
cd game
python scripts/build-first-aid-index.py
python scripts/build-first-aid-index.py --search "lyme treatment"
python scripts/build-first-aid-index.py --topic "Lyme disease"
python scripts/first-aid-case-coverage.py --case-id 097 --terms "dyspareunia,menopause,prolactin,FSH,osteoporosis"
```

**Backend:** PyMuPDF (`fitz`) preferred, `pypdf` fallback.

| Output | Committed? | Purpose |
|--------|------------|---------|
| `index/meta.json` | yes | build stats, PDF hash |
| `index/page-map.json` | yes | book page → browser PDF page + excerpt |
| `index/topics.json` | yes | INDEX section topic → pages |
| `index/pages.json` | **no** (gitignored) | full page text for local grep |

**Note:** Playbook cites *book* pages (e.g. p. 144). Browser PDF `#page=` uses **1-based PDF page** — use `page-map.json` `pdfPage1` (Lyme book p. 144 → pdfPage1 **165**).
