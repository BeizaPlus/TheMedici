/**
 * Regenerate actionPotentialSvgCurves.js from the canonical SVG source.
 *
 * Source: C:/Users/steve/Downloads/neuron_action_potential_v2.svg
 * Run: node tools/gen_ap_svg_curves.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_SVG = 'C:/Users/steve/Downloads/neuron_action_potential_v2.svg';
const OUT_JS = path.join(__dirname, '../src/lib/actionPotentialSvgCurves.js');
const OUT_SVG_COPY = path.join(__dirname, '../public/assets/physiology/neuron_action_potential_v2.svg');

const REF = {
  viewW: 680,
  viewH: 520,
  padL: 80,
  padR: 80,
  padT: 60,
  padB: 100,
  graphW: 520,
  graphH: 360,
  graphRight: 600,
  graphBottom: 420,
};

/** Y-axis anchors from SVG grid labels. */
const Y_ANCHORS = [
  { y: 60, mv: 40 },
  { y: 162.9, mv: 0 },
  { y: 304.3, mv: -55 },
  { y: 355.7, mv: -75 },
  { y: 424, mv: -100 },
];

const PHASE_MARKERS = [
  { id: 1, x: 130, y: 395 },
  { id: 2, x: 220, y: 200 },
  { id: 3, x: 258, y: 200 },
  { id: 4, x: 295, y: 425 },
];

const LABELS = {
  membrane: { x: 380, y: 100 },
  na: { x: 380, y: 190 },
  k: { x: 400, y: 330 },
};

function mvFromSvgY(y) {
  for (let i = 0; i < Y_ANCHORS.length - 1; i += 1) {
    const a = Y_ANCHORS[i];
    const b = Y_ANCHORS[i + 1];
    if (y >= a.y && y <= b.y) {
      const f = (y - a.y) / (b.y - a.y || 1);
      return a.mv + (b.mv - a.mv) * f;
    }
  }
  if (y < Y_ANCHORS[0].y) return Y_ANCHORS[0].mv;
  return Y_ANCHORS[Y_ANCHORS.length - 1].mv;
}

function svgXToT(x) {
  return (x - REF.padL) / REF.graphW;
}

function parsePolylinePoints(attr) {
  return attr
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
}

function downsample(points, maxPts = 120) {
  if (points.length <= maxPts) return points;
  const step = (points.length - 1) / (maxPts - 1);
  const out = [];
  for (let i = 0; i < maxPts; i += 1) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

function toCurve(points) {
  const seen = new Set();
  const curve = [];
  for (const p of points) {
    const t = Math.round(svgXToT(p.x) * 10000) / 10000;
    if (t < 0 || t > 1) continue;
    const key = t.toFixed(4);
    if (seen.has(key)) continue;
    seen.add(key);
    curve.push([t, Math.round(mvFromSvgY(p.y) * 100) / 100]);
  }
  curve.sort((a, b) => a[0] - b[0]);
  if (curve[0][0] > 0) curve.unshift([0, curve[0][1]]);
  if (curve[curve.length - 1][0] < 1) curve.push([1, curve[curve.length - 1][1]]);
  return curve;
}

function extractPolylines(svgText) {
  const polylines = [];
  const re = /<polyline[^>]*points="([^"]+)"[^>]*stroke="([^"]+)"[^>]*\/?>/gi;
  let m;
  while ((m = re.exec(svgText)) !== null) {
    polylines.push({ points: parsePolylinePoints(m[1]), stroke: m[2] });
  }
  return polylines;
}

function classifyPolyline(stroke) {
  const s = stroke.toLowerCase();
  if (s.includes('ef9f27') || s.includes('239, 159, 39')) return 'k';
  if (s.includes('378add') || s.includes('55, 138, 221')) return 'na';
  return 'mv';
}

function fmtCurve(name, curve) {
  const body = curve.map(([t, mv]) => `[${t},${mv}]`).join(',');
  return `export const ${name}=[${body}];`;
}

const svgText = fs.readFileSync(SOURCE_SVG, 'utf8');
const polylines = extractPolylines(svgText);

const curves = { k: null, na: null, mv: null };
for (const pl of polylines) {
  const kind = classifyPolyline(pl.stroke);
  if (!curves[kind]) {
    curves[kind] = toCurve(downsample(pl.points));
  }
}

if (!curves.k || !curves.na || !curves.mv) {
  throw new Error(`Missing curves: ${JSON.stringify(Object.keys(curves))}`);
}

const phaseT = Object.fromEntries(PHASE_MARKERS.map((p) => [p.id, svgXToT(p.x)]));

const header = `/**
 * Sampled curves from neuron_action_potential_v2.svg
 * Canonical source: C:/Users/steve/Downloads/neuron_action_potential_v2.svg
 * Regenerate: node tools/gen_ap_svg_curves.mjs
 */

export const AP_SVG_SOURCE = 'neuron_action_potential_v2.svg';

export const AP_SVG_MV_MIN = -100;
export const AP_SVG_MV_MAX = 40;
export const AP_SVG_PERM_BASELINE_MV = -70;

export const AP_SVG_REF = ${JSON.stringify(REF, null, 2).replace(/"([^"]+)":/g, '$1:')};

export const AP_SVG_Y_ANCHORS = ${JSON.stringify(Y_ANCHORS)};

export const AP_SVG_LABELS = ${JSON.stringify(LABELS)};

export const AP_SVG_PHASE_MARKERS = ${JSON.stringify(PHASE_MARKERS)};

export const AP_SVG_PHASE_T = {
  1: ${phaseT[1]},
  2: ${phaseT[2]},
  3: ${phaseT[3]},
  4: ${phaseT[4]},
};

export function svgXToT(x) {
  return (x - AP_SVG_REF.padL) / AP_SVG_REF.graphW;
}

export function svgTToX(t) {
  return AP_SVG_REF.padL + t * AP_SVG_REF.graphW;
}

export function mvFromSvgY(y) {
  const anchors = AP_SVG_Y_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (y >= a.y && y <= b.y) {
      const f = (y - a.y) / (b.y - a.y || 1);
      return a.mv + (b.mv - a.mv) * f;
    }
  }
  if (y < anchors[0].y) return anchors[0].mv;
  return anchors[anchors.length - 1].mv;
}

export function mvToSvgY(mv) {
  const anchors = AP_SVG_Y_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (mv <= a.mv && mv >= b.mv) {
      const f = (a.mv - mv) / (a.mv - b.mv || 1);
      return a.y + (b.y - a.y) * f;
    }
  }
  if (mv > anchors[0].mv) return anchors[0].y;
  return anchors[anchors.length - 1].y;
}

export function svgInterp(arr, t) {
  const u = Math.max(0, Math.min(1, t));
  const n = arr.length;
  if (u <= arr[0][0]) return arr[0][1];
  if (u >= arr[n - 1][0]) return arr[n - 1][1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid][0] <= u) lo = mid;
    else hi = mid;
  }
  const [t0, v0] = arr[lo];
  const [t1, v1] = arr[hi];
  return v0 + ((v1 - v0) * (u - t0)) / (t1 - t0 || 1);
}

export function svgMembraneMv(t, restingOffsetMv = 0) {
  return svgInterp(SVG_MV, t) + restingOffsetMv;
}

export function svgNaMv(t) {
  return svgInterp(SVG_NA, t);
}

export function svgKMv(t) {
  return svgInterp(SVG_K, t);
}

export function naPermPercentFromMv(naMv) {
  return Math.round(Math.max(0, ((naMv + 70.02) / 75.02) * 100));
}

export function kPermPercentFromMv(kMv) {
  return Math.round(Math.max(0, ((kMv + 70.02) / 32.01) * 100));
}

`;

const body = [fmtCurve('SVG_K', curves.k), fmtCurve('SVG_NA', curves.na), fmtCurve('SVG_MV', curves.mv)].join(
  '\n',
);

fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });
fs.writeFileSync(OUT_JS, `${header}${body}\n`);

fs.mkdirSync(path.dirname(OUT_SVG_COPY), { recursive: true });
fs.copyFileSync(SOURCE_SVG, OUT_SVG_COPY);

console.log('Source:', SOURCE_SVG);
console.log('Wrote:', OUT_JS, `(${header.length + body.length} bytes)`);
console.log('Copied SVG to:', OUT_SVG_COPY);
console.log('Points:', { k: curves.k.length, na: curves.na.length, mv: curves.mv.length });
console.log('Phase t:', phaseT);

const STANDALONE = 'C:/Users/steve/action_potential_curves.js';
const standalone = `/** Auto-generated from ${SOURCE_SVG} — node tools/gen_ap_svg_curves.mjs */
window.AP_FROM_SVG = {
  REF: ${JSON.stringify(REF)},
  Y_ANCHORS: ${JSON.stringify(Y_ANCHORS)},
  LABELS: ${JSON.stringify(LABELS)},
  PHASE_MARKERS: ${JSON.stringify(PHASE_MARKERS)},
  PHASE_T: ${JSON.stringify(phaseT)},
  SVG_K: ${JSON.stringify(curves.k)},
  SVG_NA: ${JSON.stringify(curves.na)},
  SVG_MV: ${JSON.stringify(curves.mv)},
};
`;
fs.writeFileSync(STANDALONE, standalone);
console.log('Standalone bundle:', STANDALONE);
