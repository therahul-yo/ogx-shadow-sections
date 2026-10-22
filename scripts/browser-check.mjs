import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { const content = await readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(content); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const macBrave = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const executablePath = process.env.BROWSER_PATH || (existsSync(macBrave) ? macBrave : undefined);
let browser;
let checks = 0;
const pass = message => { checks++; console.log('PASS:', message); };
try {
  browser = await chromium.launch({ headless: true, executablePath });
  await mkdir(path.join(root, 'demo', 'qa'), { recursive: true });
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failedRequests.push(response.url()); });
    await page.goto(origin + '/demo/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.sl-section img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('.sl-section img')].every(image => image.complete));
    assert.equal(await page.locator('.sl-section').count(), 3); pass(`${width}px: all three Liquid sections rendered`);
    assert(await page.locator('.sl-section img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))); pass(`${width}px: reference imagery loaded`);
    assert(await page.locator('html').evaluate(element => element.scrollWidth <= innerWidth + 1)); pass(`${width}px: no page-level horizontal overflow`);
    assert.equal(await page.locator('.sl-product__add:disabled').count(), 1); pass(`${width}px: sold-out product cannot be added`);
    assert.equal(await page.locator('.sl-comparison__table tbody tr').count(), 9); pass(`${width}px: all comparison rows present`);
    if (width === 390) {
      const next = page.locator('[data-next]');
      assert(await next.isVisible());
      await next.click();
      await page.waitForFunction(() => document.querySelector('[data-track]').scrollLeft > 100);
      pass('390px: carousel next button scrolls to the next customer');
      await page.locator('[data-track]').focus();
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.querySelector('[data-track]').scrollLeft < 5);
      pass('390px: carousel keyboard navigation works');
    }
    if (width === 1440) assert(await page.locator('[data-next]').isHidden());
    await page.locator('.sl-product__add:not(:disabled)').first().click();
    assert(await page.locator('.demo-toast').isVisible()); pass(`${width}px: demo cart action responds without a live purchase`);
    assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []); pass(`${width}px: no browser exceptions or failed assets`);
    await page.locator('.demo-toast').evaluate(element => { element.hidden = true; });
    if (width !== 768) await page.screenshot({ path: path.join(root, 'demo', 'qa', width === 390 ? 'mobile.jpg' : 'desktop.jpg'), fullPage: true, quality: 80 });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 950 }, reducedMotion: 'reduce' });
  await page.goto(origin + '/demo/empty.html');
  assert.equal(await page.locator('.sl-section').count(), 3);
  assert(await page.locator('.sl-product__add').isDisabled());
  assert(await page.locator('html').evaluate(element => element.scrollWidth <= innerWidth + 1));
  pass('Missing images, products, stories, and promo link handled gracefully');
  await page.goto(origin + '/demo/variants.html');
  await page.locator('[data-variant]').selectOption('402');
  assert(await page.locator('[data-add]').isDisabled());
  assert.equal(await page.locator('.sl-product__price').textContent(), 'Rs. 2,499');
  assert(await page.locator('.sl-product__saving').isHidden());
  assert(await page.locator('s[data-compare]').isHidden());
  pass('Selecting a sold-out variant updates availability, price, and discount');
  await page.locator('[data-variant]').selectOption('401');
  assert(await page.locator('[data-add]').isEnabled());
  assert.equal(await page.locator('.sl-product__price').textContent(), 'Rs. 2,099');
  assert(await page.locator('.sl-product__saving').isVisible());
  pass('Selecting an available variant restores its price and add-to-cart action');
  await page.close();
  console.log(`Browser checks passed: ${checks}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
