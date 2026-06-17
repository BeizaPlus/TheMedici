// Smoke test for Schoonmaker (MeWorld/game)
// Runs in Node (no browser). Validates queue/reorder logic + config sanity.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let failCount = 0;

function ok(cond, name, detail = "") {
  const mark = cond ? "✅" : "❌";
  console.log(`${mark} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failCount += 1;
  return cond;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

// Minimal localStorage polyfill for caseProgress.js
function makeLocalStorage() {
  const m = new Map();
  return {
    getItem(k) {
      return m.has(k) ? m.get(k) : null;
    },
    setItem(k, v) {
      m.set(k, String(v));
    },
    removeItem(k) {
      m.delete(k);
    },
    clear() {
      m.clear();
    },
    _dump() {
      return Object.fromEntries(m.entries());
    },
  };
}

async function main() {
  const { auditComponentCss } = await import("./audit-component-css.mjs");
  const cssIssues = auditComponentCss(root);
  if (cssIssues.length) {
    for (const issue of cssIssues) console.log(`❌ css-audit: ${issue}`);
    process.exitCode = 1;
    return;
  }
  ok(true, "css-audit: feature styles wired", "differential-practice + index.css integrity");

  const { auditSceneElementRegistry } = await import("./audit-scene-element-registry.mjs");
  const sceneIssues = auditSceneElementRegistry();
  if (sceneIssues.length) {
    for (const issue of sceneIssues) console.log(`❌ scene-element-registry: ${issue}`);
    process.exitCode = 1;
    return;
  }
  ok(true, "scene-element-registry", `${readJson("dev/scene-elements/SCENE_ELEMENT_REGISTRY.json").elements.length} elements`);

  const { resolveSceneElement, getApprovedLayerPath } = await import("../src/lib/sceneElementRegistry.js");
  ok(Boolean(resolveSceneElement("o2-mask-hudson-1040")), "scene elements: O2 mask registered");
  ok(Boolean(getApprovedLayerPath("iv-bd-insyte-20g-antecubital")), "scene elements: IV pickHero path");

  const gameCfg = readJson("src/data/gameConfig.json");
  const catalog = readJson("src/data/ccsCatalog.json");
  const playbooks = readJson("src/data/playbooks.json");
  const prepared = readJson("src/data/preparedCases.json");

  const zones = gameCfg.zones;
  const zoneKeys = Object.keys(zones);
  ok(zoneKeys.length >= 5, "config: zones exist", `${zoneKeys.length} zones`);
  ok(
    typeof gameCfg.drag?.overlap !== "undefined",
    "config: drag.overlap set",
    String(gameCfg.drag?.overlap),
  );
  ok(gameCfg.drag?.overlap === "pointer" || typeof gameCfg.drag?.overlap === "number", "config: overlap valid");

  // Zone sanity
  const zoneRangesOk = zoneKeys.every((k) => {
    const z = zones[k];
    return [z.cx, z.cy, z.w, z.h].every((v) => typeof v === "number" && v >= 0 && v <= 1);
  });
  ok(zoneRangesOk, "config: zone fractions 0..1");

  ok(Array.isArray(catalog.cases) && catalog.cases.length > 0, "catalog: cases loaded", `${catalog.cases.length} cases`);
  const uberCatalogCount = catalog.cases.filter(
    (c) => c.isUber || String(c.id).startsWith("U"),
  ).length;
  const catalogStandardCount = catalog.cases.length - uberCatalogCount;
  ok(
    prepared.totalCases === catalogStandardCount,
    "preparedCases: count matches catalog (excludes uber composites)",
    `${prepared.totalCases} vs ${catalogStandardCount} (+${uberCatalogCount} uber)`,
  );
  const parsedVitals = Object.values(prepared.cases || {}).filter((c) => c.vitalsSource === "parsed").length;
  ok(parsedVitals >= 8, "preparedCases: CCS vitals parsed", `${parsedVitals} parsed`);

  const badSpo2 = Object.entries(prepared.cases || {}).filter(([, c]) => {
    const s = c?.vitals?.spo2;
    return typeof s === "number" && (s > 100 || s < 0);
  });
  ok(badSpo2.length === 0, "preparedCases: SpO2 within 0–100%", badSpo2.length ? `${badSpo2.length} invalid` : "all ok");

  const { clampVitals, VITAL_LIMITS } = await import(
    url.pathToFileURL(path.join(root, "src/lib/vitalsLimits.js")).href
  );
  ok(clampVitals({ spo2: 102 }).spo2 === 100, "vitalsLimits: SpO2 capped at 100");
  ok(VITAL_LIMITS.spo2.max === 100, "vitalsLimits: SpO2 max documented", "100%");

  const { formatClinicalText } = await import(
    url.pathToFileURL(path.join(root, "src/lib/clinicalTextFormat.js")).href
  );
  const proseHpi =
    "The patient is a 22-year-old woman with no known past medical history who presents with abdominal pain. She has a family history of diabetes in a sibling.";
  ok(
    !formatClinicalText(proseHpi).includes("\n\n"),
    "clinicalTextFormat: prose HPI phrases stay inline",
    "past/family history",
  );
  ok(
    formatClinicalText("Initial History Past Medical History None.").includes("\n\nPast Medical History"),
    "clinicalTextFormat: CCS section headers still break",
  );

  const { touchCaseVisited, getRecentCaseHistory } = await import(
    url.pathToFileURL(path.join(root, "src/data/caseProgress.js")).href
  );
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = makeLocalStorage();
  try {
    touchCaseVisited("004", "briefing");
    const recent = getRecentCaseHistory({ limit: 5 });
    ok(recent.some((row) => row.caseId === "004"), "caseProgress: touchCaseVisited records history");
  } finally {
    globalThis.localStorage = prevStorage;
  }

  const { hasIvOrderPlaced, portraitCacheNeedsLayers } = await import(
    url.pathToFileURL(path.join(root, "src/lib/portraitLayers.js")).href
  );
  ok(hasIvOrderPlaced({ "intravenous-access": true }), "portraitLayers: IV order detected");
  ok(!hasIvOrderPlaced({}), "portraitLayers: no IV when empty");
  ok(
    portraitCacheNeedsLayers({ exists: true, portraitFrameVersion: 2, layers: null }),
    "portraitLayers: stale when frame/layers missing",
  );

  const { resolveOrderResult } = await import(
    url.pathToFileURL(path.join(root, "src/lib/orderResult.js")).href
  );
  const sleLab = resolveOrderResult(
    { label: "CBC / BMP / UA", why: "Cytopenias, nephritis screen." },
    {
      caseData: {
        id: "094",
        diagnosis: "Systemic Lupus Erythematosus",
        hpi_narrative: "Malar rash, polyarthritis, fever.",
      },
      teachMeMode: false,
    },
  );
  ok(/CBC:/.test(sleLab.text) && /Glucose \d+ mg\/dL/.test(sleLab.text), "orderResult: combined lab panel has numeric values");
  ok(!/See values in chart/i.test(sleLab.text), "orderResult: no chart placeholder for labs");

  const sleComplement = resolveOrderResult(
    { label: "Complement C3/C4", why: "Low = active disease." },
    {
      caseData: {
        id: "094",
        diagnosis: "Systemic Lupus Erythematosus",
        hpi_narrative: "Malar rash, polyarthritis, fever.",
      },
      teachMeMode: false,
    },
  );
  ok(
    /Complement C3 \d+ mg\/dL/.test(sleComplement.text) && /C4 \d+ mg\/dL/.test(sleComplement.text),
    "orderResult: single lab (complement) has numeric C3/C4",
  );
  ok(!/— completed\.$/.test(sleComplement.text.trim()), "orderResult: complement not bare completed stub");

  const { resolveSingleLabResult } = await import(
    url.pathToFileURL(path.join(root, "src/lib/labPanelValues.js")).href
  );
  const ana = resolveSingleLabResult(
    "ANA",
    { diagnosis: "Systemic Lupus Erythematosus", caseId: "094", stackFinding: "Positive — required for diagnosis." },
    false,
  );
  ok(/ANA positive/i.test(ana) && /titer 1:\d+/.test(ana), "labPanelValues: ANA numeric titer for SLE");

  const { stackFindingForOrder } = await import(
    url.pathToFileURL(path.join(root, "server/cleanCaseLoader.js")).href
  );
  const case94Raw = fs.readFileSync(path.join(root, "data/cases/case_94.json"), "utf8");
  const case94 = JSON.parse(case94Raw);
  ok(
    stackFindingForOrder(case94, "Complement C3/C4") === "Low = active disease.",
    "cleanCaseLoader: stack finding for complement",
  );

  const { resolvePlaybook, getCaseSpecificPlaybookIds } = await import(
    url.pathToFileURL(path.join(root, "src/data/resolvePlaybook.js")).href
  );
  const specificIds = getCaseSpecificPlaybookIds();
  ok(specificIds.length >= 20, "case-specific playbooks seeded from study guides", `${specificIds.length} cases`);

  // Validate playbook interventions match what the drag UI expects.
  const bad = { zones: 0, count: 0, guideline: 0, why: 0 };
  for (const c of catalog.cases) {
    const pb = resolvePlaybook(c);
    const ivs = pb?.interventions || [];
    if (ivs.length < 3) bad.count += 1;
    for (const iv of ivs) {
      if (!zoneKeys.includes(iv.correct_zone)) bad.zones += 1;
      if (!iv.guideline || String(iv.guideline).trim().length < 2) bad.guideline += 1;
      if (!iv.why || String(iv.why).trim().length < 5) bad.why += 1;
    }
  }
  ok(bad.count === 0, "catalog: every case has at least 3 interventions", `bad.count=${bad.count}`);
  ok(bad.zones === 0, "catalog: correct_zone always valid zone key", `bad.zones=${bad.zones}`);
  ok(bad.guideline === 0, "catalog: guideline present", `bad.guideline=${bad.guideline}`);

  // Queue/reorder logic via caseProgress.js
  globalThis.localStorage = makeLocalStorage();
  const progress = await import(url.pathToFileURL(path.join(root, "src/data/caseProgress.js")).href);

  const ids = catalog.cases.slice(0, 20).map((c) => c.id);
  ok(ids.length >= 10, "queue: have ids pool", `${ids.length}`);

  // startShuffleQueue should create a permuted queue and return first id
  const first = progress.startShuffleQueue(ids);
  const p1 = progress.readProgress();
  ok(p1.queue.length === ids.length, "shuffle: queue length matches");
  ok(Boolean(first) && p1.queue[0] === first, "shuffle: start returns first id");
  ok(p1.lastMode === "shuffle", "shuffle: lastMode set");

  // nextInQueue should advance and wrap
  const seen = new Set([first]);
  for (let i = 0; i < ids.length + 2; i++) {
    const n = progress.nextInQueue();
    seen.add(n);
  }
  ok(seen.size >= Math.min(ids.length, 6), "shuffle: nextInQueue advances");

  // pickRandomId should pick from set
  const r = progress.pickRandomId(ids);
  ok(ids.includes(r), "random: pickRandomId returns member");

  // recordCaseComplete should mark completed at >= completionThreshold
  const threshold = gameCfg.branding?.completionThreshold ?? 99;
  progress.clearProgress();
  progress.recordCaseComplete(ids[0], { accuracy: threshold - 1, attempts: 10, seconds: 30 });
  const recLow = progress.getCaseRecord(ids[0]);
  ok(recLow && recLow.completed === false, `progress: <${threshold} not completed`);
  progress.recordCaseComplete(ids[0], { accuracy: threshold, attempts: 5, seconds: 20 });
  const recHi = progress.getCaseRecord(ids[0]);
  ok(recHi && recHi.completed === true, `progress: >=${threshold} completed`);
  ok(recHi.bestAccuracy >= threshold, "progress: bestAccuracy updated");

  console.log("\nSmoke test complete.");

  // --- Case bank vs preparedCases (random sample) ---
  const { loadCaseBank } = await import(
    url.pathToFileURL(path.join(root, "scripts/caseBankLoader.mjs")).href
  );
  const bank = loadCaseBank();
  ok(bank.size >= 100, "case bank: loaded scraped cases", `${bank.size} entries`);

  const catalogIds = catalog.cases.map((c) => Number(c.caseNumber));
  const sampleSize = Math.min(12, catalogIds.length);
  const shuffled = [...catalogIds].sort(() => Math.random() - 0.5).slice(0, sampleSize);
  let matchOk = 0;
  let matchFail = 0;
  const failSamples = [];

  for (const caseNum of shuffled) {
    const key = String(caseNum).padStart(3, "0");
    const prep = prepared.cases?.[key];
    const bankCase = bank.get(caseNum);
    if (!prep || !bankCase?.correct_orders?.length) {
      matchFail += 1;
      failSamples.push({ caseNum, reason: "missing prep or bank orders" });
      continue;
    }
    const prepLabels = new Set((prep.interventions || []).map((iv) => iv.label.toLowerCase()));
    const bankLabels = bankCase.correct_orders
      .map((o) => String(typeof o === "string" ? o : o?.order || o?.label || "").toLowerCase())
      .filter(Boolean);
    const overlap = bankLabels.filter((l) => prepLabels.has(l)).length;
    const ratio = overlap / Math.max(bankLabels.length, 1);
    if (ratio >= 0.8) {
      matchOk += 1;
    } else {
      matchFail += 1;
      failSamples.push({
        caseNum,
        topic: bankCase.topic,
        diagnosis: bankCase.diagnosis,
        overlap,
        bankTotal: bankLabels.length,
        prepTotal: prepLabels.size,
      });
    }
  }

  ok(
    matchOk >= Math.floor(sampleSize * 0.85),
    "case bank: random sample matches prepared treatments",
    `${matchOk}/${sampleSize} matched` + (failSamples.length ? ` fails=${JSON.stringify(failSamples.slice(0, 3))}` : ""),
  );

  // --- Per-order why text must not all be identical (case_summary copy bug) ---
  function countUniqueWhys(interventions = [], decoys = []) {
    const whys = [...interventions, ...decoys].map((iv) => String(iv?.why || "").trim()).filter(Boolean);
    return new Set(whys).size;
  }

  const case100 = prepared.cases?.["100"];
  const c100Iv = case100?.interventions || [];
  const c100Unique = countUniqueWhys(c100Iv, case100?.decoys || []);
  ok(
    c100Iv.length >= 3 && c100Unique >= Math.min(3, c100Iv.length),
    "preparedCases: case 100 has distinct why per stack",
    `${c100Unique} unique / ${c100Iv.length} stacks`,
  );
  if (c100Iv.length >= 2) {
    const heart = c100Iv.find((iv) => /heart|cardiovascular/i.test(iv.label));
    const abdomen = c100Iv.find((iv) => /abdomen/i.test(iv.label));
    ok(
      !heart || !abdomen || heart.why !== abdomen.why,
      "preparedCases: case 100 heart vs abdomen why differ",
      heart?.why?.slice(0, 60) + " | " + abdomen?.why?.slice(0, 60),
    );
  }

  let dupCaseCount = 0;
  let checkedCases = 0;
  for (const [id, prep] of Object.entries(prepared.cases || {})) {
    const ivs = prep?.interventions || [];
    if (ivs.length < 3) continue;
    checkedCases += 1;
    const unique = countUniqueWhys(ivs, prep?.decoys || []);
    if (unique < 2) dupCaseCount += 1;
  }
  ok(
    dupCaseCount <= Math.max(2, Math.floor(checkedCases * 0.05)),
    "preparedCases: most cases have varied why text",
    `${dupCaseCount} all-same-why / ${checkedCases} checked`,
  );

  const { zoneForExtraOrder, extraOrderPinId } = await import("../src/lib/extraOrderPlacement.js");
  const { stackDropZoneForIv, isTorsoDropZone } = await import("../src/lib/torsoDropZone.js");
  ok(
    zoneForExtraOrder("medications", "Normal saline maintenance") === "zone-custom-1",
    "extra orders: default torso drop (abdomen)",
  );
  ok(
    extraOrderPinId("Normal saline maintenance") === "extra-order-normal-saline-maintenance",
    "extra orders: stable pin id",
  );
  ok(isTorsoDropZone("zone-custom-1"), "torso drop zones include abdomen");
  ok(stackDropZoneForIv(null, 1) === "zone-custom-3", "torso drop alternates to chest");

  const { looksLikeTutorQuestion } = await import("../src/lib/chatIntentRouting.js");
  ok(looksLikeTutorQuestion("what does malar rash mean"), "chat intent: tutor question");
  ok(looksLikeTutorQuestion("Order Complement C3/C4 to assess lupus"), "chat intent: order rationale");
  ok(
    looksLikeTutorQuestion(
      "For systemic lupus you order CBC for cytopenia and complement C3 C4 because of nephritis",
    ),
    "chat intent: SLE think-aloud monologue",
  );
  ok(!looksLikeTutorQuestion("how long have you had the rash"), "chat intent: patient interview");

  if (failCount) {
    console.log(`\n❌ ${failCount} smoke check(s) failed — dev will not start.\n`);
    process.exitCode = 1;
    return;
  }
}

main().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exitCode = 1;
});

