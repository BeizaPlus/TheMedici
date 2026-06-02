/**
 * Static checks for crash-prone patterns (use-before-define, broken component exports).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(full);
  }
  return out;
}

function checkUseBeforeDefine(file, text) {
  const issues = [];
  const useMemoBlocks = [...text.matchAll(/const\s+(\w+)\s*=\s*useMemo\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*)\]/g)];
  for (const [, name, , deps] of useMemoBlocks) {
    const depNames = deps.split(',').map((d) => d.trim().split('.')[0]).filter(Boolean);
    for (const dep of depNames) {
      const depDecl = new RegExp(`const\\s+${dep}\\s*=`);
      const memoDecl = text.indexOf(`const ${name} = useMemo`);
      const depIndex = text.search(depDecl);
      if (depIndex >= 0 && depIndex > memoDecl) {
        issues.push(`${name} useMemo depends on ${dep} declared later (line ~${text.slice(0, memoDecl).split('\n').length})`);
      }
    }
  }
  return issues;
}

function checkDefaultExport(file, text) {
  if (!file.endsWith('.jsx')) return [];
  if (file.includes(`${path.sep}sceneToolbar${path.sep}`)) return [];
  if (!file.includes(`${path.sep}components${path.sep}`)) return [];
  if (text.includes('export default')) return [];
  return ['Component missing export default'];
}

function checkTruncatedFunction(file, text) {
  const issues = [];
  if (/function\s+\w+\(\)\s*\{[\s\S]*return\s+<[^>]+>[\s\S]*\}\s*\n\s*export default/.test(text) === false) {
    // Heuristic: orphaned JSX return without function header near export
    const exportIdx = text.indexOf('export default function');
    if (exportIdx > 0) {
      const before = text.slice(Math.max(0, exportIdx - 400), exportIdx);
      if (/return\s*\(\s*<div className="conversation-entry/.test(before) && !/function MessageEntry/.test(before)) {
        issues.push('Possible truncated helper component before export default');
      }
    }
  }
  return issues;
}

const files = walk(srcDir);
let failed = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const issues = [
    ...checkUseBeforeDefine(file, text),
    ...checkDefaultExport(file, text),
    ...checkTruncatedFunction(file, text),
  ];
  if (issues.length) {
    failed += issues.length;
    console.log(`FAIL ${rel}`);
    for (const issue of issues) issues.length && console.log(`  - ${issue}`);
  }
}

if (failed) {
  console.error(`\nStatic audit failed: ${failed} issue(s)`);
  process.exit(1);
}
console.log(`Static audit passed (${files.length} files).`);
