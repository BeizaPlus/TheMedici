# Scene element registry (anti-slop)

Every object in the MeWorld ED patient portrait — bed, monitor, IV pole, table, gown, O2 mask, catheter — must trace to a **real-world product** or an **approved in-game reference** before generation.

**Master spec:** `SCENE_ELEMENT_REGISTRY.json`  
**Camera lock:** `dev/scene-camera-lock/SCENE_LOCK.json`  
**Medical devices:** `dev/medical-element-plates/`  
**Patient likeness:** `dev/character-maps/` + `src/data/patientLadyRefs.json`

## Rule (agents)

1. **Search first** — Pinterest, manufacturer pages, Magnific stock, or existing game assets. Never prompt from imagination alone.
2. **Save refs** — `sources/<element-id>/` (note Pinterest URL in a `NOTES.md` per folder).
3. **Generate element map once** — Magnific `imagen-nano-banana-2` · `2k` · ref-guided contact sheet or hero plate.
4. **Retouch offline** — Photoshop (`photoshop-offline.mdc`) → `approved/`.
5. **Register** — update `SCENE_ELEMENT_REGISTRY.json` + runtime `src/data/sceneElementRegistry.json`.
6. **Next run** — `resolveSceneElement(id)` loads approved path; portrait prompts reference maps, do not re-invent props.

## Folder layout

```
dev/scene-elements/
  SCENE_ELEMENT_REGISTRY.json   ← full catalog + search terms + status
  sources/<id>/                 ← Pinterest + product photos
  prompts/<id>-hero.txt         ← Magnific prompts per element
  raw/                          ← Magnific outputs before retouch
  approved/                     ← retouched PNG layers for compositing
  README.md

dev/medical-element-plates/     ← O2 + IV (linked from registry)
dev/character-maps/             ← lady patient identity maps
dev/anatomic-plates/            ← body baseplates + IV zone scope
```

## Status values

| Status | Meaning |
|--------|---------|
| `approved` | Map/layer exists — load it, do not regenerate |
| `pending` | Refs collected or gen in progress — finish before compositing |
| `missing` | No ref yet — **stop and search Pinterest/product first** |

## Runtime

```js
import { resolveSceneElement, getApprovedLayerPath } from '../lib/sceneElementRegistry.js';

const iv = resolveSceneElement('iv-bd-insyte-20g-antecubital');
const layerPath = getApprovedLayerPath('o2-mask-hudson-1040');
```

## Audit

```powershell
node scripts/audit-scene-element-registry.mjs
```

Runs in `smoke-test.mjs` predev — fails if registry structure is broken or approved paths are missing on disk.
