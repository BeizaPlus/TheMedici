/**
 * Runtime import guard — every catalog case must load through toGameCase without throw.
 * Catches missing imports (e.g. enrichUberGameCase) before they white-screen the app.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/ccsCatalog.json'), 'utf8'));
  const { getCaseById } = await import(
    url.pathToFileURL(path.join(root, 'src/data/useCcsCatalog.js')).href
  );

  let loaded = 0;
  const errors = [];

  for (const c of catalog.cases || []) {
    try {
      const gameCase = getCaseById(c.id);
      if (!gameCase?.id) {
        errors.push({ id: c.id, error: 'null game case' });
        continue;
      }
      if ((c.isUber || String(c.id).startsWith('U')) && !gameCase.uberMeta) {
        errors.push({ id: c.id, error: 'uber case missing uberMeta' });
        continue;
      }
      loaded += 1;
    } catch (e) {
      errors.push({ id: c.id, error: String(e.message || e) });
    }
  }

  ok(errors.length === 0, 'gameCase: all catalog ids load', `${loaded}/${catalog.cases?.length || 0}`);
  if (errors.length) {
    for (const row of errors.slice(0, 8)) {
      console.log(`   ❌ case ${row.id}: ${row.error}`);
    }
    if (errors.length > 8) console.log(`   … +${errors.length - 8} more`);
  }

  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
