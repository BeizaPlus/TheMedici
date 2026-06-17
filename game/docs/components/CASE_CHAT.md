# Order·Chat dock — visual + behavior standard (Steve approved)

**Gold screenshots:** `docs/smoke-screenshots/*/play-case/` — agent smoke must match these.

## Layout (bottom-left on play scene)

```
┌─────────────────────────────────────────────┐
│ [portrait] [camera]                         │
│ [📋] Type an order or ask about this… [Order]│
│ ▴ tutor / patient reply (markdown, expanded) │
│ [chip] [chip] [chip] …  ← all case stacks in Teach Me │
│ ┌ LAB RESULT / EXAM ──────────────────────┐ │
│ │ values + optional Why line               │ │
│ └─────────────────────────────────────────┘ │
│                              [chat] [✕]     │
└─────────────────────────────────────────────┘
```

## Reply strip (quick chat — NOT the Chat tab)

| Input | Route | Reply appears |
|-------|--------|----------------|
| Clinical question | Tutor (`DEEPSEEK` / OpenAI) | **Dock reply** — auto-expanded ▴ |
| Order placed (Teach Me / Learning) | `fetchOrderWhy` | Same dock reply — `Why order …?` |
| Patient mode + interview | `patient_sim` | Dock reply — lay language, short |
| Matched stack order | Canvas pin | Result card below chips |

**Exam mode without Learning:** tutor blocked — toast tells user to enable Learning.

## Markdown rules

Renderer: `src/lib/chatMessageFormat.jsx` → `renderChatMarkdown()`

- Headings: `## Title` on its own line (unwrap `**## Title**`)
- **Bold** mechanism terms; short paragraphs; no raw `##` visible
- Patient replies: `sanitizePatientReplyForDisplay` — one direct answer

## Teach Me stack chips

When **Teach Me ON**, dock shows **every** intervention in the case (e.g. Donepezil + Memantine for #073):

- Placed → active chip, result card
- Unplaced → muted `is-pending` chip (label visible — user knows what's left)

Drugs / admits / CPS → **Critical** tier in Teach Me panel (`isTreatmentOrderIntervention`).

## Pin reposition

Placed order pins: class `pin-draggable` — drag anywhere on patient to reposition (`usePinReposition`).

## Persistence

| Setting | Storage key |
|---------|-------------|
| Dock position per case | `schoonmaker_play_dock_layout_{caseId}` |
| Clinical font | `schoonmaker_clinical_text_prefs` (localStorage JSON) |
| Teach Me notes font | `schoonmaker_teach_me_text_prefs` |
| Case chat history | `schoonmaker_case_chat_history` — per case id |

Font prefs **re-read from localStorage on case change** — never reset to default.

## Smoke checks (must pass)

1. Dock reply visible after tutor question (Chat tab closed)
2. `renderChatMarkdown('**## AMPA receptors**')` → heading, not literal `##`
3. Teach Me #073 dock chips include `Donepezil` before placement
4. Pin drag updates position (`.pin-draggable`)
5. Screenshot saved incrementally under dated `play-case/run-HHMMSS/`

## Related

- `.cursor/rules/play-case-chat.mdc`
- `docs/components/PORTRAIT_RULES.md`
- `docs/components/TEAM_CASE_DISCUSSION.md`
- `docs/cases/case-089-burns.md`
