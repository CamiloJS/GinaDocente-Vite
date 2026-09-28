import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const EXEC = 'C:/Users/Equipo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://localhost:4173';
const results = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
};

const server = null;
await sleep(1000);

let browser;
try {
  browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  const title = await page.title();
  check('App carga (title)', /English/i.test(title), title);

  // Caso 1: abrir perfil de usuario A -> el link debe actualizarse a profile/A
  await page.evaluate(() => { window.location.hash = 'profile/usuarioA'; });
  await sleep(800);
  let hash = await page.evaluate(() => window.location.hash);
  check('Abrir perfil A actualiza link', hash === '#profile/usuarioA', hash);

  // Caso 2: navegacion rapida A -> B (click seguido), el link final debe ser B
  await page.evaluate(() => { window.location.hash = 'profile/usuarioB'; });
  await sleep(800);
  hash = await page.evaluate(() => window.location.hash);
  check('Navegacion rapida queda en B (sin pelea)', hash === '#profile/usuarioB', hash);

  // Caso 3: BUG ORIGINAL - volver a hash desnudo #profile debe limpiar el perfil,
  // NO reescribir el link al perfil anterior
  await page.evaluate(() => { window.location.hash = 'profile'; });
  await sleep(800);
  hash = await page.evaluate(() => window.location.hash);
  const isLoop = hash.startsWith('#profile/usuarioB') || hash.startsWith('#profile/usuarioA');
  check('Hash desnudo #profile no se reescribe al perfil viejo (loop bug)', !isLoop, hash);
  const stored = await page.evaluate(() => sessionStorage.getItem('englishTech_viewingProfileId'));
  check('sessionStorage limpiado en #profile', stored === null, String(stored));

  // Caso 4: reabrir perfil B y volver al chat -> limpiar -> reabrir #profile
  await page.evaluate(() => { window.location.hash = 'profile/usuarioB'; });
  await sleep(800);
  await page.evaluate(() => { window.location.hash = 'chat'; });
  await sleep(800);
  await page.evaluate(() => { window.location.hash = 'profile'; });
  await sleep(800);
  hash = await page.evaluate(() => window.location.hash);
  check('Perfil no queda pegado tras salir a chat', hash === '#profile' || hash === '', hash);

  // Caso 5: formato legacy profile?id= se normaliza
  await page.evaluate(() => { window.location.hash = 'profile?id=legacyUser'; });
  await sleep(800);
  hash = await page.evaluate(() => window.location.hash);
  check('Legacy profile?id= se normaliza a profile/legacyUser', hash === '#profile/legacyUser', hash);

  check('Sin errores JS en consola', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  check('Ejecucion de prueba', false, e.message);
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}

const failed = results.filter(r => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} pruebas pasaron ===`);
process.exit(failed.length ? 1 : 0);
