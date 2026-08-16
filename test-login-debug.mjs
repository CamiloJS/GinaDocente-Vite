import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGE ERROR]:`, err.toString());
  });

  console.log('Navigating to https://gina-docente-qq2s.vercel.app/ ...');
  await page.goto('https://gina-docente-qq2s.vercel.app/', { waitUntil: 'networkidle2' });

  // Click on "Soy docente"
  console.log('Clicking on Soy docente...');
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('Soy docente')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // Fill in credentials
  console.log('Filling in credentials...');
  await page.type('input[name="username"]', '@GinaDocente');
  await page.type('input[name="password"]', '123456');

  // Click submit
  console.log('Submitting login form...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  await new Promise(r => setTimeout(r, 4000));

  const ebError = await page.evaluate(() => window.__ebError || 'No ErrorBoundary error recorded');
  console.log('WINDOW __ebError:', ebError);

  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT SAMPLE:\n', pageText.slice(0, 300));

  await browser.close();
})();
