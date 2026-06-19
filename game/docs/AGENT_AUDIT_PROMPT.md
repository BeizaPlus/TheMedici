# Agent audit prompt — MeWorld play UI vs checklist

Copy everything below the line into a **new Claude chat** (or Cursor agent) with **read access to `C:\Users\steve\MeWorld\game`**. Do not edit `MeWorld-study` unless Steve is studying.

---

You are auditing another agent's MeWorld play-mode work against Steve's requirements.

## Your job

1. Read **`docs/smoke-play-pass-checklist.md`** (six passes A–F).
2. Read **`.cursor/PLAY_STACKS_CHECKLIST.md`**.
3. Open **`src/components/Play.jsx`**, **`useDragGame.js`**, **`usePinReposition.js`**, **`scenePinPlacement.js`**, **`PlaySceneToolbar.jsx`**, **`ui-overrides.css`**.
4. For **each checklist row**, report:
   - **PASS** — with file:line evidence
   - **FAIL** — what's missing + exact user-visible symptom Steve reported
   - **NOT TESTED** — only if automation cannot verify (say what Steve must click)

## Steve's reported failures (must verify explicitly)

| # | Requirement | Symptom if broken |
|---|-------------|-------------------|
| 1 | Collapsed **command sidebar** (`.game-sidebar.collapsed`) still **draggable** via `.dock-handle` | Collapsed panel stuck; cannot move chrome |
| 2 | **Double-click** panel toggle button **fully hides** sidebar (`dock-hidden`) | Double-click only expands; never hides |
| 3 | Placed stack **pins** must not land on **sidebar / scene dock / toolbar** | Labels cover UI after drop |
| 4 | **Every** placed pin draggable — including chest exam | Chest pin won't move after 3rd+ placement |
| 5 | **Toggle** hides all scene stack labels without removing placements | No quick hide; clutter on patient |
| 6 | Scrollbars **app-wide** = thin gold (`#root` tokens), not Windows default | White OS scrollbar on Welcome Timeline or clinical panel — see `docs/GLOBAL_UI_STYLE.md` |
| 7 | Case **121** pediatric face locked in **`patientPediatricRefs.json`** + `dev/pediatric-portrait-refs/` | Wrong / generic pediatric portrait |
| 8 | **Pass C scene dock** — Order·Chat block draggable off fixed top-left | Still fixed at 14px/14px |

## Output format

```markdown
## Audit summary
- Passes fully green: X/6
- Blockers for Steve: (numbered list)

## Pass A … F
### Pass B — row name
Status: PASS | FAIL | NOT TESTED
Evidence: `path:line` or manual step
Gap: (if FAIL)

## Missed requirements (agent fault)
1. …

## Recommended fix order
1. …
```

## Rules

- Cite **main repo only**: `C:\Users\steve\MeWorld\game`
- Do not mark PASS without code or reproducible manual step
- If `dockHidden` is never set `true` on double-click → automatic FAIL on row 2
- If `onDockDragStart` returns early when `dockCollapsed` → automatic FAIL on row 1
- If `usePinReposition` effect deps omit pin count → flag row 4 as likely FAIL
- Be blunt. Steve's time was wasted on drag regressions.

---

End of prompt.
