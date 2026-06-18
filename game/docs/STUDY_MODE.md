# MeWorld study mode — agent + Steve reference

**Read this before touching MeWorld code when Steve is studying cases.**

---

## Three folders — do not confuse them

| Folder | Purpose | Git | Agents edit when… |
|--------|---------|-----|-------------------|
| `C:\Users\steve\MeWorld\game` | **Main development** | Yes (`TheSchoonMaker`) | Steve is **not** in a study session; shipping features; `npm run dev` on main |
| `C:\Users\steve\MeWorld-study\game` | **Frozen study copy** | **No** (robocopy snapshot) | Steve launched **`START-MEWORLD-STUDY.bat`** or said “study mode” |
| `C:\Users\steve\Downloads\teleprompter-station` | **Voiceover teleprompter** | Separate repo | MeWorld script prep / recording only — **not** the clinical game |

**They are not the same level.** Study is a point-in-time copy. Main and study **diverge** as soon as either is edited. `user-data\`, browser localStorage, and uncommitted code are **not** automatically shared.

---

## Steve’s study workflow (agreed)

1. **Launch study** — double-click `C:\Users\steve\MeWorld\START-MEWORLD-STUDY.bat`  
   - Runs `MeWorld-study\game` with `npm run dev:study`  
   - **HMR off** — page won’t hot-reload mid-case  
   - API `:3001` · game `:5173`

2. **While studying** — agents implement fixes **only** under `MeWorld-study\game`  
   - **Do not** edit `MeWorld\game` unless Steve explicitly says “port to main”, “sync main”, or “update main”  
   - **Do not** run `create-study-snapshot.ps1` mid-session (overwrites study code)

3. **When study ends** — choose one:
   - **Promote fixes:** copy changed files from `MeWorld-study\game` → `MeWorld\game`, commit on main  
   - **Re-freeze:** `cd C:\Users\steve\MeWorld` → `powershell -File scripts\create-study-snapshot.ps1` (refreshes study from main; **backs up `user-data` first** if you care about study-only progress)  
   - **Progress only:** copy `MeWorld-study\game\user-data\` → `MeWorld\game\user-data\`

---

## Agent checklist (start of session)

1. **Which folder is Steve using?**  
   - Study bat / “study mode” / `MeWorld-study` path → **study only**  
   - `npm run dev` on main / feature work → **main only**  
   - Teleprompter / `meworld-*.json` recording → **teleprompter-station**

2. **Never edit two MeWorld trees in one task** unless Steve asked to sync.

3. **After code changes** (whichever tree you edited):
   - MeWorld main: `cd C:\Users\steve\MeWorld` → `graphify update .`  
   - Teleprompter: `cd C:\Users\steve\Downloads\teleprompter-station` → `graphify update .`

4. **Do not** assume study has latest main features until snapshot refresh or manual promote.

---

## Graphify (MeWorld has its own — not teleprompter)

| Repo | Graph output | Refresh |
|------|--------------|---------|
| **MeWorld main** | `C:\Users\steve\MeWorld\graphify-out\` | `cd C:\Users\steve\MeWorld` → `graphify update .` |
| **MeWorld study** | `C:\Users\steve\MeWorld-study\graphify-out\` | `cd C:\Users\steve\MeWorld-study` → `graphify update .` |
| **Teleprompter** | `teleprompter-station\graphify-out\` | separate app — different graph |

**Agents:** `graphify query "…"` · `graphify path "A" "B"` · `graphify explain "…"` before big code exploration.

**Cursor rules:** `MeWorld\.cursor\rules\graphify.mdc` · `game\.cursor\rules\graphify.mdc` (copied in study snapshot).

**After code edits** in whichever tree you touched → run `graphify update .` from that tree’s root (AST-only, no API cost).

---

## Chat history — where it lives

| Store | Path / key | Notes |
|-------|------------|--------|
| **Disk (server)** | `game\user-data\cases\NNN.json` → `chatHistory[]` | Canonical after API sync |
| **Disk notes** | `game\user-data\cases\notes\NNN.md` | Journal / voice transcripts |
| **Disk voice** | `game\user-data\recordings\NNN\*.webm` | |
| **Browser** | localStorage `schoonmaker_case_chat_history` | May exist **only** here until synced |
| **Inventory script** | `node scripts/list-chat-histories.mjs` | Lists all on-disk chats |

**Case rail chips** (sidebar Chat tab): tap chip or message icon → loads **that case’s** history while you stay on the current play case. Case IDs are normalized (`2` = `002`).

**Dock chat history** (Order·Chat expander): flat markdown — **no bubbles** (see `ui-overrides.css` `.scene-order-command-chat`).

---

## Refresh study snapshot

```powershell
cd C:\Users\steve\MeWorld
powershell -File scripts\create-study-snapshot.ps1
```

Copies main → `MeWorld-study` (excludes `node_modules`, `.git`). Regenerates `MeWorld-study\STUDY_SNAPSHOT.md`.

**Portrait gens:** `MAGNIFIC_API_KEY` in `MeWorld\.env` (copied into study by script).

---

## Do not

- `git pull` inside `MeWorld-study` (no repo there)
- Edit main while Steve is mid-study session without permission
- Point agents at both `MeWorld` and `MeWorld-study` in one session
- Assume `dev:study` on **main** replaces the **study folder** — they are different trees

---

## Related docs

| Doc | Topic |
|-----|--------|
| `AGENTS.md` | Run dev, smoke, graphify |
| `docs/smoke-case-story-checklist.md` | Case story compile + storyboard plates |
| `docs/smoke-play-pass-checklist.md` | Play smoke passes A–G (Yours ✕/✓) |
| `docs/components/CASE_CHAT.md` | Order·Chat dock, persistence |
| `MeWorld-study\STUDY_SNAPSHOT.md` | Short copy at study root |
| `teleprompter-station\AGENT_HANDOFF.md` | Recording factory (separate app) |
