/**
 * Batch-generate first attending order-whys via local API → .order-why-cache → playbook ship.
 *
 * Prereq: API running (npm run dev:alt) + DEEPSEEK_API_KEY in master.env
 *
 *   node scripts/preload-first-order-whys.mjs
 *   node scripts/preload-first-order-whys.mjs --from 91 --to 100
 *   node scripts/preload-first-order-whys.mjs --case 153
 *
 * Then ship offline bundle:
 *   npm run build:order-why-playbook
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const API = process.env.PRELOAD_API || 'http://127.0.0.1:3002';
const DELAY_MS = Number(process.env.PRELOAD_DELAY_MS || 400);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { from: null, to: null, caseId: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--from') out.from = Number(args[++i]);
    else if (args[i] === '--to') out.to = Number(args[++i]);
    else if (args[i] === '--case') out.caseId = String(args[++i]).padStart(3, '0');
  }
  return out;
}

async function main() {
  const prepared = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src/data/preparedCases.json'), 'utf8'),
  );
  const cases = prepared?.cases || {};
  const { from, to, caseId: onlyCase } = parseArgs();

  let ids = Object.keys(cases).sort((a, b) => Number(a) - Number(b));
  if (onlyCase) ids = ids.filter((id) => id.padStart(3, '0') === onlyCase);
  else if (from != null || to != null) {
    ids = ids.filter((id) => {
      const n = Number(id);
      if (from != null && n < from) return false;
      if (to != null && n > to) return false;
      return true;
    });
  }

  const health = await fetch(`${API}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`API not reachable at ${API} — start npm run dev:alt first`);
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const rawId of ids) {
    const row = cases[rawId];
    const cid = String(rawId).padStart(3, '0');
    const interventions = row?.interventions || [];
    if (!interventions.length) {
      skip += 1;
      continue;
    }

    for (const iv of interventions) {
      if (!iv.id || !iv.label) continue;
      try {
        const res = await fetch(`${API}/api/order-why`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: cid,
            orderId: iv.id,
            orderLabel: iv.label,
            playbookWhy: iv.why || '',
            caseContext: {
              id: cid,
              ccsNumber: cid,
              title: row.title,
              category: row.category,
              chief_complaint: row.patient_voice?.chief_complaint,
              hpi_narrative: row.hpi_narrative,
              patientSex: row.patientSex,
              portraitNote: row.portraitNote,
            },
            peerReview: false,
            forceRefresh: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn(`  ✗ ${cid}/${iv.id}: ${data.error || res.status}`);
          fail += 1;
        } else {
          console.log(`  ✓ ${cid}/${iv.id} (${data.provider || 'ok'})`);
          ok += 1;
        }
      } catch (e) {
        console.warn(`  ✗ ${cid}/${iv.id}: ${e.message}`);
        fail += 1;
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone — ${ok} generated, ${skip} cases skipped, ${fail} failed`);
  console.log('Run: npm run build:order-why-playbook');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
