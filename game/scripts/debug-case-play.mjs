import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://127.0.0.1:5173/?case=126', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const before = await page.evaluate(() => ({
  classes: document.querySelector('#root')?.innerHTML?.slice(0, 300),
  hasBriefing: !!document.querySelector('.briefing'),
  hasGame: !!document.querySelector('.game'),
}));

await page.getByRole('button', { name: /Begin case/i }).click();
await page.waitForTimeout(4000);

const after = await page.evaluate(() => {
  const root = document.querySelector('#root');
  return {
    hasBriefing: !!document.querySelector('.briefing'),
    hasGame: !!document.querySelector('.game'),
    hasHome: !!document.querySelector('.welcome-shell, .shell-home'),
    classNames: [...(root?.querySelectorAll('*') || [])]
      .slice(0, 40)
      .map((el) => el.className)
      .filter(Boolean),
    buttons: [...document.querySelectorAll('button')]
      .slice(0, 8)
      .map((b) => b.textContent?.trim().slice(0, 40)),
    htmlLen: root?.innerHTML?.length || 0,
  };
});

console.log(JSON.stringify({ before, after, logs: logs.slice(-15) }, null, 2));
await page.screenshot({ path: 'case126-after-begin.png' });
await browser.close();
