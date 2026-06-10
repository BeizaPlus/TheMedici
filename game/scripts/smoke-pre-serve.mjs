/**
 * Static smoke — must pass before dev servers start (no API/Vite required).
 * Wired into npm predev.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditComponentCss } from './audit-component-css.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

let fail = 0;

function ok(cond, name, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fail += 1;
}

console.log('=== Smoke pre-serve (static) ===\n');

const cssIssues = auditComponentCss(root);
ok(cssIssues.length === 0, 'css-audit', cssIssues[0] || 'ok');

console.log('\n--- Vite build (JS compile / white-screen guard) ---');
const build = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: root,
  stdio: 'inherit',
});
ok(build.status === 0, 'vite build', build.status ? `exit ${build.status}` : 'ok');

console.log('\n--- Summary ---');
if (fail) {
  console.log(`\n❌ ${fail} pre-serve check(s) failed — dev will not start.\n`);
  process.exit(1);
}
console.log('\n✅ Pre-serve smoke passed.\n');
