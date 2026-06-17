# Case chat & Order·Chat dock — source of truth

**Companion rule:** `.cursor/rules/play-case-chat.mdc` (agent quick ref)  
**Primary files:** `Play.jsx`, `SceneOrderCommandDock.jsx`, `CaseSessionThread.jsx`, `chatMessageFormat.jsx`

## Surfaces (two UIs, one brain)

| Surface | When visible | What appears here |
|---------|--------------|-------------------|
| **Order·Chat dock** (`SceneOrderCommandDock`) | Always on play scene (unless hidden) | Orders via command line; **tutor replies** when Chat tab is closed; order result cards; **order-why rationales** after placement |
| **Chat tab** (`PlayChatNotesTabPanel` → `CaseSessionThread`) | Sidebar `infoTab === 'chat'` | Full thread history, voice mic, notes |

### Dock reply area (quick chat mode)

When the user asks a question from the dock **and** the Chat tab is **not** open:

1. `submitOrderCommand` routes to `caseChat.sendMessage` (tutor or patient).
2. Reply lands in `dockChatReply` + `dockReplyExpanded = true`.
3. `SceneOrderCommandDock` renders `renderChatMarkdown(reply)` in `.scene-order-command-reply`.

**Order placement rationales** (Teach Me or Learning mode on):

1. After stack placement, `showOrderWhyInDock(iv)` calls `fetchOrderWhy` (playbook → `/api/order-why`).
2. Same dock reply panel — question `Why order {label}?`, answer = rationale.

Do **not** require opening the Chat tab for coaching text.

## Markdown rendering

`src/lib/chatMessageFormat.jsx` — `renderChatMarkdown(text)`:

- Preprocess via `normalizeChatMarkdown()` — unwraps `**## Heading**`, splits inline `##` onto new lines.
- Block types: headings, lists, tables, paragraphs.
- Used in dock reply **and** `CaseSessionThread` bubbles.

## Tutor vs patient

| Mode | Trigger | Blocked when |
|------|---------|--------------|
| **Tutor** | Default; `looksLikeTutorQuestion()` forces tutor even if portrait gold | Exam mode **and** Learning off |
| **Patient** | Portrait gold / `/pt` | N/A (patient deflects clinical teaching questions) |

Exam mode gate: `!isLearningMode()` → toast *"Enable Learning in Settings"*.

## Orders vs chat (dock command line)

Priority in `submitOrderCommand`:

1. Location switch (`ER`, `ICU`, …)
2. Physical exam picker
3. **Case stack match** → canvas pin
4. Decoy stack
5. **Known catalog order** → extra order (not in Teach Me)
6. **Chat** (tutor/patient)

Autocomplete synonyms: `orderCommandAutocomplete.js` — IV peripheral ≠ central line; `usg abdomen` → Ultrasound abdomen.

## Dock layout persistence

**Per case:** `playDockStorageKey(caseId)` → `schoonmaker_play_dock_layout_054`  
Reloaded when case changes (`usePlayDockLayout({ storageKey })`).

## Vitals after orders

`vitalsProgression.js` — monitor uses `liveVitals` in `Play.jsx`, nudged when `placementOrder` / `extraOrders` grow (phototherapy, O2, fluids, labs).

## API dependencies

| Endpoint | Purpose |
|----------|---------|
| `POST /api/case-chat/*` | Tutor + patient threads (`DEEPSEEK_API_KEY` or `OPENAI_API_KEY`) |
| `POST /api/order-why` | Order rationales (playbook fallback offline) |
| `POST /api/order-result` | Rich lab/imaging text (local `labPanelValues.js` fallback) |

## The Whys (welcome)

`WhysCasePanel` lists **all catalog cases** (not only attempted). Launch → Teach Me mode, skip briefing.

## Component doc index (grow over time)

| Doc | Component |
|-----|-----------|
| `CASE_CHAT.md` | Chat + dock (this file) |
| *(planned)* | `ORDER_RESULT.md`, `MONITOR_VITALS.md`, `WHYS_PANEL.md` |
