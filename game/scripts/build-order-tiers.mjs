#!/usr/bin/env node
/**
 * Optional: LLM-assign intervention tiers (critical / general / misc) into caseBareEssentials.json.
 * Uses DeepSeek when DEEPSEEK_API_KEY is set. Run from game/:
 *   node scripts/build-order-tiers.mjs
 *   node scripts/build-order-tiers.mjs --case 109
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(GAME_ROOT, '..');

dotenv.config({ path: path.join(GAME_ROOT, '.env') });
dotenv.config({ path: path.join(REPO_ROOT, '.env'), override: true });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const apiKey = DEEPSEEK_API_KEY || OPENAI_API_KEY;
const model = DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';
const endpoint = DEEPSEEK_API_KEY
  ? 'https://api.deepseek.com/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

const caseFilter = process.argv.includes('--case')
  ? String(process.argv[process.argv.indexOf('--case') + 1] || '').padStart(3, '0')
  : null;

async function callChat(messages) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1200 }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJsonBlock(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in model response');
  return JSON.parse(m[0]);
}

async function main() {
  if (!apiKey) {
    console.error('Set DEEPSEEK_API_KEY or OPENAI_API_KEY in MeWorld/.env');
    process.exit(1);
  }

  const preparedPath = path.join(GAME_ROOT, 'src/data/preparedCases.json');
  const essentialsPath = path.join(GAME_ROOT, 'src/data/caseBareEssentials.json');
  const prepared = JSON.parse(await fs.readFile(preparedPath, 'utf8'));
  const essentials = JSON.parse(await fs.readFile(essentialsPath, 'utf8'));
  essentials.cases = essentials.cases || {};

  const ids = caseFilter ? [caseFilter] : Object.keys(prepared.cases || prepared);
  let updated = 0;

  for (const rawId of ids) {
    const id = String(rawId).padStart(3, '0');
    const row = prepared.cases?.[id] || prepared[id];
    if (!row?.interventions?.length) continue;

    const orders = row.interventions.map((iv, i) => `${i + 1}. ${iv.label} (id: ${iv.id})`).join('\n');
    const prompt = `Case ${id}: ${row.title} — ${row.diagnosis || 'unknown diagnosis'}

Classify each order into exactly one tier:
- critical: unsafe if missed in first hour
- general: standard workup/management
- misc: prevention, counseling, non-emergent extras

Orders:
${orders}

Return JSON only:
{"critical":["intervention-id",...],"misc":["intervention-id",...]}
(omit general — everything not listed is general)`;

    const content = await callChat([
      { role: 'system', content: 'You are a clinical educator. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
    const tiers = parseJsonBlock(content);
    const items = (tiers.critical || []).map((iid) => {
      const iv = row.interventions.find((x) => x.id === iid);
      return iv
        ? { matchInterventionIds: [iid], shortLabel: iv.label.slice(0, 48), matchLabels: [iv.label] }
        : null;
    }).filter(Boolean);

    essentials.cases[id] = {
      ...(essentials.cases[id] || {}),
      title: `Must-do — ${row.title}`,
      items,
      miscInterventionIds: tiers.misc || [],
    };
    updated += 1;
    console.log(`✓ case ${id} — critical: ${items.length}, misc: ${(tiers.misc || []).length}`);
  }

  await fs.writeFile(essentialsPath, `${JSON.stringify(essentials, null, 2)}\n`, 'utf8');
  console.log(`\nUpdated ${updated} case(s) → ${essentialsPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
