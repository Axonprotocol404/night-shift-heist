const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/agentuser/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith('http://localhost:8080')) requests.push(r.url()); });
  for (const [shot, file] of [['start','1-start.png'],['play','2-play.png'],['end','3-end.png']]) {
    await page.goto('http://localhost:8080/?shot=' + shot + '&seed=1');
    await page.waitForFunction('window.__shotReady === true', { timeout: 15000 });
    await page.screenshot({ path: '/home/agentuser/heist-game/screenshots/' + file });
    console.log('shot', shot, 'ready');
  }
  console.log('errors:', JSON.stringify(errors));
  console.log('external requests:', JSON.stringify(requests));
  await browser.close();
})();
