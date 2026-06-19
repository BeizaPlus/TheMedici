# Steve host blocking — pending approval

**Generated for:** ~16 min Polymath interview session planning / teleprompter blocking  
**Source interview ref:** 60 Minutes AU `CXKCoFz3WRs` — composition guides from `../angles/`  
**Never overwrites:** `../angles/`, `../frames/`, or approved TV assets

---

## What to review

Compare each pending plate against the matching angle pick in `../angles/`:

| Pending ID | Angle guide | Check |
|------------|-------------|-------|
| `host-mcu-attentive-*` | `02-host-mcu-attentive.png` | Face = Steve/Kwabena · BEIZA blazer + gold lion crest · lobby set · eyeline to guest |
| `host-mcu-reaction-laugh-*` | `11-host-mcu-laugh-alt.png` + `03-host-mcu-laugh-steve-anchor.png` | Candid laugh beat · same MCU axis · **review `*-tvfeed.png`** |
| `host-mcu-notepad-*` | `08-host-mcu-notepad.png` | Notepad visible · scene-cut framing |
| `medium-2shot-zoom-out-*` | 02 (zoomed out) | Both seats visible · host primary left |
| `wide-2shot-establishing-*` | layout master | Full lobby geography · smaller figures |

### Brand checklist

- [ ] **Face:** matches `portrait-locked-cleanbg-v01a-REF.png` + `kwabena-polymath-tv-beiza-master-approved-tvfeed.png`
- [ ] **Wardrobe:** black ribbed knit + dark blazer + **gold lion crest** (not white wordmark)
- [ ] **Lower third:** **NONE** — clean frame bottom (AE composite). Review `*-tvfeed.png` for broadcast degrade.
- [ ] **Set:** blue Polymath lobby — **not** 60 Minutes logo or kitchen set
- [ ] **No** NBC peacock, garbled text, or knit-only wardrobe without blazer

---

## Approve

1. Pick winners per blocking ID (one per setup type).
2. Rename to `*-approved.png` **in this folder** or copy to a new `steve-blocking-approved/` folder (create manually — do not overwrite picks).
3. Reference approved plates in teleprompter session notes / shot list.

---

## Regenerate

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
node scripts/generate-interview-steve-blocking.mjs              # all missing
node scripts/generate-interview-steve-blocking.mjs --id=host-mcu-reaction-laugh --force --degrade
```

**Refs (canonical):**

- `dev/tv-presentations/refs/BEIZA_Hero_Wardrobe_v03A.png`
- `dev/tv-presentations/refs/BEIZA_TV_Apparel_TARGET_ChestPain.png`
- `dev/tv-presentations/refs/BEIZA_Lion_Mascot_MASTER.png`
- `dev/tv-presentations/sources/portrait-locked-cleanbg-v01a-REF.png`

---

## Do not

- Overwrite files in `../angles/` or `../frames/`
- Ship to `processed/beiza-tv/` without Steve rename/approval workflow
- Use `BEIZA_Logo_Pure_White.png` for lower third (mascot only)
