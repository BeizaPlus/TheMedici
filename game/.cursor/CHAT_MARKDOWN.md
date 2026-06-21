# Case chat markdown — presentation rules (mandatory)

**Canonical renderer:** `src/lib/chatMessageFormat.jsx` → used by `ChatMessageContent.jsx` for every tutor/patient/note bubble.

**Parent contract:** `.cursor/CHAT_FEATURES.md`

---

## Goal

Attending replies are **markdown documents**, not plain text. Tables, headings, lists, and voice replay links must **render in the UI** — never show raw `| pipes |`, `##`, or bare URLs.

---

## Must render (no raw leaks)

| Element | Syntax | UI |
|---------|--------|-----|
| **Headings** | `## Title` or `**## Title**` (auto-normalized) | `<h4>` / `<h5>` |
| **Bold / italic** | `**bold**` · `*italic*` | styled spans |
| **Bullet lists** | `- item` | `<ul>` |
| **Numbered lists** | `1. item` | `<ol>` |
| **Tables** | GFM pipe rows + optional `---` separator | `<table>` with gold header row |
| **Code** | `` `inline` `` | monospace chip |
| **Links** | `[label](url)` | anchor |
| **Voice replay** | `[Replay voice note](…/user-data/….webm)` | `<audio controls>` |

---

## Table rules (GFM)

1. **Blank line** before the first `|` row when it follows a paragraph or heading (`normalizeChatMarkdown` enforces this).
2. Separator row optional — consecutive `| col | col |` rows still parse.
3. Separator forms accepted: `|---|---|`, `| --- | --- |`, `:---:`.
4. **Never** leave tutor tables as a single paragraph — if you see raw pipes in chat, fix `chatMessageFormat.jsx`, not the tutor prompt.

### Example (Case 144 differential)

```markdown
**The Differential Framework You're Building**

| Category | Example | Mechanism |
|---|---|---|
| Endocrine | GH deficiency, hypothyroidism | Missing growth signal |
| Genetic | Turner syndrome, SHOX | Missing growth plate capacity |
| Cardiovascular | Coarctation | Missing perfusion to legs |
```

---

## Thread timeline order

| Rule | Detail |
|------|--------|
| **Sort** | Oldest → newest (yesterday before today) |
| **Key** | `sortAt` from note block timestamp, chat `at`, or recording `at` |
| **Voice** | Every saved recording appears with `<audio controls>` — scroll full case history across attempts |
| **Dedup** | Recording row skipped if same replay URL already in a note block |

---

## Case context dock (Play sidebar tabs)

**Chrome:** case title + ER/OBS/ICU/WARD + icon tab row (HPI · exam · orders · chat …).

| Gesture | Behavior |
|---------|----------|
| **Single click** tab icon | Select that tab; if dock is collapsed, **auto-expand** and show panel body |
| **Single click** another tab | **Switch** content; dock stays expanded |
| **Double click** any tab icon | **Collapse** to chrome-only strip (title + unit chips + icons — no HPI/chat/stacks body) |

Implementation: `CaseContextPanel` `onTabCollapse` → `Play.jsx` `collapseDockPanel()`. CSS: `.game-sidebar.floating.collapsed` hides `.case-context-body-wrap`.

Thread / chat markdown still renders inside the expanded **chat** tab body — collapse only hides the scroll region, not the per-case `cases/notes/{id}.md` file.

---

## Agent checklist

- [ ] Tutor prompt may use markdown tables for frameworks — renderer must show them
- [ ] After voice note save: thread shows playable audio + transcript note
- [ ] Four play attempts → four runs of notes + chat + voice visible when scrolling
- [ ] No `**## Heading**` double-wrap visible to user
- [ ] Tables use `case-chat-md-table` styles in `ui-overrides.css`

---

## Files

```
src/lib/chatMessageFormat.jsx   — parser + render
src/components/ChatMessageContent.jsx
src/lib/caseSessionThread.js    — chronological merge + voice rows
src/components/CaseSessionThread.jsx
```
