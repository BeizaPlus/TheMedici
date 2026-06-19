# Interview angle card — 60 Minutes AU (CXKCoFz3WRs)

**Source:** [Looksmaxxer Clavicular interview](https://www.youtube.com/watch?v=CXKCoFz3WRs&t=2326s) (60 Minutes Australia)

**Steve anchor:** `03-host-mcu-laugh-steve-anchor.png` @ **38:46** (2326s)

**Recreate in Polymath / BEIZA lobby** (same scene as `dev/tv-presentations/processed/beiza-tv/`):
- Host = **Kwabena Oppong** — BEIZA ribbed knit, gold lion, lavalier/boom
- Lower third = BEIZA lion + `KWABENA OPPONG` / `POLYMATH`
- Background = blue reception / modern lobby bokeh (not 60 Minutes set verbatim)
- Finish = light TV feed degrade (`npm run tv:degrade`)

| File | Timestamp | Shot type | Lens feel | BEIZA / Kwabena notes |
|------|-----------|-----------|-----------|------------------------|
| `01-guest-mcu-black-shirt-early.png` | 10:00 (600s) | Guest MCU — opening beat | ~85mm, shallow DOF | Opening guest frame — white tee, lavalier, kitchen/lobby blur. Establish guest axis before host cuts. |
| `02-host-mcu-attentive.png` | 12:00 (720s) | Host MCU | ~85mm, f/2.8, shallow DOF | Interviewer black shirt, notepad, plants + blinds bokeh. Recreate as **Kwabena**: BEIZA black ribbed knit, gold lion chest, boom mic; same MCU height. |
| `03-host-mcu-laugh-steve-anchor.png` | 38:46 (2326s) | Host MCU — reaction | ~85mm, soft key camera-right | **Steve anchor frame (t=2326).** Host laughing, eyes closed — candid reaction beat. Primary reference for Polymath session tone. |
| `04-guest-mcu-neutral.png` | 38:20 (2300s) | Guest MCU | ~85mm, shallow DOF | Guest white tee, lavalier center, looking off left to host. Swap to on-brand guest wardrobe; keep lavalier + lead room left. |
| `05-guest-mcu-speaking.png` | 14:00 (840s) | Guest MCU — mid answer | ~85mm | Mouth open mid-speech; strong lead room. Match in Polymath lobby background blur. |
| `06-guest-mcu-somber.png` | 31:40 (1900s) | Guest MCU — downcast | ~85mm, low-key | Emotional beat — eyes down, tense jaw. Same camera axis as 04/05. |
| `07-guest-mcu-profile-host-ots.png` | 40:40 (2440s) | Guest MCU (host side / OTS feel) | ~85mm, guest screen-right | Guest in black shirt variant, looking off-camera right — reads as over-host-shoulder energy without showing host back. |
| `08-host-mcu-notepad.png` | 10:50 (650s) | Host MCU — scene cut | ~85mm | Clean scene-change host frame; notepad visible. Kwabena + BEIZA lion + lower-third. |
| `09-guest-mcu-late-tension.png` | 41:30 (2490s) | Guest MCU — late interview | ~85mm | Pre-walkout tension; Moncler/logo chest — replace with BEIZA guest branding if needed. |
| `10-walkout-scene-cut.png` | 40:48 (2448s) | Guest MCU — scene cut (walkout arc) | Cutaway on same axis | Use for exit / uncomfortable beat before guest leaves set. |
| `11-host-mcu-laugh-alt.png` | 40:35 (2435s) | Host MCU — alt reaction cut | Scene-change crop | Alternate host reaction in walkout segment — keep for edit variety. |
| `12-guest-mcu-end-segment.png` | 41:38 (2498s) | Guest MCU — end of extract | ~85mm | Final seconds before 2500s — neutral hold for outro or cut to wide. |

## Extraction stats

- `segment_600-900`: 150 interval (every 2s) + 36 scene cuts
- `segment_1800-2100`: 150 interval (every 2s) + 35 scene cuts
- `segment_2300-2500`: 100 interval (every 2s) + 31 scene cuts

## Re-run

```powershell
cd C:\Users\steve\MeWorld\game
npm run extract:interview-frames
node scripts/pick-interview-angles.mjs
```
