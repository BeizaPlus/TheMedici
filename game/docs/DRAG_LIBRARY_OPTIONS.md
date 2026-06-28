# Drag library alternatives (MeWorld game)

**Current stack:** [interact.js](https://interactjs.io/) in `src/hooks/usePinReposition.js` and `src/hooks/useGridDragGame.js` — pointer events, snap grids, inertia modifiers, multi-pointer.

## When to stay on interact.js

Interact.js is still a solid choice for this codebase: both hooks already wire `draggable` + `resizable` modifiers, grid snapping, and pointer capture without React-specific coupling. Replacing it is a multi-file migration with regression risk on pin reposition and stack drag — only worth it if interact.js blocks a concrete bug (touch on a specific device, bundle size cap, or licensing).

## Alternatives (brief)

| Library | Fit for MeWorld | Tradeoff |
|---------|-----------------|----------|
| **@dnd-kit/core** | Best if drag becomes sortable lists / keyboard a11y first | Heavier React model; less ideal for free-form pin reposition on a scene canvas |
| **Pragmatic Drag and Drop** (Atlassian) | Lightweight, framework-agnostic, good for list reorder | No built-in grid snap; you'd keep custom math for pin coordinates |
| **React Aria `useMove`** | Minimal deps, a11y-friendly move gestures | Low-level — you keep all snap/bounds logic (similar effort to interact today) |
| **Pointer Events + custom** | Smallest bundle | Duplicates what interact already solves; only for a trivial one-axis slider |

## Recommendation

**Keep interact.js** for pin reposition and grid stack drag unless Steve hits a reproducible breakage. If migrating later, prefer **@dnd-kit** for teach/stack list reorder only, and keep interact (or custom pointer math) for the patient scene pin layer — split by surface rather than one library for everything.

*Added 2026-06-20 — agent research note; no rewrite unless trivial bug fix.*
