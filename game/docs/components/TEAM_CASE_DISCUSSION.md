# Team / case discussion tracking

## Where your conversations live

| What | Storage | Review how |
|------|---------|------------|
| Tutor + patient chat per case | `localStorage` key `schoonmaker_case_chat_history` | Chat tab in play, or export via journal |
| Play session timeline | `caseProgress.js` + checkpoint JSON | Welcome → **Continue** |
| Order timeline | In-session + checkpoint | Right rail **Orders · this patient** |
| Voice notes | `caseUserLog.js` → API when online | Chat / notes tab |

## Server sessions (ephemeral)

- `POST /api/case-chat/start` — RAM only; lost on API restart
- Client recovers via `sendCaseChatMessage(..., recover)`
- Separate sessions: `{caseId}:tutor` vs `{caseId}:patient_sim`

## Case discussion context (DeepSeek)

`buildCaseDiscussionContext` + `caseDiscussionContext.js` — enriches tutor with case-specific thread when available.

**Burns #089 example:** tutor must reference immersion burns, CPS, ophthalmology for retinal hemorrhages — not unrelated adult dementia content.

## For agents

Before changing chat/portrait behavior, read:

1. `docs/components/CASE_CHAT.md`
2. `docs/cases/case-{id}-{slug}.md` when editing a specific case

## Export (future)

Journal stats on Welcome → Profiles shows `totalChatMessages`. Full export hook: `readLocalChatHistory(caseId)` in `caseUserLog.js`.
