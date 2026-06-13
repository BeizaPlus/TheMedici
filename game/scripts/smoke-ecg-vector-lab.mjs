import fs from 'fs';
import http from 'http';

const html = fs.readFileSync('C:/Users/steve/MeWorld/game/ecg-vector-lab.html', 'utf8');
const bundled = JSON.parse(
  fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab-user-layout.json', 'utf8')
);

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

const staticChecks = [
  ['bootApp', html.includes('function bootApp')],
  ['async boot', html.includes('loadInitialLayout(bootApp)')],
  ['reloadBundledBtn', html.includes('id="reloadBundledBtn"')],
  ['stripZoom max 300', html.includes('STRIP_ZOOM_MAX=300')],
  ['stripRowAmp helper', html.includes('function stripRowAmp')],
  ['wheel zoom capture', html.includes("addEventListener('wheel',onWheel,{passive:false,capture:true}")],
  ['scroll chart zoom', html.includes('clampStripZoom((S.stripZoom') && html.includes('stripViewMetrics') && !html.includes('if(!e.ctrlKey&&!e.metaKey)return;')],
  ['syncStripViewFromState', html.includes('function syncStripViewFromState')],
  ['scopeScale not from heartScale', !html.includes('S.scopeScale=Math.max(0.6,Math.min(1.8,o.heartScale))')],
  ['scope wheel no resetTrail', !/overScope[\s\S]{0,220}resetTrail/.test(html)],
  ['importLayoutFile', html.includes('id="importLayoutFile"')],
  ['bundled axis 120', bundled.axis === 120],
  ['bundled leadStripW 362', bundled.strip?.leadStripW === 362],
  ['heartDrawGeometry', html.includes('function heartDrawGeometry')],
  ['drawBodySilhouette always', html.includes('function drawBodySilhouette')],
  ['body inline bp fill', html.includes('function drawBodySilhouette') && html.includes('uctx.fill(bp)')],
  ['body clip on heart', html.includes('function withBodySilhouetteClip')],
  ['body gray always', html.includes('drawBodySilhouette(bodyFill)')],
  ['heart chest red bounds', html.includes('function heartDrawGeometry') && html.includes('activeHeartRed()')],
  ['no full-body gray pack draw', !html.includes('function drawBodySvgLayer') && !html.includes('bodyPackScreenScale')],
  ['lead isolate on click', html.includes('function isolateLead')],
  ['heart tint no destination-in', html.includes('drawHeartRegionTint') && !html.includes("globalCompositeOperation='destination-in'")],
  ['body 20% gray fill', html.includes('--body-fill:#333333')],
  ['scope scroll zoom helper', html.includes('function zoomScopeFromWheel')],
  ['canvas color grid', html.includes('id="canvasColorGrid"')],
  ['canvasPalette persist', html.includes('canvasPalette:JSON.parse(JSON.stringify(canvasPalette))')],
  ['initCanvasColorUI boot', html.includes('initCanvasColorUI()')],
  ['canvasCol helper', html.includes('function canvasCol')],
  ['mergeCanvasPalette restore', html.includes('mergeCanvasPalette(o.canvasPalette)')],
  ['strip polarity guide', html.includes('function drawStripPolarityGuide')],
  ['all leads flow badges', html.includes('var POSITIVE_FLOW_LEADS=ALL_LEAD_NAMES')],
];

let failed = 0;
for (const [name, ok] of staticChecks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

const script = html.match(/<script>\s*\(function\(\)\{[\s\S]*\}\)\(\);/);
try {
  new Function(script[0].replace(/^<script>\s*\(function\(\)\{/, '').replace(/\}\)\(\);$/, ''));
  console.log('PASS JS parse');
} catch (e) {
  console.log('FAIL JS parse', e.message);
  failed++;
}

for (const path of ['/ecg-vector-lab.html', '/assets/ecg-vector-lab-user-layout.json']) {
  try {
    const { status, body } = await get(`http://127.0.0.1:5173${path}`);
    const ok = status === 200;
    console.log(`${ok ? 'PASS' : 'FAIL'} GET ${path} (${status})`);
    if (!ok) failed++;
    if (path.endsWith('.json') && ok) {
      const o = JSON.parse(body);
      console.log(`  bundled live axis=${o.axis} RA.x=${o.electrodes?.RA?.x}`);
    }
  } catch (e) {
    console.log(`FAIL GET ${path}`, e.message);
    failed++;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exit(failed ? 1 : 0);
