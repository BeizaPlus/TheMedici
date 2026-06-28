# Agent handoff — June 15, 2026 (ECG Vector Lab)

**Branch:** `main` · **Remote:** `meworld` → `https://github.com/stefopps/MeWorld.git`  
**Focus:** ECG Vector Lab immersive study + Steve-approved body plates  
**Deep dive doc:** `game/ECG_VECTOR_LAB_HANDOFF.md`

---

## Run

```powershell
cd C:\Users\steve\MeWorld\game
npm run dev
# http://localhost:5173/ecg-vector-lab.html
node scripts/smoke-ecg-vector-lab.mjs
```

---

## Steve-approved assets (keep)

| Plate | Path | Notes |
|-------|------|-------|
| **CardioCard angle** | `game/assets/ecg-vector-lab/character/kojo-cardiocard-angle.png` | Default body in Real + **Angle** look. Magnific ref-04 pose + Kojo face (promoted from pick B). |
| **Gray full body** | `game/assets/ecg-vector-lab/character/kojo-gray-avatar-full.png` | **Gray full** catalog entry — Steve likes this look. Use **Gray B** look button for bundled electrode layout. |

Generation notes: `game/assets/ecg-vector-lab/character/MAGNIFIC_CARDIOCARD_PIPELINE.md`

---

## What shipped (ECG lab — June 14–15)

| Feature | Status |
|---------|--------|
| **Body scroll zoom + pan** | Scroll zooms chest; middle-drag pan; dbl-click reset; Ctrl+scroll = scope ring |
| **Layout 6 bundled** | `layouts/cardiocard-angle-layout.json` + default `ecg-vector-lab-user-layout.json` |
| **Incremental revert scripts** | `scripts/apply-ecg-angle-layout6.mjs` · `revert-ecg-angle-layout6.mjs` |
| **3D toggle** | `ecg-scene-3d.js` · limb ring + V fan (ref 02) |
| **⚡ Flow layer** | Pulse along each lead axis + body wires I/II/III |
| **Click-to-isolate on diagram** | Click scope/triangle lead labels → solo lead + HUD formula |
| **PTB-XL clinical strip** | `assets/ecg-ptbxl-00001-limb-leads.json` |
| **Ref 4 overlay removed** | Pose ref for Magnific only — not drawn on canvas |

---

## Teaching UX (for Manus)

- **Gold hexaxial ring** = fixed frontal-plane angles (`CANONICAL_LEAD_DEG`).
- **White body lines** = real electrode pairs on **angled** torso — may not line up with ring ticks (not a bug).
- **Study loop:** △ Einthoven + ◎ Scope + ⚡ Flow → click **II** → watch RA→LL pulse + +60° ray.

---

## Git commits (ECG — revert-friendly)

| Commit | Reverts |
|--------|---------|
| `20cd7a5` | Layout apply/revert tooling + backup |
| `a097b8d` | Full `assets/ecg-vector-lab/` tree + PTB-XL |
| `18f0273` | `ecg-vector-lab.html` + bundled layout + smoke |
| `e97b171` | Revert doc hash table |

Details: `game/docs/ECG_LAB_INCREMENTAL_REVERT.md`

---

## Next for Manus

1. Confirm Steve-approved PNGs load on boot (`cardiocard-angle` → `kojo-cardiocard-angle.png`).
2. Optional frontal-vs-body angle readout on Angle plate.
3. Optional V1–V6 placement guide in Guide panel.
4. 3D: drag electrodes on mesh; personalized organ meshes from Magnific plates (Meshy pipeline).
5. Push any unpushed ECG commits to `meworld` if Steve wants remote backup.

---

## Other MeWorld context

Previous session (drill panel, voice Whisper fix): `handoff/AGENT_HANDOFF-2026-06-14.md`  
Clone/setup on another PC: `handoff/AGENT_HANDOFF.md`
