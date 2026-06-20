# Teaching channels & case story pins

Steve: **acute bedside** and **prophylaxis/admin** must not be one bundled order when you're learning.

## Teaching channels (on each intervention)

| Channel | Examples |
|---------|----------|
| `acute` | ABCs, oxygen, IV access, glucose, stabilize |
| `prophylaxis` | Tetanus, rabies IG + vaccine, PEP |
| `workup` | Labs, imaging |
| `consult` | ID, surgery, psych |
| `disposition` | Admit, ICU, observation |

**Code:** `src/lib/orderTeachingChannel.js` · set at build via `scripts/caseBankLoader.mjs`

**UI:** Teach Me compare shows a small channel pill (e.g. **Acute / ABCs** vs **Prophylaxis**).

## Compound order split (case bank)

At `npm run build:data`, bundled CCS lines are split automatically:

| Was | Becomes |
|-----|---------|
| Stabilize… **;** administer tetanus… | Acute stabilize + Tetanus prophylaxis |
| Time-sensitive bundle (O₂, IV, glucose) | Three acute rows (deduped if already listed) |

Case **176** (animal bite / rabies) is also fixed in `data/cases/case_176.json`.

Rebuild: `node scripts/build-prepared-cases.mjs`

## Pin teaching beats for Case Story ⭐

When the attendant gives you gold (e.g. *rabies antibodies are useless — you need RIG + vaccine*):

1. **Order result panel** — tap **⭐ Story** on the result card, or  
2. **Dock tutor reply** — tap the **star** next to the expanded answer.

That saves to:

- Per-case notes (`⭐ Teaching moment (case story)` block)
- `teachingMoments` in session context

**Case Story → Refresh** weaves flagged moments into the narrative (prompt version 7+).

## Agent: add channels to new cases

When writing `data/cases/case_*.json`, **never** bundle ABCs + prophylaxis in one `correct_orders` string. If CCS source is bundled, rely on `expandCompoundOrder()` or split manually.
