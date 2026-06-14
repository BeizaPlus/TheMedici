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
  ['stripRowAmp helper', html.includes('function stripRowAmpForLead') && html.includes('STRIP_ROW_FILL')],
  ['strip auto fit default', html.includes('stripManualZoom') && html.includes('function resetStripAutoFit')],
  ['wheel zoom capture', html.includes("addEventListener('wheel',onWheel,{passive:false,capture:true}")],
  ['scroll chart zoom', html.includes('clampStripZoom((S.stripZoom') && html.includes('stripViewMetrics') && !html.includes('if(!e.ctrlKey&&!e.metaKey)return;')],
  ['syncStripViewFromState', html.includes('function syncStripViewFromState')],
  ['scopeScale not from heartScale', !html.includes('S.scopeScale=Math.max(0.6,Math.min(1.8,o.heartScale))')],
  ['scope wheel no resetTrail', !/overScope[\s\S]{0,220}resetTrail/.test(html)],
  ['importLayoutFile', html.includes('id="importLayoutFile"')],
  ['bundled axis 120', bundled.axis === 120],
  ['bundled leadStripW', bundled.strip?.leadStripW === 511 || bundled.strip?.leadStripW === 822 || bundled.strip?.leadStripW === 504],
  ['heartDrawGeometry', html.includes('function heartDrawGeometry')],
  ['drawBodySilhouette always', html.includes('function drawBodySilhouette')],
  ['body inline bp fill', html.includes('function drawBodySilhouette') && html.includes('uctx.fill(bp)')],
  ['body clip on heart', html.includes('function withBodySilhouetteClip')],
  ['body gray fallback', html.includes('function drawBodySilhouette') && html.includes('function drawBodyPrimary')],
  ['heart chest red bounds', html.includes('function heartDrawGeometry') && html.includes('activeHeartRed()')],
  ['no full-body gray pack draw', !html.includes('function drawBodySvgLayer') && !html.includes('bodyPackScreenScale')],
  ['lead multi toggle pills', html.includes('function onLeadPillClick') && html.includes('toggleLeadVisible') && html.includes("addEventListener('click',function(e)")],
  ['heart tint no destination-in', html.includes('drawHeartRegionTint') && !html.includes("globalCompositeOperation='destination-in'")],
  ['body 20% gray fill', html.includes('--body-fill:#333333')],
  ['scope scroll zoom helper', html.includes('function zoomScopeFromWheel')],
  ['body view scroll zoom', html.includes('function zoomBodyViewFromWheel') && html.includes('bodyViewInner')],
  ['fit canvas view 2d 3d', html.includes('function fitCanvasView') && html.includes('function fitBodyView2d') && html.includes('id="fitViewBtn"')],
  ['scope triangle-derived SR', html.includes('function scopeBaseRadiusCanvas') && html.includes('SCOPE_TRI_MEAN_BODY_REF')],
  ['scope ring mode toggle', html.includes('scopeRingMode') && html.includes('initScopeRingModeControls')],
  ['3d scope triangle base', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('_scopeWorldBase')],
  ['body view pan middle drag', html.includes('function initBodyViewPan') && html.includes('e.button!==1')],
  ['lead flow layer', html.includes('showLeadFlow') && html.includes('showLeadFlowPath') && html.includes('function drawLeadFlowLayer')],
  ['flow path vs pure flow split', html.includes('data-layer="leadFlowPath"') && html.includes('Pure flow') && html.includes('Flow path')],
  ['click scope label isolate', html.includes('function hitStudyLead') && html.includes('registerStudyLeadHit')],
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
  ['body plate fit in body box', html.includes('function getBodyPlateRect') && html.includes('maxH=bodyNH*sc') && !html.includes('bodyPlateViewportHeightPx')],
  ['match plate bg', html.includes('matchPlateBgBtn') && html.includes('applyPlateBackgroundMatch')],
  ['canonical hexaxial scope', html.includes('CANONICAL_LEAD_DEG') && html.includes('function scopePtFromDeg')],
  ['references dock tab', html.includes('data-dock-tab="references"') && html.includes('id="dockBtnRefs"') && html.includes('initRefGallery')],
  ['references deep link', html.includes('parseDockDeepLink') && html.includes("hash==='references'")],
  ['body look catalog', html.includes('BODY_PLATE_CATALOG') && html.includes('setBodyPlateId') && html.includes('boy-ecg-placement-plate-a.png')],
  ['body look default 16x9 desktop', html.includes("bodyPlateId:'cardiocard-angle-16x9'") && html.includes("BODY_PLATE_DEFAULT_ID='cardiocard-angle-16x9'")],
  ['angle plate steve pick', html.includes('kojo-cardiocard-angle.png')],
  ['bundled bodyPlateId', bundled.bodyPlateId === 'cardiocard-angle-16x9'],
  ['svg ribs layer', html.includes('drawRibCageSvgLayer') && html.includes('rib-cage-anterior-data.js')],
  ['3d scene module', html.includes('ecg-scene-3d.js') && html.includes('data-view-mode="3d"') && html.includes('id="scene3d"')],
  ['three npm dep', JSON.parse(fs.readFileSync('C:/Users/steve/MeWorld/game/package.json','utf8')).dependencies?.three != null],
  ['ref02 layer toggles', html.includes('data-layer="limbRing"') && html.includes('data-layer="vFan"')],
  ['gray-b bundled layout', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/layouts/gray-b-layout.json') && html.includes('BODY_PLATE_LAYOUTS')],
  ['cardiocard-angle bundled layout', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json') && html.includes("'cardiocard-angle':'assets/ecg-vector-lab/layouts/cardiocard-angle-layout.json'")],
  ['layout readout grid', html.includes('layout-coord-grid') && html.includes('function fillCoordGrid')],
  ['layout 7 apply script', fs.existsSync('C:/Users/steve/MeWorld/game/scripts/apply-ecg-angle-layout7.mjs')],
  ['layout 8 apply script', fs.existsSync('C:/Users/steve/MeWorld/game/scripts/apply-ecg-angle-layout8.mjs')],
  ['bundled layout 9 desktop', bundled.bodyPlateId === 'cardiocard-angle-16x9' && bundled.electrodes?.RA?.x > 100 && bundled.scope?.x > 170 && bundled.heartScale < 1],
  ['heart anatomy controls', html.includes('data-ctl-section="heartAnatomy"') && html.includes('id="heartRotR"') && html.includes('heartRotation')],
  ['heart size independent scope', html.includes('function clampHeartScale') && html.includes('clampHeartRotation')],
  ['3d measured leadDeg payload', html.includes('leadDeg:leadDegSnap') && html.includes('HEART_BODY:HEART_BODY')],
  ['3d scope measured axes', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('_syncMeasuredScopeAxes')],
  ['flow conduction disclaimers', html.includes('id="acc-flow"') && html.includes('id="acc-conduction"')],
  ['angle plate delta readout', html.includes('cardiocard-angle') && html.includes('Δ')],
  ['cardiocard anchor defaults', html.includes('CARDIOCARD_NORM') && html.includes('precordial:JSON.parse') && bundled.precordial && bundled.precordial.V1],
  ['ptbxl asset file', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-ptbxl-00001-limb-leads.json')],
  ['measured lead model', html.includes('function computeLeadModel') && html.includes('LEAD_MODEL') && html.includes('leadRingPt(name')],
  ['flow teardrop neg to pos', html.includes('function drawLeadFlowTeardrop') && html.includes('rgba(62,207,142')],
  ['flow path from einthoven layers', html.includes('leadFlowPath:function(on)') && html.includes('S.showTri=true') && html.includes('einthovenBodyEdge(L.n)') && html.includes('function leadFlowPoles')],
  ['flow hud hint', html.includes('id="hudFlowHint"') && html.includes('enterPhase2View')],
  ['flow taper controls', html.includes('data-ctl-section="leadFlowTune"') && html.includes('flowTailPct') && html.includes('initFlowControls')],
  ['global layout export', html.includes('dockLeftOpen') && html.includes('restoreDockFromLayout') && html.includes('global snapshot') && html.includes('id="exportLayoutBtn"') && html.includes('header-layout')],
  ['pause on controls or placement edit', html.includes('pausePlaybackForEdit') && html.includes("tab==='controls'") && html.includes('if(mode)pausePlaybackForEdit')],
  ['comet streaming controls', html.includes('cometTailPct') && html.includes('drawCometStreamingTrail') && html.includes('cometTune')],
  ['body plate 16x9 catalog', html.includes('cardiocard-angle-16x9') && html.includes('bodyAspect:16/9')],
  ['dock push layout', html.includes('dock-left-open') && html.includes('notifyDockLayoutChange') && html.includes('.dock-panel--left.open{width:')],
  ['controls accordion sections', html.includes('initCtlSections') && html.includes('ctl-accordions') && html.includes('data-ctl-section="leadPolarity"')],
  ['guide accordion scoped', html.includes('#axisAccordions .axis-trigger')],
  ['study mode conduction split', html.includes('data-study-mode="conduction"') && html.includes('id="conductionSplit"') && html.includes('ecg-conduction-model.js')],
  ['strip row chart pick', html.includes('pickLeadFromChart(vis[idx].n)')],
  ['hud show all chip', html.includes('hud-show-all') && html.includes('showAllLeads()')],
  ['lead keys 1-6 isolate', html.includes("LEAD_KEYS={Digit1:'I'")],
  ['conduction paths module', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/conduction-paths-data.js')],
  ['isolate filters body badges', html.includes('visibleLeadsList().forEach(function(L)') && html.includes('groups[ek].push')],
  ['shift ctrl badge spread wheel', html.includes('e.shiftKey&&(e.ctrlKey||e.metaKey)') && html.includes('S.badgeSpread')],
  ['cathode lights on current', html.includes('function polarityBadgeStyle') && html.includes("pole:'cathode'") && html.includes('cathodeSite:true')],
  ['click isolate default on', html.includes('clickToIsolate:true') && html.includes('pickLeadFromChart')],
  ['escape exits isolate', html.includes('function exitIsolateMode') && html.includes('function handleEscapeKey')],
  ['tabler icons module', fs.existsSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-lab-icons.js') && html.includes('ecg-lab-icons.js') && html.includes('EcgIcons.initDom')],
  ['lab roadmap guide', html.includes('acc-roadmap') && html.includes('lab-roadmap') && html.includes('Phase 2')],
  ['v1-v6 placement guide', html.includes('acc-v-leads') && html.includes('v-lead-guide') && html.includes('Mid-clavicular line')],
  ['3d electrode drag wiring', html.includes('function moveLeadInBodySpace') && html.includes('setElectrodeDrag')],
  ['3d drag orbit during placement', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('_updateControlsEnabled') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('worldPtToBody')],
  ['3d perpendicular planes', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('horizontalRing') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('rotation.x = Math.PI / 2')],
  ['3d ref color convention blue frontal red horizontal', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('FRONTAL = 0x3b82f6') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('HORIZONTAL = 0xef4444')],
  ['3d v fan from hc', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('_syncHorizontalGuide') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('vFanGroup') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('bodyPtToWorld(p.x, p.y, k, bw)')],
  ['live projection construction', html.includes('function drawLiveProjectionConstruction') && html.includes('_projBridgeFoot')],
  ['vectorscope loop trails p qrs t', html.includes('drawVectorscopeLoopTrails') && html.includes('_loopTrail')],
  ['tri ring translation anim', html.includes('triggerTriRingTranslation') && html.includes('drawTriRingTranslationAnim')],
  ['plate norm anchors', html.includes('function applyPlateNormAnchors') && html.includes('plateNormToBodyPt') && html.includes('linkAnchorsToPlate')],
  ['dynamic body pt clamp', html.includes('function clampBodyPt') && html.includes('Math.min(w-m,p.x)')],
  ['avr invert callout', html.includes("S.focusLead==='aVR'") && html.includes('normally inverted')],
  ['3d plane hud labels', html.includes('scene3dPlaneLabels') && html.includes('syncScene3dPlaneLabels')],
  ['3d lighting controls', html.includes('data-ctl-section="scene3dLight"') && html.includes('SCENE3D_LIGHT_STORAGE') && html.includes('applyScene3dLightFromState')],
  ['3d lighting module', fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('DEFAULT_SCENE3D_LIGHT') && fs.readFileSync('C:/Users/steve/MeWorld/game/assets/ecg-vector-lab/ecg-scene-3d.js','utf8').includes('applyLighting')],
  ['triangle labels hidden when scope', html.includes('if(!S.showScope){') && html.includes('registerStudyLeadHit(e.n,lp.x,lp.y')],
  ['hc link default off no toggle', html.includes('hcLinkedToTriangle:false') && !html.includes('hcLinkTriangleBtn')],
  ['parallel offset bracket', html.includes('function drawParallelOffsetBracket') && html.includes('einthovenElectrodeLineLabel')],
  ['isolated einthoven axis hud', html.includes('Same direction as the ') && html.includes("heart\\'s electrical center (HC).")],
  ['textbook ring canonical angles', html.includes("S.scopeRingMode==='measured'?leadDeg(name):(CANONICAL_LEAD_DEG[name]")],
  ['einthoven ray measured always', html.includes('Einthoven ray always measured')],
  ['single color drawLeadTrace helper', html.includes('function drawLeadTrace') && html.includes('Single-color clinical trace')],
  ['clinical strip loop break', html.includes('function stripTraceLoopBreak') && html.includes('function stripTraceStepPx')],
  ['real ecg no leadGain', html.includes('return{val:mv*realEcgScale(),w:null,gain:1}')],
  ['polarity strip trace on lead column', html.includes('drawPolarityLeadTrace(lctx,LPAD_S')],
  ['strip polarity badge removed', !/drawPolarityBadgeCtx\(wctx/.test(html)],
  ['delta time frame loop', html.includes('_lastFrameTs') && html.includes('delta*S.speed*60')],
  ['einthoven pill tooltip', html.includes('Einthoven triangle — body electrode lines')],
  ['comet pill tooltip', html.includes('Vectorscope comet trail — streaming tail')],
  ['smear layer pill + buffer', html.includes('drawSmearLayer') && html.includes('_smearCanvas') && html.includes('data-layer="smear"')],
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
