/**
 * Bake DeepSeek attending explainers per case → .case-explainers-cache/case_N.json
 *
 * Usage:
 *   node scripts/bake-case-explainers.mjs              # all cases
 *   node scripts/bake-case-explainers.mjs --case 44    # one case
 *   node scripts/bake-case-explainers.mjs --limit 10   # first N cases
 *   node scripts/bake-case-explainers.mjs --dx-only    # skip order whys
 *
 * Requires DEEPSEEK_API_KEY in MeWorld/.env
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import differentialBank from '../src/data/differentialBank.json' with { type: 'json' };
import differentialReview from '../src/data/differentialReview.json' with { type: 'json' };
import catalog from '../src/data/ccsCatalog.json' with { type: 'json' };
import preparedCases from '../src/data/preparedCases.json' with { type: 'json' };
import { buildOrderWhyPrompt } from '../server/orderWhy.js';
import {
  buildDifferentialExplainPrompt,
  parseExplainJson,
} from '../server/differentialExplainPrompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, '.case-explainers-cache');

dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(REPO_ROOT, '.env'), override: true });

const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
const MODEL = process.env.DEEPSEEK_API_KEY
  ? process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat'
  : process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const ENDPOINT = process.env.DEEPSEEK_API_KEY
  ? 'https://api.deepseek.com/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { caseId: null, limit: null, dxOnly: false, skipExisting: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--case' && args[i + 1]) out.caseId = Number(args[++i]);
    else if (args[i] === '--limit' && args[i + 1]) out.limit = Number(args[++i]);
    else if (args[i] === '--dx-only') out.dxOnly = true;
    else if (args[i] === '--force') out.skipExisting = false;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function explainerKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);
}

function uniqueDiagnoses(list = []) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const d = String(raw || '').trim();
    if (!d || d.length < 3) continue;
    if (/^the differential for/i.test(d)) continue;
    const key = d.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

function reviewForCase(caseId) {
  const key = String(caseId);
  return differentialReview.cases?.[key] || null;
}

function preparedForCase(caseId) {
  const num = String(caseId);
  const padded = num.padStart(3, '0');
  return (
    preparedCases.cases?.[num] ||
    preparedCases.cases?.[padded] ||
    null
  );
}

function catalogForCase(caseId) {
  const num = String(caseId).padStart(3, '0');
  return catalog.cases?.find((c) => c.id === num || c.caseNumber === Number(caseId)) || null;
}

async function loadPlaybookInterventions(caseId) {
  try {
    const { resolvePlaybookForCase } = await import(
      pathToFileURL(path.join(ROOT, 'src/data/resolvePlaybook.js')).href
    );
    const cat = catalogForCase(caseId);
    if (!cat) return [];
    const pb = resolvePlaybookForCase(cat);
    return pb?.interventions || [];
  } catch {
    return [];
  }
}

function buildCaseContext(caseId, bankEntry, review, prepared) {
  const cat = catalogForCase(caseId);
  return {
    title: bankEntry?.title || cat?.title || '',
    chief_complaint: bankEntry?.topic || cat?.title || '',
    diagnosis: bankEntry?.diagnosis || review?.diagnosis || '',
    category: cat?.category || '',
    clinical_hpi_narrative: prepared?.patient_voice?.history || prepared?.history || review?.history || '',
    historyText: prepared?.patient_voice?.history || prepared?.history || review?.history || '',
    hpiExcerpt: (prepared?.patient_voice?.history || prepared?.history || review?.history || '').slice(0, 900),
    vitalsText: prepared?.vitals ? JSON.stringify(prepared.vitals).slice(0, 400) : '',
    caseSummary: review?.caseSummary || '',
  };
}

async function callChat(messages, { maxTokens = 560, temperature = 0.7 } = {}) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, messages }),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => `HTTP ${r.status}`);
    throw new Error(err.slice(0, 300));
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function loadCache(caseId) {
  const file = path.join(CACHE_DIR, `case_${caseId}.json`);
  if (!fs.existsSync(file)) {
    return { caseId: Number(caseId), orders: {}, diagnoses: {}, updatedAt: null };
  }
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return { caseId: Number(caseId), orders: {}, diagnoses: {}, updatedAt: null };
  }
}

async function saveCache(caseId, doc) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  doc.updatedAt = new Date().toISOString();
  const file = path.join(CACHE_DIR, `case_${caseId}.json`);
  await fsp.writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

async function bakeCase(caseId, { dxOnly, skipExisting }) {
  const bankEntry = differentialBank.find((e) => Number(e.caseId) === Number(caseId));
  if (!bankEntry) {
    console.warn(`  skip case ${caseId} — not in differential bank`);
    return { orders: 0, diagnoses: 0 };
  }

  const review = reviewForCase(caseId);
  const prepared = preparedForCase(caseId);
  const ctx = buildCaseContext(caseId, bankEntry, review, prepared);
  const doc = await loadCache(caseId);
  let orderBaked = 0;
  let dxBaked = 0;

  if (!dxOnly) {
    const interventions = await loadPlaybookInterventions(caseId);
    for (const iv of interventions) {
      const id = String(iv.id || '').trim();
      if (!id) continue;
      if (skipExisting && doc.orders[id]?.why) continue;
      const messages = buildOrderWhyPrompt({
        orderLabel: iv.label,
        playbookWhy: iv.why || '',
        caseContext: ctx,
      });
      try {
        const why = await callChat(messages);
        doc.orders[id] = {
          why,
          orderLabel: iv.label,
          source: 'deepseek',
          bakedAt: new Date().toISOString(),
        };
        orderBaked += 1;
        process.stdout.write(`  order ${id} ✓\n`);
        await sleep(250);
      } catch (e) {
        console.warn(`  order ${id} FAIL:`, e.message);
      }
    }
  }

  const dxList = uniqueDiagnoses(bankEntry.diagnoses || []);
  for (const dx of dxList) {
    const key = explainerKey(dx);
    if (skipExisting && doc.diagnoses[key]?.hook) continue;
    const messages = buildDifferentialExplainPrompt({
      diagnosis: dx,
      topic: bankEntry.topic,
      caseDiagnosis: bankEntry.diagnosis,
      caseSummary: review?.caseSummary || '',
      hpiExcerpt: ctx.hpiExcerpt,
    });
    try {
      const raw = await callChat(messages, { maxTokens: 700, temperature: 0.7 });
      const parsed = parseExplainJson(raw);
      doc.diagnoses[key] = {
        ...parsed,
        diagnosis: dx,
        source: 'deepseek',
        bakedAt: new Date().toISOString(),
      };
      dxBaked += 1;
      process.stdout.write(`  dx ${dx.slice(0, 40)} ✓\n`);
      await sleep(250);
    } catch (e) {
      console.warn(`  dx ${dx.slice(0, 30)} FAIL:`, e.message);
    }
  }

  await saveCache(caseId, doc);
  return { orders: orderBaked, diagnoses: dxBaked };
}

async function main() {
  const opts = parseArgs();
  if (!API_KEY) {
    console.error('Set DEEPSEEK_API_KEY in MeWorld/.env');
    process.exit(1);
  }

  let cases = differentialBank.map((e) => e.caseId);
  if (opts.caseId) cases = cases.filter((id) => Number(id) === Number(opts.caseId));
  if (opts.limit) cases = cases.slice(0, opts.limit);

  console.log(`Baking ${cases.length} cases → ${CACHE_DIR}`);
  let totalOrders = 0;
  let totalDx = 0;

  for (const caseId of cases) {
    console.log(`Case ${caseId} (${catalogForCase(caseId)?.title || '?'})`);
    const { orders, diagnoses } = await bakeCase(caseId, opts);
    totalOrders += orders;
    totalDx += diagnoses;
  }

  console.log(`Done. ${totalOrders} orders + ${totalDx} diagnoses baked this run.`);
  console.log('Run: npm run export:case-explainers-baked');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
