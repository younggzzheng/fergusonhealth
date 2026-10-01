const { test, expect } = require('@playwright/test');
const { waitForRenderedPage } = require('./render-ready');

test('deployed revision unlocks, renders both languages, and locks again', async ({ page, context, baseURL }) => {
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
  await expect(page).toHaveURL(`${origin}/preview.html`);
  await expect(page.locator('#login-form')).toBeVisible();
  try {
    // Setting the value in-page keeps the password out of locator.fill failure logs.
    await page.locator('#password').evaluate((input, password) => { input.value = password; }, process.env.FWH_PREVIEW_PASSWORD);
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page).toHaveURL(`${origin}/`, { timeout: 20_000 });
  } finally {
    await page.locator('#password').evaluateAll(inputs => inputs.forEach(input => { input.value = ''; }));
  }
  await waitForRenderedPage(page);
  await expect(page.locator('meta[name="build-revision"]')).toHaveAttribute('content', process.env.EXPECTED_REVISION);
  await expect(page.locator('base')).toHaveCount(0);
  await expect(page.locator('#hero-title')).toBeVisible();
  const englishTitle = await page.locator('#hero-title').innerText();
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('[data-language-switch]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await waitForRenderedPage(page);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `${language} horizontal overflow`).toBeLessThanOrEqual(1);
    if (language === 'zh-CN') expect(await page.locator('#hero-title').innerText()).not.toBe(englishTitle);
    const images = page.locator('img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(image => image.complete && image.naturalWidth > 0), { timeout: 10_000 }).toBe(true);
    }
    await page.locator('[data-language-switch]').scrollIntoViewIfNeeded();
  }
  expect(failures).toEqual([]);
  await page.locator('.lock-form button[type="submit"]').click();
  await expect(page).toHaveURL(`${origin}/preview.html`);
  expect((await context.cookies()).some(cookie => cookie.name === 'fwh_preview')).toBe(false);
  await page.goto('/');
  await expect(page).toHaveURL(`${origin}/preview.html`);
  await expect(page.locator('#login-form')).toBeVisible();
  expect(failures).toEqual([]);
});
