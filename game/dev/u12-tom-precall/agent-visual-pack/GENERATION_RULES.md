# U12 Tom pre-call — image generation rules (non-negotiable)

**Every** storyboard plate, still, and Kling start frame for this sequence **must** follow this file.  
Agents: read **before** calling Magnific, Higgsfield, or Comfy. **No improvisation.**

---

## 1. Character lock (mandatory on every gen)

| Priority | File | Path |
|----------|------|------|
| **Primary** | Character map alt2 | `dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png` |
| **Craft bar** | Composition gold | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png` |
| **Game ship** | Briefing portrait | `public/assets/patient/uber/craniofacial-asymmetry-goatee-GAME-SCENE.png` |

**Tom Hayes ~45, male trucker:** craniofacial facial asymmetry, short goatee, worn cap.  
If Tom’s face appears in a panel, it **must** match these three refs. **No** alternate faces, ages, or grooming.

---

## 2. Visual style lock (every panel)

| Layer | Global ref folder | Steal |
|-------|-------------------|--------|
| Skin / face | `global-visual-refs/skin-frank-tzeng/` | Sculptural pores, subsurface scatter, hero proportion |
| Interior | `global-visual-refs/interior-bianchini/` | Cab intimacy, motivated amber dash light |
| Environment | `global-visual-refs/environment-ars-thanea/` | Dusk I-80 grade — sodium amber + blue twilight |
| Truck angles | `global-visual-refs/truck-oscar-ramos/` | Immersive sculptural semi — drive + hard-brake |
| In-game bar | GAME-SCENE portrait | MeWorld briefing render language |

**Banned:** bright Pixar, plastic AI gloss, dashboard HUD / speed UI, comic-strip ink outlines, generic stock trucking photos.

---

## 3. Road maintenance hatch (geometry lock)

Steve approved **circular** — not square.

| ✅ Correct | ❌ Wrong |
|-----------|---------|
| **Round** cast-iron **manhole** / maintenance cover, flush in asphalt | Square vault door, rectangular utility hatch, bunker lid |
| Circle ~24–36 in diameter in road surface | Box hatch, grate square, sidewalk access panel |
| Slight seam ring at pavement edge | Industrial square metal plate |

**Prompt terms (use these):** `circular pavement manhole cover` · `round cast-iron road maintenance cover` · `circular hatch flush in asphalt`

**Do not use:** `square hatch` · `rectangular vault` · `utility bunker door` (without specifying round/circular)

**Beats:** Panel 2 (windshield POV — ant near **round** cover) · Panel 3 (close — **circular** cover edge lifted, ant scurries).

---

## 4. Ant + narrative (no drift)

- **Ant** is tiny, on asphalt — psychosis / exhaustion mis-perception thread.
- **Do not** reveal ant before foot-brake cut in final edit (panels 1–3 setup, panel 4 brake).
- Comic tag (beat 7, post-grid): photoreal ant on pavement — **not** stroke illustration.

---

## 5. Truck / interior refs (per shot)

| Shot | Required refs |
|------|----------------|
| `s01-speed-drowse` | Oscar Ramos drive + brake plates, game scene, Ars Thanea |
| `s02-windshield-ant` | Ars Thanea dusk; **circular** manhole in road ahead |
| `s03-hatch-ant` | **Circular** cover close-up; ant |
| `s03-foot-brake` | v1 cab still `outputs/u12-tom-truck-cab-still.png` — **both feet** visible |
| `s04-trailer-swing` | Oscar Ramos **brake** plate (`cb622327…`) |
| `s05-aerial-stop` | Ars Thanea grade, same rig at stop |
| `s06-hold` | Reuse v1 Kling `u12-tom-truck-brake-5s-kling26.mp4` |

---

## 6. Magnific / REST payload

- Max **6** extra inline refs + character base (REST 500 if more).
- Resolution **2K**, aspect **16:9**.
- Script: `generate-storyboard-grid.mjs` — prompt must mirror sections 1–5 above.

---

## 7. Approval workflow

1. Generate grid → `outputs/u12-truck-brake-storyboard-grid-2x3.png`
2. Steve marks panels in **`PANEL_SELECTION.md`**
3. Sign **`APPROVAL.md`** when style + identity pass
4. Only then: per-beat stills + Kling

**No Kling per-beat until selection + approval complete.**
