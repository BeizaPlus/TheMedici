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
  ['body gray fallback', html.includes('function drawBodySilhouette') && html.includes('function drawBodyPrimary')],
  ['heart chest red bounds', html.includes('function heartDrawGeometry') && html.includes('activeHeartRed()')],
  ['no full-body gray pack draw', !html.includes('function drawBodySvgLayer') && !html.includes('bodyPackScreenScale')],
  ['lead isolate on click', html.includes('function isolateLead')],
  ['heart tint no destination-in', html.includes('drawHeartRegionTint') && !html.includes("globalCompositeOperation='destination-in'")],
  ['body 20% gray fill', html.includes('--body-fill:#333333')],
  ['scope scroll zoom helper', html.includes('function zoomScopeFromWheel')],
  ['body view scroll zoom', html.includes('function zoomBodyViewFromWheel') && html.includes('bodyViewInner')],
  ['body view pan middle drag', html.includes('function initBodyViewPan') && html.includes('e.button!==1')],
  ['ctrl scroll scope ring', html.includes('e.ctrlKey||e.metaKey') && html.includes('zoomScopeFromWheel(e)')],
  ['canvas color grid', html.includes('id="canvasColorGrid"')],
  ['canvasPalette persist', html.includes('canvasPalette:JSON.parse(JSON.stringify(canvasPalette))')],
  ['initCanvasColorUI boot', html.includes('initCanvasColorUI()')],
  ['canvasCol helper', html.includes('function canvasCol')],
  ['mergeCanvasPalette restore', html.includes('mergeCanvasPalette(o.canvasPalette)')],
  ['strip polarity guide', html.includes('function drawStripPolarityGuide')],
  ['all leads flow badges', html.includes('var POSITIVE_FLOW_LEADS=ALL_LEAD_NAMES')],
  ['real ecg loader', html.includes('function loadRealEcg') && html.includes('REAL_ECG_URL')],
  ['stripLeadProj helper', html.includes('function stripLeadProj')],
  ['clinical strip toggle', html.includes('id="realEcgBtn"')],
  ['pinned strip window', html.includes('stripWinStart') && html.includes('function autoScrollStripWindow')],
  ['playhead-only drag', html.includes('PLAYHEAD_HIT') && html.includes('startPlayheadDrag')],
  ['polarity trace smooth', html.includes('function drawPolarityLeadTrace') && html.includes('POL_TRACE_DEAD')],
  ['middle pan strip', html.includes('function panStripWindowByPixels') && html.includes('_stripPan')],
  ['bottom strip collapse', html.includes('stage-bottom-strip') && html.includes('initBottomStripCollapse')],
  ['header play transport', html.includes('header-transport') && html.includes('stage-header-actions') && html.includes('id="playB"')],
  ['no play on canvas overlay', !/body-scope-wrap[\s\S]{0,500}id=\"playB\"/.test(html)],
  ['badge size control', html.includes('id="badgeSizeR"') && html.includes('badgeScale')],
  ['badge spread control', html.includes('id="badgeSpreadR"') && html.includes('badgeSpreadMul')],
  ['vector arrow head scales', html.includes('function drawScopeVectorArrow') && html.includes('shaftLen')],
  ['spacebar playback toggle', html.includes('function togglePlayback') && html.includes("e.code!=='Space'")],
  ['ribs layer toggle', html.includes('data-layer="ribs"') && html.includes('showRibs')],
  ['kojo body plate replaces svg', html.includes('function drawBodyPrimary') && html.includes('hasBodyPlate')],
  ['cardiocard marker defaults', html.includes('CARDIOCARD_NORM') && html.includes('function getBodyPlateRect')],
  ['gray avatar plate style', html.includes("render:'native'") && html.includes('photoGray')],
  ['svg vs real body mode', html.includes('bodyMode') && html.includes('initBodyModeToggle') && html.includes('isRealBodyMode')],
  ['body plate viewport height', html.includes('bodyPlateViewportHeightPx') && html.includes('isRealBodyMode()')],
  ['match plate bg', html.includes('matchPlateBgBtn') && html.includes('applyPlateBackgroundMatch')],
  ['canonical hexaxial scope', html.includes('CANONICAL_LEAD_DEG') && html.includes('function scopePtFromDeg')],
  ['references dock tab', html.includes('data-dock-tab="references"') && html.includes('id="dockBtnRefs"') && html.includes('initRefGallery')],
  ['references deep link', html.includes('parseDockDeepLink') && html.includes("hash==='references'")],
  ['body look catalog', html.includes('BODY_PLATE_CATALOG') && html.includes('setBodyPlateId') && html.includes('boy-ecg-placement-plate-a.png')],
  ['body look default placement-a', html.includes("bodyPlateId:'cardiocard-angle'") && html.includes('RIB_CAGE_ANTERIOR')],
  ['bundled bodyPlateId', bundled.bodyPlateId === 'cardiocard-angle'],
  ['svg ribs layer', html.includes('drawRibCageSvgLayer') && html.includes('rib-cage-anterior-data.js')],
  ['3d scene module', html.includes('ecg-scene-3d.js') && html.includes('data-view-mode="3d"') && html.includes('id="scene3d"')],
  ['ref02 layer toggles', html.includes('data-layer="limbRing"') && html.includes('data-layer="vFan"')],
  ['gray-b bundled layout', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/layouts/gray-b-layout.json') && html.includes('BODY_PLATE_LAYOUTS')],
  ['cardiocard-angle bundled layout', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json') && html.includes("'cardiocard-angle':'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json'")],
  ['bundled angle RA tuned', bundled.electrodes?.RA?.x > 70 && bundled.electrodes?.RA?.x < 80],
  ['cardiocard anchor defaults', html.includes('CARDIOCARD_NORM') && html.includes('precordial:JSON.parse') && bundled.precordial && bundled.precordial.V1],
  ['ptbxl asset file', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-ptbxl-00001-limb-leads.json')],
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

for (const path of ['/ecg-vector-lab.html', '/assets/ecg-vector-lab-user-layout.json', '/assets/ecg-ptbxl-00001-limb-leads.json']) {
  try {
    const { status, body } = await get(`http://127.0.0.1:5173${path}`);
    const ok = status === 200;
    console.log(`${ok ? 'PASS' : 'FAIL'} GET ${path} (${status})`);
    if (!ok) failed++;
    if (path.endsWith('.json') && ok) {
      const o = JSON.parse(body);
      if (path.includes('ptbxl')) {
        console.log(`  ptbxl fs=${o.fs} duration=${o.durationSec}s leads=${Object.keys(o.leads || {}).join(',')}`);
      } else {
        console.log(`  bundled live axis=${o.axis} RA.x=${o.electrodes?.RA?.x}`);
      }
    }
  } catch (e) {
    console.log(`FAIL GET ${path}`, e.message);
    failed++;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exit(failed ? 1 : 0);
