/**
 * Link & integration smoke test — API screenshots, Vite app, case coverage.
 * Run while dev server is up: node scripts/smoke-links.mjs
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const API = process.env.API_BASE || "http://127.0.0.1:3001";
const WEB = process.env.WEB_BASE || "http://localhost:5173";
const SHOTS_DIR = path.join(root, "ccs_screenshots");

function ok(cond, name, detail = "") {
  const mark = cond ? "✅" : "❌";
  console.log(`${mark} ${name}${detail ? " — " + detail : ""}`);
  return cond;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function screenshotFileFor(caseNum, files) {
  const pattern = new RegExp(`^case_0*${caseNum}_`, "i");
  return files.find((name) => pattern.test(name) && /\.png$/i.test(name)) || null;
}

async function fetchStatus(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) });
    const ct = res.headers.get("content-type") || "";
    return { status: res.status, ok: res.ok, ct, res };
  } catch (e) {
    return { status: 0, ok: false, error: String(e.message || e) };
  }
}

async function main() {
  let failed = false;
  const catalog = readJson("src/data/ccsCatalog.json");
  const prepared = readJson("src/data/preparedCases.json");
  const caseNums = catalog.cases.map((c) => parseInt(c.caseNumber, 10)).filter(Number.isFinite);

  // --- API health ---
  const health = await fetchStatus(`${API}/api/health`).catch(() => null);
  if (!health || health.status === 0) {
    // health may not exist; try screenshot route
    const probe = await fetchStatus(`${API}/api/ccs-screenshot/100`);
    ok(probe.status === 200 || probe.status === 404, "api: reachable", `${API} status=${probe.status}`);
    if (probe.status === 0) {
      ok(false, "api: server running", "Start npm run dev first");
      process.exit(1);
    }
  } else {
    ok(health.ok, "api: health", `status=${health.status}`);
  }

  // --- Vite app ---
  const index = await fetchStatus(WEB);
  ok(index.ok, "web: index loads", `${WEB} status=${index.status}`);
  if (!index.ok) failed = true;

  // --- Screenshot files on disk ---
  const files = fs.existsSync(SHOTS_DIR) ? fs.readdirSync(SHOTS_DIR) : [];
  const pngCaseFiles = files.filter((f) => /^case_\d+_/i.test(f) && /\.png$/i.test(f));
  ok(pngCaseFiles.length >= 100, "screenshots: PNG count", `${pngCaseFiles.length} case PNGs`);

  const withShot = [];
  const noShot = [];
  for (const n of caseNums) {
    if (screenshotFileFor(n, files)) withShot.push(n);
    else noShot.push(n);
  }
  ok(withShot.length >= 100, "screenshots: catalog coverage", `${withShot.length}/${caseNums.length} have PNG`);
  if (noShot.length) {
    console.log(`   ⚠ missing PNG for cases: ${noShot.slice(0, 15).join(", ")}${noShot.length > 15 ? ` … +${noShot.length - 15} more` : ""}`);
  }

  // --- HTTP screenshot API (sample + key cases) ---
  const sample = [1, 58, 100, 150, 181].filter((n) => caseNums.includes(n));
  let apiOk = 0;
  let api404 = 0;
  for (const n of sample) {
    const r = await fetchStatus(`${API}/api/ccs-screenshot/${n}`);
    if (r.ok && r.ct.includes("image")) apiOk += 1;
    else if (r.status === 404) api404 += 1;
    else failed = true;
  }
  ok(apiOk >= 3, "api: screenshot routes return PNG", `${apiOk}/${sample.length} OK, ${api404} missing`);

  // All cases with files — spot-check 20 random
  const randomWith = withShot.sort(() => Math.random() - 0.5).slice(0, 20);
  let randOk = 0;
  for (const n of randomWith) {
    const r = await fetchStatus(`${API}/api/ccs-screenshot/${n}`);
    if (r.ok) randOk += 1;
  }
  ok(randOk === randomWith.length, "api: random screenshot sample", `${randOk}/${randomWith.length}`);

  // --- Prepared case keys ---
  const prepKeys = Object.keys(prepared.cases || {});
  ok(prepKeys.length === caseNums.length, "data: preparedCases keys", `${prepKeys.length}`);

  // --- Pick side-by-side test cases (screenshot + orders + varied categories) ---
  const { loadCaseBank } = await import(
    url.pathToFileURL(path.join(root, "scripts/caseBankLoader.mjs")).href
  );
  const bank = loadCaseBank();

  const scored = caseNums
    .filter((n) => withShot.includes(n))
    .map((n) => {
      const b = bank.get(n);
      const key = String(n).padStart(3, "0");
      const prep = prepared.cases?.[key];
      const orders = b?.correct_orders?.length || 0;
      const decoys = b?.should_avoid?.length || 0;
      const hpiLen = String(b?.hpi || prep?.hpi || "").length;
      const hasVoice = Boolean(b?.patient_voice?.chief_complaint);
      const category = b?.ccs_category || prep?.category || catalog.cases.find((c) => c.caseNumber === String(n))?.category;
      return { n, orders, decoys, hpiLen, hasVoice, category, diagnosis: b?.diagnosis || prep?.diagnosis };
    })
    .filter((x) => x.orders >= 5);

  const byCat = new Map();
  for (const x of scored) {
    const cat = x.category || "Other";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(x);
  }

  const picks = [];
  // Case 58 — user benchmark (croup)
  if (scored.find((x) => x.n === 58)) picks.push(scored.find((x) => x.n === 58));
  // One strong case per major category
  for (const [, list] of byCat) {
    list.sort((a, b) => b.orders + b.decoys - (a.orders + a.decoys));
    const best = list[0];
    if (best && !picks.some((p) => p.n === best.n)) picks.push(best);
    if (picks.length >= 6) break;
  }

  console.log("\n--- Recommended side-by-side test cases ---");
  console.log("(Open game → pick case → click \"CCS screenshot ↗\" to compare with PNG)\n");
  for (const p of picks.slice(0, 6)) {
    const shotUrl = `${API}/api/ccs-screenshot/${p.n}`;
    console.log(`  Case ${p.n}: ${p.diagnosis || "—"} (${p.category})`);
    console.log(`    Game: ${WEB}  → search/select case ${p.n}`);
    console.log(`    PNG:  ${shotUrl}`);
    console.log(`    Orders: ${p.orders} correct, ${p.decoys} decoys\n`);
  }

  console.log("--- Smoke links complete ---");
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
