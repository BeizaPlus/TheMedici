# Case story + storyboard smoke checklist

**Use this after a play session** (especially Case 051 TIA) to verify the full sequence before refreshing study mode.

**Script:** `node scripts/smoke-case-story.mjs` (offline; probes API if `:3001` is up)

**Study copy when green:** `cd C:\Users\steve\MeWorld` → `powershell -File scripts\create-study-snapshot.ps1`

---

## A — Play session (build context)

| Step | Action | Pass? |
|------|--------|-------|
| A1 | Open Case **051** in Play | ☐ |
| A2 | Place ≥2 orders (e.g. CT head, carotid duplex) | ☐ |
| A3 | Chat with **attendant** (Order·Chat dock) — ask why quiet / TIA | ☐ |
| A4 | Chat with **patient** if available — get a reply | ☐ |
| A5 | Run an **exam order** so physical proof appears in results | ☐ |
| A6 | Optional: add a line in **case notes** | ☐ |

---

## B — Compile story (prose, no images yet)

| Step | Action | Pass? |
|------|--------|-------|
| B1 | Tap **Case story** (Teach Me export row) | ☐ |
| B2 | Header shows session badge: `Session compiled · N orders · M chat turns` | ☐ |
| B3 | **Refresh** recompiles (button shows `Compiling…`) | ☐ |
| B4 | Title ~ **The Man Who Got Peppered** (or your edit) | ☐ |
| B5 | Five beats: Disruption → … → Recontextualization | ☐ |
| B6 | Prose references **your session** (orders/chat/exam), not generic chart only | ☐ |
| B7 | **Oversight plate** shows dashed box + **Generate oversight still** (not auto-render) | ☐ |

---

## C — Generate master oversight still

| Step | Action | Pass? |
|------|--------|-------|
| C1 | Tap **Generate oversight still** | ☐ |
| C2 | Plate shows `Rendering oversight still…` until done | ☐ |
| C3 | Image appears — **3/4 foot-of-bed angle**, not bird’s-eye | ☐ |
| C4 | Likeness matches play portrait / **master character lock** | ☐ |

*Requires `MAGNIFIC_API_KEY` in `game\.env`.*

---

## D — Storyboard (sequence mode)

| Step | Action | Pass? |
|------|--------|-------|
| D1 | Switch to **Storyboard** tab | ☐ |
| D2 | One panel per chapter — captions visible immediately | ☐ |
| D3 | Plates show `Plate — tap Generate panel stills` (empty until you trigger) | ☐ |
| D4 | Tap **Generate panel stills** | ☐ |
| D5 | Each panel animates `Rendering…` then fills with still | ☐ |
| D6 | Same **patient identity** on every panel (hair, age, gown) — framing may vary per beat | ☐ |
| D7 | **Regenerate panel stills** replaces cached beat PNGs (API `refresh: true`) | ☐ |

---

## E — Edit + twist

| Step | Action | Pass? |
|------|--------|-------|
| E1 | **Edit** → change title or add **Your twist** | ☐ |
| E2 | **Save edits** → `Your edits applied` badge | ☐ |
| E3 | Twist appears as italic chapter at bottom | ☐ |
| E4 | Storyboard includes twist beat after re-open tab | ☐ |
| E5 | **Reset my edits** restores API/offline story | ☐ |

---

## F — Automated smoke

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/smoke-case-story.mjs
```

Expect: `smoke-case-story: ok`

---

## G — Promote to study mode

When A–F pass:

```powershell
cd C:\Users\steve\MeWorld
powershell -File scripts\create-study-snapshot.ps1
```

Then launch: **`START-MEWORLD-STUDY.bat`**

---

## Failures

| Symptom | Fix |
|---------|-----|
| Old title “Stopped Talking” | **Refresh** (prompt v4 + session fingerprint) |
| No session badge | No chat/orders yet — complete section A |
| Generate buttons disabled | Add `MAGNIFIC_API_KEY`; restart API |
| Stale story after new orders | **Refresh** (fingerprint busts cache) |
| Storyboard 400 | Compile prose first (**Refresh** on Prose tab) |
| Character drift between beats | Add/update `dev/case-story/case_XXX-CHARACTER-LOCK.md`; regen with `node scripts/generate-case-story-images.mjs 051 --beat=c3 --force` |
