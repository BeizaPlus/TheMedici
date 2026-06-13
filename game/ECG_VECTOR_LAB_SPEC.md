# ECG Vector Lab — Full Rebuild Spec
### For ChatGPT / Claude / any code model

---

## What you are building

A single self-contained HTML file (zero build step, zero npm, zero frameworks).
It must work perfectly on mobile Safari and Chrome, and drop into an existing app later.
The file will be named `ecg-vector-lab.html`.

---

## Design System — MeWorld tokens (DO NOT deviate)

```css
:root, [data-theme='dark'] {
  --bg:      #0c0c10;
  --panel:   #14141c;
  --border:  #2a2a38;
  --gold:    #e8b84b;
  --green:   #3ecf8e;
  --red:     #ef5350;
  --text:    #f4f4f6;
  --muted:   #8b8b9a;
  --font:    'Archivo', sans-serif;
  --mono:    'JetBrains Mono', monospace;
  --radius:  12px;
  --shadow:  0 2px 16px rgba(0,0,0,.55);
}
[data-theme='light'] {
  --bg:    #f3f1eb;
  --panel: #ffffff;
  --border:#d8d2c6;
  --gold:  #9a7209;
  --green: #1f7a52;
  --red:   #b83230;
  --text:  #1a1814;
  --muted: #5c574d;
}
```

Fonts: load from Google Fonts — Archivo (400/500/600/700/900) + JetBrains Mono (400/700).
Kicker labels: `0.58rem / 700 / letter-spacing 0.16em / uppercase / color var(--muted)`.
Theme toggle button: fixed top-right, 34px circle, switches `data-theme` on `<html>`.

---

## Layout — CRITICAL

### Section 1 — Hero (100dvh, full device height, no scroll)

```
┌──────────────────────────────────────────────┐  ← 100dvh
│                                              │
│   CANVAS: body silhouette + anatomical       │
│   heart + vectorscope ring, all overlaid     │
│   fills ~90% of this section height          │
│                                              │
│  ┌── HUD bar (bottom of hero, overlay) ────┐ │
│  │  +60°  QRS  72BPM  [▶][⏸]  [2D▸3D]    │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  ┌── Layer toggle pills (above HUD) ───────┐ │
│  │  [♥ Heart] [◎ Scope] [△ Einthoven]     │ │
│  │  [→ Vector] [☽ T-wave] [☀/☾ Theme]    │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- Use `height: 100dvh` on the hero wrapper.
- The canvas fills the hero. Use `position: absolute; inset: 0` on the canvas, sized by JS to match the wrapper.
- HUD bar: `position: absolute; bottom: 0; left: 0; right: 0` — frosted glass: `background: rgba(12,12,16,0.72); backdrop-filter: blur(12px)`.
- Layer toggle pills: `position: absolute; bottom: 56px; left: 50%; transform: translateX(-50%)` — horizontal scroll on mobile.
- The "2D▸3D" button is a placeholder — clicking it shows a toast "3D mode coming soon".

### Section 2 — Controls + Details (below the fold, scroll to reach)

```
↓ scroll
┌──────────────────────────────────────────────┐
│  AXIS PRESETS: [Normal] [LAD] [RAD] [XAxis]  │
│  Axis slider  −180 ————●———— +180            │
│  Heart rate slider  40 ——●—— 120             │
├──────────────────────────────────────────────┤
│  LEAD POLARITY TABLE (I II III aVR aVL aVF)  │
├──────────────────────────────────────────────┤
│  AXIS EXPLANATION ACCORDIONS                 │
│  [Normal ▼] [LAD ▼] [RAD ▼] [Extreme ▼]     │
│  (auto-opens matching accordion for current) │
├──────────────────────────────────────────────┤
│  ECG STRIP — 8 beats, all 6 leads            │
│  drag to scrub · click lead row to focus     │
└──────────────────────────────────────────────┘
```

All cards use `background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px`.

---

## Canvas — Unified Body + Heart + Scope

Draw everything on a single `<canvas id="unified">` using the Canvas 2D API.
Use `window.devicePixelRatio` (capped at 2) for sharp rendering.

### Layer drawing order (back to front):

1. Background fill (`var(--panel)`)
2. Body silhouette (SVG path, see below)
3. Anatomical heart (SVG paths, see below) — with region colouring
4. Einthoven triangle + electrode dots (if toggle ON)
5. Vectorscope ring + tick marks + lead brackets (if toggle ON)
6. Comet trail (if toggle ON)
7. Vector arrow (if toggle ON)
8. Live comet head dot

### Body silhouette SVG path

Scale and centre the body to fill ~88% of canvas height.
Body native viewBox: 206×206.

```
M104.265,117.959c-0.304,3.58,2.126,22.529,3.38,29.959c0.597,3.52,2.234,9.255,1.645,12.3c-0.841,4.244-1.084,9.736-0.621,12.934c0.292,1.942,1.211,10.899-0.104,14.175c-0.688,1.718-1.949,10.522-1.949,10.522c-3.285,8.294-1.431,7.886-1.431,7.886c1.017,1.248,2.759,0.098,2.759,0.098c1.327,0.846,2.246-0.201,2.246-0.201c1.139,0.943,2.467-0.116,2.467-0.116c1.431,0.743,2.758-0.627,2.758-0.627c0.822,0.414,1.023-0.109,1.023-0.109c2.466-0.158-1.376-8.05-1.376-8.05c-0.92-7.088,0.913-11.033,0.913-11.033c6.004-17.805,6.309-22.53,3.909-29.24c-0.676-1.937-0.847-2.704-0.536-3.545c0.719-1.941,0.195-9.748,1.072-12.848c1.692-5.979,3.361-21.142,4.231-28.217c1.169-9.53-4.141-22.308-4.141-22.308c-1.163-5.2,0.542-23.727,0.542-23.727c2.381,3.705,2.29,10.245,2.29,10.245c-0.378,6.859,5.541,17.342,5.541,17.342c2.844,4.332,3.921,8.442,3.921,8.747c0,1.248-0.273,4.269-0.273,4.269l0.109,2.631c0.049,0.67,0.426,2.977,0.365,4.092c-0.444,6.862,0.646,5.571,0.646,5.571c0.92,0,1.931-5.522,1.931-5.522c0,1.424-0.348,5.687,0.42,7.295c0.919,1.918,1.595-0.329,1.607-0.78c0.243-8.737,0.768-6.448,0.768-6.448c0.511,7.088,1.139,8.689,2.265,8.135c0.853-0.407,0.073-8.506,0.073-8.506c1.461,4.811,2.569,5.577,2.569,5.577c2.411,1.693,0.92-2.983,0.585-3.909c-1.784-4.92-1.839-6.625-1.839-6.625c2.229,4.421,3.909,4.257,3.909,4.257c2.174-0.694-1.9-6.954-4.287-9.953c-1.218-1.528-2.789-3.574-3.245-4.789c-0.743-2.058-1.304-8.674-1.304-8.674c-0.225-7.807-2.155-11.198-2.155-11.198c-3.3-5.282-3.921-15.135-3.921-15.135l-0.146-16.635c-1.157-11.347-9.518-11.429-9.518-11.429c-8.451-1.258-9.627-3.988-9.627-3.988c-1.79-2.576-0.767-7.514-0.767-7.514c1.485-1.208,2.058-4.415,2.058-4.415c2.466-1.891,2.345-4.658,1.206-4.628c-0.914,0.024-0.707-0.733-0.707-0.733C115.068,0.636,104.01,0,104.01,0h-1.688c0,0-11.063,0.636-9.523,13.089c0,0,0.207,0.758-0.715,0.733c-1.136-0.03-1.242,2.737,1.215,4.628c0,0,0.572,3.206,2.058,4.415c0,0,1.023,4.938-0.767,7.514c0,0-1.172,2.73-9.627,3.988c0,0-8.375,0.082-9.514,11.429l-0.158,16.635c0,0-0.609,9.853-3.922,15.135c0,0-1.921,3.392-2.143,11.198c0,0-0.563,6.616-1.303,8.674c-0.451,1.209-2.021,3.255-3.249,4.789c-2.408,2.993-6.455,9.24-4.29,9.953c0,0,1.689,0.164,3.909-4.257c0,0-0.046,1.693-1.827,6.625c-0.35,0.914-1.839,5.59,0.573,3.909c0,0,1.117-0.767,2.569-5.577c0,0-0.779,8.099,0.088,8.506c1.133,0.555,1.751-1.047,2.262-8.135c0,0,0.524-2.289,0.767,6.448c0.012,0.451,0.673,2.698,1.596,0.78c0.779-1.608,0.429-5.864,0.429-7.295c0,0,0.999,5.522,1.933,5.522c0,0,1.099,1.291,0.648-5.571c-0.073-1.121,0.32-3.422,0.369-4.092l0.106-2.631c0,0-0.274-3.014-0.274-4.269c0-0.311,1.078-4.415,3.921-8.747c0,0,5.913-10.488,5.532-17.342c0,0-0.082-6.54,2.299-10.245c0,0,1.69,18.526,0.545,23.727c0,0-5.319,12.778-4.146,22.308c0.864,7.094,2.53,22.237,4.226,28.217c0.886,3.094,0.362,10.899,1.072,12.848c0.32,0.847,0.152,1.627-0.536,3.545c-2.387,6.71-2.083,11.436,3.921,29.24c0,0,1.848,3.945,0.914,11.033c0,0-3.836,7.892-1.379,8.05c0,0,0.192,0.523,1.023,0.109c0,0,1.327,1.37,2.761,0.627c0,0,1.328,1.06,2.463,0.116c0,0,0.91,1.047,2.237,0.201c0,0,1.742,1.175,2.777-0.098c0,0,1.839,0.408-1.435-7.886c0,0-1.254-8.793-1.945-10.522c-1.318-3.275-0.387-12.251-0.106-14.175c0.453-3.216,0.21-8.695-0.618-12.934c-0.606-3.038,1.035-8.774,1.641-12.3c1.245-7.423,3.685-26.373,3.38-29.959l1.008,0.354C103.809,118.312,104.265,117.959,104.265,117.959z
```

Fill: `var(--muted)`, globalAlpha `0.15` (dark) / `0.12` (light).

---

## Anatomical Heart — CRITICAL FEATURE

Draw the heart as **named anatomical regions** using Canvas 2D arcs/beziers.
Do NOT use a single filled path. Each region is a separate shape so it can be coloured independently.

### Heart regions to draw (centred on chest, ~18% of canvas height):

| Region ID | Shape | Position relative to heart centre |
|---|---|---|
| `lv` | Large ellipse, slightly left | Left ventricle — main body, lower-left |
| `rv` | Smaller ellipse, right of lv | Right ventricle — right side |
| `la` | Small ellipse, upper-left | Left atrium — upper-left |
| `ra` | Small ellipse, upper-right | Right atrium — upper-right |
| `apex` | Small rounded triangle, bottom | Apex — very bottom tip of LV |
| `septum` | Thin vertical rect between lv/rv | Interventricular septum |

Draw them as overlapping filled shapes with a stroke outline. Normal state: all regions `rgba(180,30,30,0.55)` fill, `rgba(239,83,80,0.7)` stroke.

### Region colouring per axis condition:

Apply these colours when the axis is in the given range. Animate the transition with `globalAlpha` lerp over ~30 frames.

| Axis range | Condition | Region changes |
|---|---|---|
| −30° to +90° | **Normal** | All regions: healthy red `rgba(180,30,30,0.55)`. Apex glows slightly. |
| −30° to −90° | **LAD** | `apex`: darken to `rgba(30,30,30,0.75)` (electrically weakened). `lv` lateral wall: dim to `rgba(80,20,20,0.5)`. `rv`: slightly brighter `rgba(200,40,40,0.6)` (compensating). |
| +90° to +180° | **RAD** | `rv`: brighten to `rgba(220,60,40,0.75)` (dominant). `lv` + `apex`: dim to `rgba(60,20,20,0.45)`. |
| −90° to ±180° | **Extreme** | All regions dim to `rgba(40,40,40,0.6)`. Septum: `rgba(20,20,20,0.8)`. Suggests global conduction failure. |

Add a subtle pulsing glow on the `lv` region that pulses with each QRS (brighten for 8 frames then fade).

---

## Vectorscope Ring

Centred on the heart/chest area. Radius = ~28% of canvas width.

- Outer gold tick ring (360 ticks, major every 30°)
- Inner 50% ring (faint)
- Crosshair lines (very faint)
- 6 lead bracket targets (corner-bracket style `⌐ ¬`) at each lead angle, labelled I II III aVR aVL aVF
- Focused lead bracket is brighter + blue
- Scope ring background: `rgba(0,0,0,0)` — fully transparent, body shows through

---

## Comet Trail (DaVinci style)

Ring buffer of 180 positions. Each frame push current vector position.
Draw back-to-front with `screen` blend (dark) / `multiply` blend (light).

Colour gradient along trail:
- Tail (oldest): deep red `rgb(160,10,10)` alpha ~0.05
- Mid: orange `rgb(255,120,20)` alpha ~0.35
- Near head: gold `rgb(232,184,75)` alpha ~0.65
- Head: white-blue `rgb(255,235,255)` alpha 1.0

Each point drawn as a radial gradient circle. Head has a large corona glow.

---

## Layer Toggles

Seven pill buttons in a horizontal scrollable row:

| Toggle | Default | Controls |
|---|---|---|
| ♥ Heart | ON | Show/hide anatomical heart regions |
| ◎ Scope | ON | Show/hide vectorscope ring + brackets |
| △ Einthoven | ON | Show/hide triangle + electrode dots |
| → Vector | ON | Show/hide blue vector arrow |
| ✦ Comet | ON | Show/hide comet trail |
| ∿ T-wave | OFF | Include T-wave in animation |
| ☀/☾ Theme | dark | Toggle dark/light |

Pill style: `border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px; font-size: 0.68rem; font-weight: 700`.
Active: `background: rgba(232,184,75,0.12); border-color: rgba(232,184,75,0.55); color: var(--gold)`.
Inactive: `color: var(--muted)`.

---

## HUD Overlay (bottom of hero)

Frosted glass bar, `position: absolute; bottom: 0`:
- Axis value: `+60°` in gold, large mono font
- Phase label: `QRS` / `T wave` / `Baseline` in muted
- BPM value: `72 BPM`
- Play/Pause buttons (minimal, icon only)
- `2D` badge (tapping shows toast: "3D mode coming soon")

---

## ECG Strip (below fold)

Canvas `<canvas id="strip">`. 6 leads stacked. Height 260px.
- 8 beats shown
- Gold dashed playhead
- Drag/touch to scrub time
- Click lead row to focus that lead (highlights it in strip + scope)
- Green fill above baseline, red fill below + T-wave

---

## Axis Explanation Accordions (below fold)

Four items. Auto-open the one matching the current axis zone when preset changes.

Each accordion contains:
- Degree range badge (mono font, gold background)
- 2–3 sentence plain-English explanation
- Lead polarity chips: green chip = upright, red chip = inverted (I, aVF, II shown)
- Causes list (bullet points, clinical causes)

---

## ECG Math (copy exactly)

```js
var LEADS = [
  {n:'I',   deg:0},
  {n:'II',  deg:60},
  {n:'III', deg:120},
  {n:'aVR', deg:-150},
  {n:'aVL', deg:-30},
  {n:'aVF', deg:90}
];

function vecAt(ph) {
  var a = S.angle * Math.PI/180;
  var dx = Math.cos(a), dy = Math.sin(a);
  var px = -dy, py = dx;
  var q0=0.06, q1=0.20;
  if (ph >= q0 && ph <= q1) {
    var u = (ph-q0)/(q1-q0), m, lat;
    if (u < 0.15)       m = -0.18 * Math.sin(u/0.15 * Math.PI);
    else if (u < 0.62)  m = Math.pow(Math.sin((u-0.15)/0.47 * Math.PI), 0.7);
    else                m = -0.28 * Math.sin((u-0.62)/0.38 * Math.PI);
    lat = 0.14 * Math.sin(u * Math.PI * 2);
    return {vx: m*dx + lat*px, vy: m*dy + lat*py, on: true, w:'qrs'};
  }
  if (S.showT && ph > 0.45 && ph < 0.78) {
    var ut = (ph-0.45)/0.33;
    var tm = 0.40*Math.sin(ut*Math.PI), tl = 0.05*Math.sin(ut*Math.PI);
    return {vx: tm*dx + tl*px, vy: tm*dy + tl*py, on: true, w:'t'};
  }
  return {vx:0, vy:0, on:false, w:null};
}

function projL(ph, deg) {
  var v = vecAt(ph);
  if (!v.on) return {val:0, w:null};
  var ul = deg * Math.PI/180;
  return {val: v.vx*Math.cos(ul) + v.vy*Math.sin(ul), w: v.w};
}
```

State object:
```js
var S = {
  angle: 60,       // current QRS axis in degrees
  time: 0,         // animation time (beats)
  speed: 72/3600,  // beats per frame at 60fps
  paused: false,
  showT: false,
  focusLead: 'II',
  showTri: true,
  showHeart: true,
  showScope: true,
  showVector: true,
  showComet: true,
  mag: 0.82        // vector magnitude scale
};
```

---

## Responsive breakpoints

- `> 860px`: hero canvas is tall, controls section is 2-col grid
- `480–860px`: hero canvas fills width, controls single col
- `< 480px`: everything single col, layer toggle pills scroll horizontally, HUD text smaller

---

## What NOT to do

- Do NOT use React, Vue, or any framework
- Do NOT use npm or a build step
- Do NOT use external JS libraries (no d3, no chart.js)
- Do NOT use `<table>` for layout
- Do NOT add a separate vectorscope canvas — everything is on the single unified canvas
- Do NOT put controls above the fold — they go below the hero
- Do NOT use emoji in the UI (use text symbols: ♥ ◎ △ → ✦ ∿)

---

## Output

Return the complete `ecg-vector-lab.html` file. No explanation needed. Just the file.
