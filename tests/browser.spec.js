const { test, expect } = require('@playwright/test');
const { waitForRenderedPage } = require('./render-ready');

const password = 'ci-preview-password';

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort('blockedbyclient'));
});

async function authenticate(page) {
  const response = await page.request.post('/__preview_auth', { headers: { 'X-Preview-Password': password } });
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe('ok');
}

async function brokenImages(page) {
  return page.locator('img').evaluateAll(images => images
    .filter(image => !image.complete || image.naturalWidth === 0)
    .map(image => image.getAttribute('src')));
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(dimensions.content, `Horizontal overflow at ${dimensions.width}px`).toBeLessThanOrEqual(dimensions.width + 1);
}

async function assertLinks(page) {
  const issues = await page.locator('a[href], use[href]').evaluateAll(elements => {
    const issues = [];
    for (const element of elements) {
      const href = element.getAttribute('href');
      const url = new URL(href, location.href);
      if (!href || !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
        issues.push(`Invalid link: ${href}`);
      } else if (url.origin === location.origin && url.hash && !document.getElementById(decodeURIComponent(url.hash.slice(1)))) {
        issues.push(`Missing anchor: ${href}`);
      } else if (url.origin !== location.origin && ['http:', 'https:'].includes(url.protocol)) {
        if (url.protocol !== 'https:') issues.push(`Insecure external link: ${href}`);
        if (element.getAttribute('target') === '_blank' && !element.rel.split(/\s+/).includes('noopener')) {
          issues.push(`Missing noopener: ${href}`);
        }
      }
      if (['mailto:', 'tel:'].includes(url.protocol) && !url.pathname.trim()) issues.push(`Empty contact link: ${href}`);
      const target = element.getAttribute('target');
      if (target && !['_blank', '_self', '_parent', '_top'].includes(target)) issues.push(`Unexpected link target: ${target}`);
    }
    return issues;
  });
  expect(issues).toEqual([]);

  const localPaths = await page.locator('a[href]').evaluateAll(elements => [...new Set(elements
    .map(element => new URL(element.href))
    .filter(url => url.origin === location.origin && url.pathname !== location.pathname)
    .map(url => url.pathname + url.search))]);
  for (const path of localPaths) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), `Internal link ${path}`).toBe(200);
  }
}

test('password gate protects content and assets, and logout removes access', async ({ page }) => {
  expect((await page.request.get('/preview.html')).status()).toBe(200);
  for (const path of ['/', '/index.html', '/release.json', '/releases/0123456789abcdef0123456789abcdef01234567/site.js']) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(302);
    expect(response.headers().location).toBe('/preview.html');
  }
  for (const headers of [{}, { 'X-Preview-Password': 'wrong-password' }]) {
    expect((await page.request.post('/__preview_auth', { headers })).status()).toBe(401);
  }
  expect((await page.request.get('/', { headers: { Cookie: 'fwh_preview=forged-cookie' }, maxRedirects: 0 })).status()).toBe(302);
  expect((await page.request.get('/__preview_auth')).status()).toBe(405);
  expect((await page.request.get('/__preview_logout')).status()).toBe(405);
  await authenticate(page);
  const cookie = (await page.context().cookies()).find(cookie => cookie.name === 'fwh_preview');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });
  expect((await page.request.get('/')).status()).toBe(200);
  expect((await page.request.get('/release.json')).status()).toBe(200);
  await page.goto('/');
  expect(await page.evaluate(() => document.cookie)).not.toContain('fwh_preview');
  await page.locator('.lock-form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/preview\.html$/);
  expect((await page.context().cookies()).some(cookie => cookie.name === 'fwh_preview')).toBe(false);
  expect((await page.request.get('/', { maxRedirects: 0 })).status()).toBe(302);
  await page.goto('/');
  await expect(page.locator('#login-form')).toBeVisible();
});

test('preview form supports language, password visibility, invalid and valid login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/preview\.html$/);
  const input = page.locator('#password');
  await expect(input).toHaveAttribute('type', 'password');
  await page.locator('[aria-controls="password"]').click();
  await expect(input).toHaveAttribute('type', 'text');
  await page.locator('[aria-controls="password"]').click();
  await expect(input).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await assertNoOverflow(page);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await assertNoOverflow(page);
  await input.fill('wrong-password');
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator('#login-error')).not.toBeEmpty();
  await expect(input).toBeFocused();
  await input.fill(password);
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.locator('#hero-title')).toBeVisible();
});

test('both languages render without broken resources, broken links or overflow', async ({ page }) => {
  await authenticate(page);
  const failures = [];
  page.on('pageerror', error => failures.push(`Script error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`Console: ${message.text()}`); });
  page.on('requestfailed', request => failures.push(`Request failed: ${request.url()}: ${request.failure().errorText}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('base')).toHaveCount(0);
  await expect(page.locator('meta[name="build-revision"]')).toHaveAttribute('content', '0123456789abcdef0123456789abcdef01234567');
  const title = await page.locator('#hero-title').innerText();
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('[data-language-switch]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(await page.locator('#hero-title').innerText()).not.toContain('undefined');
    await assertNoOverflow(page);
    await assertLinks(page);
    const translated = await page.locator('[data-i18n], [data-i18n-html]').allTextContents();
    expect(translated.every(text => text.trim() && !text.includes('undefined'))).toBe(true);
    if (language === 'zh-CN') expect(await page.locator('#hero-title').innerText()).not.toBe(title);

    // Scroll every image into view to exercise lazy loading, including contact QR images.
    const images = page.locator('img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(element => element.complete)).toBe(true);
      await expect(image).toHaveAttribute('alt', /\S/);
    }
    expect(await brokenImages(page)).toEqual([]);
    await page.locator('[data-language-switch]').scrollIntoViewIfNeeded();
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#hero-title')).toHaveText(title, { useInnerText: true });
  await expect(page.locator('.lock-form')).toHaveAttribute('action', '/__preview_logout');
  expect(failures).toEqual([]);
});

test('official-account QR keeps its white margin inside the matching blue frame', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  const qr = page.locator('.wechat-contact .qr-frame img');
  await qr.scrollIntoViewIfNeeded();
  await expect(qr).toHaveCSS('border-top-color', 'rgb(12, 64, 143)');
  await expect(qr).toHaveCSS('border-top-style', 'solid');
  await expect(qr).toHaveCSS('box-sizing', 'content-box');
  await expect.poll(() => qr.evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight })))
    .toEqual({ width: 600, height: 600 });
  await assertNoOverflow(page);
});

test('navigation reaches contact and mobile menu closes on selection and Escape', async ({ page, isMobile }) => {
  await authenticate(page);
  await page.goto('/');
  if (isMobile) {
    const menu = page.locator('button[aria-controls="mobile-nav"]');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await assertNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await menu.click();
    await page.locator('#mobile-nav a[href="#contact"]').click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-nav')).toBeHidden();
  } else {
    await page.locator('header a[href="#contact"]:visible').click();
  }
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('footer a[href="#main"]').click();
  await expect(page).toHaveURL(/#main$/);
  await expect(page.locator('#hero-title')).toBeInViewport();
});

test('image checks detect a failed portrait even when its fallback hides the image', async ({ page }) => {
  await authenticate(page);
  await page.route('**/assets/dr-ferguson.jpg', route => route.fulfill({ status: 404, body: 'missing image' }));
  await page.goto('/');
  const failures = await brokenImages(page);
  expect(failures.some(source => source.endsWith('/dr-ferguson.jpg'))).toBe(true);
});

test('live layout readiness waits for a delayed stylesheet before checking mobile overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Reproduces the mobile deployment check.');
  await authenticate(page);
  let releaseStylesheet;
  let stylesheetRequested;
  const released = new Promise(resolve => { releaseStylesheet = resolve; });
  const requested = new Promise(resolve => { stylesheetRequested = resolve; });
  await page.route('**/styles.css', async route => {
    stylesheetRequested();
    await released;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    await requested;
    await expect(page.locator('#hero-title')).toBeVisible();
    const before = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        stylesheetLoaded: !!document.querySelector('link[rel="stylesheet"]').sheet,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(before.stylesheetLoaded).toBe(false);
    expect(before.overflow).toBeGreaterThan(1);

    let ready = false;
    const rendered = waitForRenderedPage(page).then(() => { ready = true; });
    await page.evaluate(() => document.readyState);
    expect(ready, 'Layout readiness must not finish while the stylesheet is pending').toBe(false);
    releaseStylesheet();
    await rendered;
    await assertNoOverflow(page);
    await page.locator('[data-language-switch]').click();
    await waitForRenderedPage(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await assertNoOverflow(page);
  } finally {
    releaseStylesheet();
  }
});
