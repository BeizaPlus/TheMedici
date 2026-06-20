/**
 * Delete all artifacts for Steve-banned case portrait IDs.
 *   node scripts/purge-banned-case-portraits.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANNED_CASE_PORTRAIT_SLUGS,
  bannedPortraitArtifactNames,
} from '../server/bannedCasePortraits.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const portraitDir = path.join(root, '.case-portraits');

async function main() {
  let removed = 0;
  for (const slug of BANNED_CASE_PORTRAIT_SLUGS) {
    const caseId = /^U/i.test(slug) ? slug : slug.padStart(3, '0');
    for (const name of bannedPortraitArtifactNames(caseId)) {
      const p = path.join(portraitDir, name);
      try {
        await fs.unlink(p);
        console.log(`removed ${name}`);
        removed += 1;
      } catch (e) {
        if (e.code !== 'ENOENT') console.warn(`skip ${name}: ${e.message}`);
      }
    }
  }
  console.log(`\nDone — ${removed} file(s) removed from .case-portraits/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
