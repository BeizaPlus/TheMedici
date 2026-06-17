/** Shared blank-screen detectors for Playwright smoke (white crash vs black React error). */

export async function isMostlyWhite(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const body = document.body;
    const bg = getComputedStyle(root || body).backgroundColor;
    const text = (root?.innerText || body.innerText || '').trim();
    const hasFeature =
      document.querySelector('.diff-practice') ||
      document.querySelector('.welcome-screen') ||
      document.querySelector('.welcome-nav') ||
      document.querySelector('.briefing') ||
      document.querySelector('.game-scene');
    if (hasFeature) return false;
    const whiteish = bg === 'rgb(255, 255, 255)' || bg === 'rgba(0, 0, 0, 0)';
    return whiteish && text.length < 40;
  });
}

export async function isMostlyBlack(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const text = (root?.innerText || document.body.innerText || '').trim();
    const hasFeature =
      document.querySelector('.diff-practice') ||
      document.querySelector('.welcome-screen') ||
      document.querySelector('.welcome-nav') ||
      document.querySelector('.welcome-panel') ||
      document.querySelector('.briefing') ||
      document.querySelector('.game-scene') ||
      document.querySelector('main.briefing');
    if (hasFeature) return false;
    const bg = getComputedStyle(root || document.body).backgroundColor;
    const dark =
      bg === 'rgb(0, 0, 0)' ||
      bg === 'rgba(0, 0, 0, 0)' ||
      bg === 'rgb(12, 12, 16)';
    return dark && text.length < 40;
  });
}

export async function assertRenderable(page, ok, label) {
  const white = await isMostlyWhite(page);
  const black = await isMostlyBlack(page);
  ok(!white, `${label}: not white blank screen`);
  ok(!black, `${label}: not black crash screen`);
}
