const { test, expect } = require('@playwright/test');
const { waitForRenderedPage } = require('./render-ready');

test('public deployed revision renders all four languages without login', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  const failures = [];
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort('blockedbyclient'));
  page.on('pageerror', error => failures.push(`Script error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`Console: ${message.text()}`); });
  page.on('requestfailed', request => failures.push(`Request failed: ${new URL(request.url()).pathname}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
  await page.goto('/');
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.locator('#login-form, .lock-form')).toHaveCount(0);
  await waitForRenderedPage(page);
  await expect(page.locator('meta[name="build-revision"]')).toHaveAttribute('content', process.env.EXPECTED_REVISION);
  await expect(page.locator('base')).toHaveCount(0);
  await expect(page.locator('#hero-title')).toBeVisible();
  const englishTitle = await page.locator('#hero-title').innerText();
  for (const language of ['en', 'zh-CN', 'fr', 'de']) {
    await page.locator(`[data-language="${language === 'zh-CN' ? 'zh' : language}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await waitForRenderedPage(page);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `${language} horizontal overflow`).toBeLessThanOrEqual(1);
    if (language !== 'en') expect(await page.locator('#hero-title').innerText()).not.toBe(englishTitle);
    const images = page.locator('img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await page.locator('[data-language-switch]').scrollIntoViewIfNeeded();
  }
  expect(failures).toEqual([]);
  expect((await context.cookies()).some(cookie => cookie.name === 'fwh_preview')).toBe(false);
});
