/**
 * Browser runtime audit — catches white-screen module/render errors on key routes.
 */
import { chromium } from 'playwright';

const BASE = process.env.PLAY_URL || 'http://127.0.0.1:5175';

async function auditRoute(page, path, label) {
  const errors = [];
  const onErr = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  const onPageErr = (e) => errors.push(`pageerror: ${e.message}`);
  page.on('console', onErr);
  page.on('pageerror', onPageErr);

  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => ({
    htmlLen: document.querySelector('#root')?.innerHTML?.length || 0,
    hasWelcome: !!document.querySelector('.welcome-shell'),
    hasBriefing: !!document.querySelector('.briefing'),
    hasGame: !!document.querySelector('.game'),
    hasComplete: !!document.querySelector('.complete-screen, .complete-wrap'),
  }));

  page.off('console', onErr);
  page.off('pageerror', onPageErr);

  const ok = info.htmlLen > 100 && errors.length === 0;
  return { label, path, ok, info, errors };
}

async function auditModules(page) {
  return page.evaluate(async () => {
    const paths = [
      '/src/components/GlobalUiSettingsPanel.jsx',
      '/src/components/Play.jsx',
      '/src/components/CaseNotesPanel.jsx',
      '/src/components/CaseContextPanel.jsx',
      '/src/lib/playUiFavorite.js',
      '/src/lib/playSessionTimeline.js',
      '/src/lib/orderTimeline.js',
    ];
    const out = [];
    for (const p of paths) {
      try {
        const m = await import(p);
        out.push({ path: p, ok: true, hasDefault: m.default != null });
      } catch (e) {
        out.push({ path: p, ok: false, error: e.message });
      }
    }
    return out;
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const results = [];

  results.push(await auditRoute(page, '/', 'home'));
  results.push(await auditRoute(page, '/?case=126', 'case126-briefing-or-play'));

  await page.goto(`${BASE}/?case=126`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const begin = page.getByRole('button', { name: /Begin case/i });
  if (await begin.count()) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await begin.click();
    await page.waitForTimeout(4000);
    const playInfo = await page.evaluate(() => ({
      hasGame: !!document.querySelector('.game'),
      hasScene: !!document.querySelector('.game-scene'),
      htmlLen: document.querySelector('#root')?.innerHTML?.length || 0,
    }));
    results.push({
      label: 'play-after-begin',
      path: 'interactive',
      ok: playInfo.hasGame && playInfo.htmlLen > 1000 && errors.length === 0,
      info: playInfo,
      errors,
    });

    // Leave play (autosave runs), then seed timeline into checkpoint before resume.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const resumeSeed = await page.evaluate(() => {
      const key = 'schoonmaker_active_play_checkpoint';
      const raw = localStorage.getItem(key);
      if (!raw) return { seeded: false, reason: 'no checkpoint after begin' };
      let cp;
      try {
        cp = JSON.parse(raw);
      } catch {
        return { seeded: false, reason: 'bad checkpoint json' };
      }
      const startedAt = Date.now() - 120000;
      cp.screen = 'play';
      cp.checkpoint = cp.checkpoint || {};
      cp.checkpoint.sessionStartedAt = startedAt;
      cp.checkpoint.placementOrder = cp.checkpoint.placementOrder?.length
        ? cp.checkpoint.placementOrder
        : ['iv-0'];
      cp.checkpoint.orderTimelineEvents = [
        {
          id: 'audit-order-1',
          at: startedAt + 5000,
          label: 'Audit test order',
          kind: 'order',
          orderIndex: 1,
        },
      ];
      localStorage.setItem(key, JSON.stringify(cp));
      return {
        seeded: true,
        caseId: cp.caseId,
        events: cp.checkpoint.orderTimelineEvents.length,
        storedEvents: JSON.parse(localStorage.getItem(key))?.checkpoint?.orderTimelineEvents?.length ?? 0,
      };
    });

    if (resumeSeed.seeded) {
      const onboarding = page.locator('.welcome-onboarding-slim button, .welcome-entry-modal button').first();
      if (await onboarding.count()) {
        await onboarding.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }
      const resumeErrors = [];
      page.on('pageerror', (e) => resumeErrors.push(e.message));
      const resumeBtn = page.getByRole('button', { name: /Resume/i });
      if (await resumeBtn.count()) {
        await resumeBtn.click();
        await page.waitForTimeout(4500);
        const resumeInfo = await page.evaluate(() => ({
          hasGame: !!document.querySelector('.game'),
          timelineCount: document.querySelector('.patient-order-timeline-count')?.textContent?.trim(),
          timelineItems: document.querySelectorAll('.patient-order-timeline-item').length,
          htmlLen: document.querySelector('#root')?.innerHTML?.length || 0,
        }));
        results.push({
          label: 'resume-timeline-hydrate',
          path: 'resume',
          ok:
            resumeInfo.hasGame &&
            resumeInfo.htmlLen > 1000 &&
            Number(resumeInfo.timelineCount) >= 1 &&
            resumeInfo.timelineItems >= 1 &&
            resumeErrors.length === 0,
          info: { ...resumeInfo, seed: resumeSeed },
          errors: resumeErrors,
        });
      } else {
        results.push({
          label: 'resume-timeline-hydrate',
          path: 'resume',
          ok: false,
          info: { seed: resumeSeed, resumeBanner: false },
          errors: ['Resume button not found on home'],
        });
      }
    }
  }

  const modules = await auditModules(page);
  await browser.close();

  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    if (!r.ok) failed += 1;
    console.log(`${mark} ${r.label}`, JSON.stringify(r.info));
    if (r.errors?.length) r.errors.forEach((e) => console.log(`  error: ${e}`));
  }

  console.log('\nModule imports:');
  for (const m of modules) {
    const mark = m.ok ? 'PASS' : 'FAIL';
    if (!m.ok) failed += 1;
    console.log(
      `${mark} ${m.path}${m.hasDefault === false ? ' (missing default export)' : ''}${m.error ? ` — ${m.error}` : ''}`,
    );
  }

  if (failed) {
    console.error(`\nAudit failed: ${failed} issue(s)`);
    process.exit(1);
  }
  console.log('\nAudit passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
