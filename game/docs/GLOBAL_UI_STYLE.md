# Global UI style (Immersa / MeWorld)

**Status:** Canonical — all new panels, modals, and scroll regions must match.  
**CSS tokens:** `src/index.css` (`:root` + `#root` global scroll)  
**Overrides:** `src/ui-overrides.css` (Play chrome)

---

## Principle

The app is **one visual system** — Welcome home, Timeline, Case Browser, Briefing, and Play must feel like the same product. Do **not** ship a screen that falls back to **OS-native chrome** (Windows white scrollbars with arrow buttons, default focus rings, system fonts).

If Play looks polished but Welcome Timeline looks like a different app, that is a **FAIL**.

---

## Design tokens (dark theme default)

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0c0c10` | Page background |
| `--panel` | `#14141c` | Cards, side panels |
| `--gold` | `#e8b84b` | Accent, dates, active chrome |
| `--green` | `#3ecf8e` | Success / mastered |
| `--text` | `#f4f4f6` | Body |
| `--muted` | `#8b8b9a` | Secondary copy |
| `--font` | Archivo | **Only** UI font (already on `*`) |

Light theme overrides live under `[data-theme='light']` — same token names.

---

## Scrollbars (global — required)

**Problem:** `.game` had thin gold scrollbars; Welcome / Timeline used **Windows default** (white track, grey thumb, arrow buttons) — see Timeline panel `.welcome-case-timeline-track`.

**Rule:** Every scrollable region under `#root` uses the **global scrollbar** — no per-panel one-offs unless documented below.

| Property | Token / value |
|----------|----------------|
| Width / height | `--scrollbar-size` (8px) |
| Track | `--scrollbar-track` |
| Thumb | `--scrollbar-thumb` (gold-tinted pill) |
| Hover | `--scrollbar-thumb-hover` |
| Firefox | `scrollbar-width: thin; scrollbar-color: var(--scrollbar-color)` |
| WebKit | `::-webkit-scrollbar*` on `#root, #root *` |
| Arrow buttons | **Hidden** (`::-webkit-scrollbar-button { display: none }`) |

**Implementation:** `src/index.css` — block comment `Global scrollbars — entire #root shell`.

### Smoke check

1. Welcome → open **Timeline** → scroll case list → thumb is **gold pill**, track is **dark**, **no** white OS bar.
2. Play → Order·Chat / clinical sidebar → same scrollbar.
3. Settings / entry modals → same (removed legacy white `welcome-entry-modal` scrollbar).

### Exceptions (intentional)

| Region | Behavior | Why |
|--------|----------|-----|
| Horizontal tab strips (e.g. diff story tabs) | `scrollbar-width: none` | Swipe / overflow hidden UX |
| Teach compare landscape rails | May keep local rules if matched to tokens | Prefer `var(--scrollbar-*)` |

**Do not** add new `::-webkit-scrollbar` blocks with hard-coded colors — extend `:root` tokens instead.

---

## Panels & modals

| Pattern | Classes | Notes |
|---------|---------|-------|
| Welcome slide-over | `.welcome-panel`, `.welcome-panel--timeline` | Dark glass, gold kicker, `✕` close |
| Timeline list | `.welcome-case-timeline-track` | Scroll container — **must** inherit global scrollbar |
| Primary button | `.btn-primary` | Gold fill |
| Ghost | `.btn-ghost` | Border only |
| Muted helper | `.muted` or `.welcome-panel-stat.muted` | `--muted` |

Border radius: **10px** cards inside panels; **999px** pills and scrollbar thumbs.

---

## Typography

- **Headings:** Archivo 700–900, sentence case in UI (case titles may be uppercase in catalog).
- **Kick / date:** gold, ~0.72rem (see `.welcome-case-timeline-when`).
- **Meta line:** ~0.64rem, 48% white (see `.welcome-case-timeline-meta`).

Avoid mixing system UI font or Roboto in new components.

---

## Case labels in learner UI

- **Timeline / briefing pickers:** title only — **no `#` CCS prefix** in visible labels (internal ids OK in dev mode).
- **Teach Me compare:** ✕ / ✓ placement cells; no redundant order-count badges when radio state is enough.

---

## Agent checklist (before merge)

1. Read this doc when touching **any** scrollable UI.
2. No new OS-default scrollbars — verify in Welcome **and** Play.
3. Reuse `:root` tokens; no one-off hex unless added to `:root` first.
4. Link smoke row: `docs/smoke-play-pass-checklist.md` Pass A (global chrome).

---

## Related

- `docs/smoke-play-pass-checklist.md`
- `docs/AGENT_AUDIT_PROMPT.md` (scrollbar audit row)
- `docs/components/README.md`
