/**
 * Guards against unstyled white screens: feature CSS must be wired and index.css must stay valid.
 * Run: node scripts/audit-component-css.mjs
 * Also invoked from scripts/smoke-test.mjs (predev).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Feature screens with dedicated styles — extend when adding new full-page modes. */
const FEATURE_STYLE_CONTRACTS = [
  {
    id: 'differential-practice',
    css: 'src/styles/differential-practice.css',
    markers: ['.diff-practice {', '.diff-practice-loading {'],
    mustImportIn: ['src/main.jsx', 'src/components/DifferentialPractice.jsx'],
    mustNotLiveInIndex: ['.diff-practice {', '.diff-practice-loading {'],
    routeComponent: 'src/components/DifferentialPractice.jsx',
    routeHost: 'src/components/Home.jsx',
  },
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function checkIndexCssIntegrity(text) {
  const issues = [];
  const lines = text.split('\n');
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`index.css: brace mismatch ({ ${openBraces} vs } ${closeBraces})`);
  }

  const lastLine = lines[lines.length - 1]?.trim() || '';
  if (/^[a-z-]+:\s/.test(lastLine)) {
    issues.push(`index.css: file ends with orphan property — ${lastLine.slice(0, 50)}`);
  }

  // Truncation signature: closing brace then bare properties with no new selector (2026-06-07 white-page bug)
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1].trim();
    const cur = lines[i].trim();
    if (
      prev === '}' &&
      /^[a-z-]+:\s/.test(cur) &&
      !cur.includes('{') &&
      !cur.startsWith('@')
    ) {
      issues.push(`index.css:${i + 1} truncated block — property after lone }: ${cur.slice(0, 50)}`);
      break;
    }
  }

  return issues;
}

function checkLazyRouteWithoutCss(hostText, componentBasename) {
  const lazyPat = new RegExp(
    `lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(['"].*${componentBasename}['"]\\)`,
  );
  return lazyPat.test(hostText)
    ? [`${componentBasename} is lazy-loaded from Home — use eager import so CSS is always in the main bundle`]
    : [];
}

export function auditComponentCss(gameRoot = root) {
  const issues = [];
  const indexPath = path.join(gameRoot, 'src/index.css');

  if (exists('src/index.css')) {
    const indexCss = fs.readFileSync(indexPath, 'utf8');
    issues.push(...checkIndexCssIntegrity(indexCss));
  } else {
    issues.push('src/index.css missing');
  }

  for (const contract of FEATURE_STYLE_CONTRACTS) {
    const cssPath = path.join(gameRoot, contract.css);
    if (!fs.existsSync(cssPath)) {
      issues.push(`${contract.id}: missing ${contract.css}`);
      continue;
    }

    const cssText = fs.readFileSync(cssPath, 'utf8');
    for (const marker of contract.markers) {
      if (!cssText.includes(marker)) {
        issues.push(`${contract.id}: ${contract.css} missing marker ${marker}`);
      }
    }

    const cssBasename = path.basename(contract.css);
    let importHits = 0;
    for (const rel of contract.mustImportIn) {
      if (!exists(rel)) {
        issues.push(`${contract.id}: missing required file ${rel}`);
        continue;
      }
      if (read(rel).includes(cssBasename)) importHits += 1;
    }
    if (importHits === 0) {
      issues.push(
        `${contract.id}: ${contract.css} must be imported in ${contract.mustImportIn.join(' or ')}`,
      );
    }

    if (exists('src/index.css')) {
      const indexCss = read('src/index.css');
      for (const banned of contract.mustNotLiveInIndex) {
        if (indexCss.includes(banned)) {
          issues.push(
            `${contract.id}: duplicate ${banned} still in index.css — keep styles only in ${contract.css}`,
          );
        }
      }
    }

    if (contract.routeHost && contract.routeComponent && exists(contract.routeHost)) {
      const host = read(contract.routeHost);
      const base = path.basename(contract.routeComponent);
      issues.push(...checkLazyRouteWithoutCss(host, base));
    }
  }

  return issues;
}

function main() {
  const issues = auditComponentCss(root);
  if (issues.length) {
    console.error('Component CSS audit failed:');
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
    return false;
  }
  console.log('Component CSS audit passed.');
  return true;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export default main;
