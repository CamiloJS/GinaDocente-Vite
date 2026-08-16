import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR]:`, err.toString());
  });

  await page.goto('https://gina-docente-qq2s.vercel.app/', { waitUntil: 'networkidle2' });

  // Let's get userMappings from the page state or window
  const userMaps = await page.evaluate(async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(window.__ebError || 'No error yet');
      }, 3000);
    });
  });

  console.log('Result:', userMaps);

  await browser.close();
})();
