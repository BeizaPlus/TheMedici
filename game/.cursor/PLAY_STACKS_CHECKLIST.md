# Play UI regression checklist

Run this after **any** change to stack drag, scene dock, command sidebar, Teach Me, or order results.

## Stack drag (sidebar → patient)

- [ ] Open a case with **Teach Me OFF** — every unplaced stack in the Stacks list drags onto the patient.
- [ ] Drag starts on **mousedown/touch** on the pill label (not only the expand chevron).
- [ ] After a drag, **click does not** toggle the pill expand panel (no accidental expand).
- [ ] Placed stacks show on the patient as **pins**; pins can be **repositioned** on the scene (**all pins**, including chest — `usePinReposition` rebinds on `pinCount`).
- [ ] Free drop: pins **avoid UI chrome** (sidebar, scene dock, toolbar) — `scenePinPlacement.js`.
- [ ] Toolbar **pill icon** toggles scene stack label visibility (`scenePinsHidden`).
- [ ] With **Teach Me ON**, only the **next** stack in sequence is draggable; locked stacks show muted and do not move.
- [ ] **Free drop** mode (settings): pill lands where released over the patient (UI-safe).
- [ ] **Zone drop** mode: pill snaps to the correct torso zone highlight.

## Command sidebar (floating dock)

- [ ] **Expanded**: drag handle moves panel.
- [ ] **Collapsed**: drag handle still moves panel (not blocked).
- [ ] **Single click** handle: collapse / expand.
- [ ] **Double-click** panel toggle (top-right): **fully hide** sidebar (`dock-hidden`).
- [ ] Scrollbars in sidebar / clinical text: **thin gold** game style (not Windows default).

## Command doc + scene dock chat

- [ ] **3-way dock slider** — Orders · Patient · Attending icons all visible horizontally; white thumb slides to active slot.
- [ ] **Case chat / result strips** — ▾ row click expands; ▴ click collapses; user collapse stays until next message (not re-opened on every render).
- [ ] Open **full chat** (command doc), send messages, then **collapse** the command doc — dock still shows **Case chat** thread with full history.
- [ ] **Patient mode** portrait toggle works in both dock and full chat.
- [x] **Patient mode thinking** — dock + thread show **Patient is thinking…** while busy; errors hidden until reply fails.
- [x] **Play dock starts collapsed** — all cases/modes on load; single-click tab expands; double-click collapses
- [ ] Tutor tables render as **tables**, not raw `||` pipes.

## Teach Me vs exam mode

- [ ] **Teach Me OFF**: order result cards show findings only — **no Why** line.
- [ ] **Teach Me ON**: Why is behind a **▾ collapsible** on each result card (collapsed by default).
- [ ] Stack pill **inline why** only expands when **Teach Me ON** and pill is expanded.
- [ ] Wrong-order coaching still appears via **tutor chat** (sequence feedback), not in order result Why.

## Scene dock order results

- [ ] After placing orders, result **chips** scroll when many exams are placed (not clipped/hidden).
- [ ] Tapping a chip switches the result card below.
- [ ] **Print** on result card opens print dialog.

## Screenshots

- [ ] Camera on scene dock saves to `captures/case-###/attempt-###/`.
- [ ] **Explorer** opens the case capture folder after save (Windows).

## Labs catalog

- [ ] Typing **vital signs** or **pulse ox** in the order box matches and can be ordered as extra labs.

## Quick smoke command

```powershell
cd C:\Users\steve\MeWorld\game
npm run build
```
