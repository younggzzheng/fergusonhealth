const { test, expect } = require('@playwright/test');
const { waitForRenderedPage } = require('./render-ready');

test('public deployed revision renders all five languages without login', async ({ page, context, baseURL, isMobile }) => {
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
  const originalPadding = await page.locator('html').evaluate(el => getComputedStyle(el).scrollPaddingTop);
  await expect(page.locator('meta[name="build-revision"]')).toHaveAttribute('content', process.env.EXPECTED_REVISION);
  await expect(page.locator('base')).toHaveCount(0);
  await expect(page.locator('#hero-title')).toBeVisible();
  const englishBrandFamily = await page.locator('#hero-title').evaluate(element => getComputedStyle(element).fontFamily);
  expect(englishBrandFamily).toMatch(/^Cormorant,/);
  const englishTitle = await page.locator('.hero-life').innerText();
  const calendar = page.locator('.appointment-calendar');
  await expect(calendar).not.toHaveAttribute('open');
  await expect(page.locator('.hero-actions .link-circle')).toHaveCount(1);
  await expect(page.locator('.hero-actions .link-circle')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.hero-actions .link-circle')).toHaveCSS('border-color', 'rgb(225, 137, 0)');
  await expect(page.locator('.hero-actions .link-circle svg')).toHaveCSS('transform', 'none');
  await expect(page.locator('.event-type')).toHaveCSS('border-color', 'rgb(225, 137, 0)');
  await expect(page.locator('.external-link-circle')).toHaveCount(2);
  for (const circle of await page.locator('.external-link-circle').all()) {
    await expect(circle).toHaveCSS('border-color', 'rgb(225, 137, 0)');
    await expect(circle).toHaveCSS('border-radius', '50%');
    await expect(circle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(circle.locator('use')).toHaveAttribute('href', '#arrow-up');
  }
  await expect(calendar.locator('.calendar-disclosure-icon svg')).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
  await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('border-color', 'rgb(225, 137, 0)');
  await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('border-radius', '50%');
  await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.effort-item')).toHaveCount(3);
  await expect(page.locator('.effort-item[open]')).toHaveCount(0);
  for (const language of ['en', 'zh-CN', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${language === 'zh-CN' ? 'zh' : language}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await waitForRenderedPage(page);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `${language} horizontal overflow`).toBeLessThanOrEqual(1);
    await expect(page.locator('#hero-title')).toHaveText('Ferguson Women’s Health');
    await expect(page.locator('#hero-title')).toHaveCSS('font-family', englishBrandFamily);
    await expect(page.locator('#hero-title span')).toHaveCSS('font-family', englishBrandFamily);
    await expect(page.locator('.hero-team-heading .brand-mark')).toBeVisible();
    await expect(page.locator('.hero-team-heading .brand-mark')).toHaveCSS('background-image', /\/assets\/ferguson-logo\.png/);
    await expect(page.locator('.hero-team-heading .brand-mark')).toHaveText('');
    await expect(page.locator('.section-label-mark')).toHaveCount(4);
    const logoSize = await page.locator('.team-flower').evaluate(el => [getComputedStyle(el).width, getComputedStyle(el).height]);
    for (const label of await page.locator('.section-label').all()) {
      await expect(label.locator('.section-label-mark')).toHaveCSS('width', logoSize[0]);
      await expect(label.locator('.section-label-mark')).toHaveCSS('height', logoSize[1]);
      await expect(label.locator('[data-i18n]')).not.toHaveText(/^0[1-4]\s*\//);
    }
    expect(await page.locator('#about').evaluate(section => Math.abs(section.querySelector('.about-section-label').getBoundingClientRect().left - section.querySelector('.about-grid').getBoundingClientRect().left))).toBeLessThanOrEqual(1);
    if (language === 'zh-CN') await expect(page.locator('#care-title')).toHaveCSS('font-family', /Songti SC/);
    await expect(page.locator('.wecare-shop-label')).toHaveText({ en: 'Shop', 'zh-CN': '微店', fr: 'Boutique', de: 'Shop', es: 'Tienda' }[language]);
    const brandSizes = await page.locator('#hero-title').evaluate(element => [getComputedStyle(element).fontSize, getComputedStyle(element.querySelector('span')).fontSize]);
    expect(brandSizes[0]).toBe(brandSizes[1]);
    await expect(page.locator('.practice-description, [data-i18n="heroEyebrow"]')).toHaveCount(0);
    const heroOrder = await page.locator('.hero-copy').evaluate(element => [...element.children].map(child => child.id || child.className));
    expect(heroOrder).toEqual(['hero-actions', 'hero-title', 'hero-life']);
    const headingSizes = await page.locator('.hero-life, #care-title').evaluateAll(elements => elements.map(element => getComputedStyle(element).fontSize));
    expect(headingSizes[0]).toBe(headingSizes[1]);
    await expect(page.locator('[data-i18n="heroCalendarCta"]')).toHaveText({ en: 'Booking', 'zh-CN': '预约', fr: 'Prendre rendez-vous', de: 'Termin buchen', es: 'Pedir cita' }[language]);
    await expect(page.locator('.hero-actions [data-calendar-link]')).toHaveAttribute('href', '#appointment-calendar');
    await expect(page.locator('.hero-life')).toHaveCSS('color', 'rgb(97, 113, 143)');
    await expect(page.locator('.hero-life em')).toHaveCSS('color', 'rgb(97, 113, 143)');
    await expect(page.locator('.hero-life br')).toHaveCSS('display', 'none');
    await expect(page.locator('.hero-life em')).toHaveCSS('white-space', 'nowrap');
    await expect(page.locator('.locations-overview')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    await expect(calendar).toHaveCSS('background-color', 'rgb(248, 247, 243)');
    await expect(page.locator('#work')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    const cityBeforeAddress = await page.locator('.practice-details').evaluateAll(cards => cards.map(card => Boolean(card.querySelector('.practice-city').compareDocumentPosition(card.querySelector('address')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    expect(cityBeforeAddress).toEqual([language === 'zh-CN', language === 'zh-CN']);
    if (language === 'zh-CN') {
      await expect(page.locator('[data-i18n-html="clinic1Address"]')).toHaveText('华山路800号丁香公寓6号裙楼3层');
    }
    if (language === 'en') {
      await expect(calendar.locator('[data-i18n="calendarTitle"]')).toHaveText('Appointment calendar for Dr. Ferguson');
      await expect(page.locator('.hero-life')).toHaveText('- for every chapter of your life.');
    }
    if (language !== 'en') expect(await page.locator('.hero-life').innerText()).not.toBe(englishTitle);
    const images = page.locator('img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await page.locator('[data-language-switch]').scrollIntoViewIfNeeded();
  }
  for (const id of ['care', 'about', 'work', 'locations']) {
    if (isMobile) await page.locator('.menu-toggle').click();
    await page.locator(`${isMobile ? '#mobile-nav' : '.desktop-nav'} a[href="#${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator('html')).toHaveCSS('scroll-padding-top', '0px');
    await expect.poll(() => page.locator(`#${id}`).evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  }
  await page.locator('.hero-actions [data-calendar-link]').click();
  await expect(page.locator('html')).toHaveCSS('scroll-padding-top', originalPadding);
  await expect(calendar).toHaveAttribute('open', '');
  await expect(calendar.locator('.calendar-disclosure-icon svg')).toHaveCSS('transform', 'matrix(0, -1, 1, 0, 0, 0)');
  const effort = page.locator('.effort-item').first();
  await effort.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(effort.locator('p')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(effort).not.toHaveAttribute('open');
  expect(failures).toEqual([]);
  expect((await context.cookies()).some(cookie => cookie.name === 'fwh_preview')).toBe(false);
});
