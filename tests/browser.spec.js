const { test, expect } = require('@playwright/test');
const { waitForRenderedPage } = require('./render-ready');

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort('blockedbyclient'));
});

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
      } else if (url.origin === location.origin && url.pathname === location.pathname && url.hash && !document.getElementById(decodeURIComponent(url.hash.slice(1)))) {
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

test('public website and release assets load without a password or cookie', async ({ page, context }) => {
  for (const path of ['/', '/index.html', '/release.json', '/releases/0123456789abcdef0123456789abcdef01234567/site.js']) {
    expect((await page.request.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
  }
  await page.goto('/');
  await expect(page.locator('#hero-title')).toBeVisible();
  await expect(page.locator('#login-form, .lock-form')).toHaveCount(0);
  expect((await context.cookies()).some(cookie => cookie.name === 'fwh_preview')).toBe(false);
  await page.goto('/preview.html');
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.locator('#hero-title')).toBeVisible();
});

test('WeCare uses the supplied shop code and stays separate from appointments', async ({ page }) => {
  await page.goto('/');
  await page.locator('#wecare').scrollIntoViewIfNeeded();
  await waitForRenderedPage(page);
  const sections = await page.locator('main > section[id]').evaluateAll(elements => elements.map(element => element.id));
  expect(sections.indexOf('wecare')).toBe(sections.indexOf('connect') - 1);
  await expect(page.locator('#wecare-title img')).toHaveAttribute('alt', 'WeCare');
  await expect(page.locator('#wecare img')).toHaveCount(2);
  for (const image of await page.locator('#wecare img').all()) {
    await expect(image).toHaveAttribute('src', /\/assets\/wecare-poster\.jpg$/);
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth === 800 && element.naturalHeight === 1009)).toBe(true);
  }
  await expect(page.locator('#wecare a[href]')).toHaveCount(0);
  await expect(page.locator('.desktop-nav a[href="#wecare"], .mobile-nav a[href="#wecare"]')).toHaveCount(0);
  const panel = await page.locator('.wecare-panel').boundingBox();
  const code = await page.locator('.wecare-code-window').boundingBox();
  expect(Math.abs(code.width - code.height)).toBeLessThan(1);
  expect(code.x).toBeGreaterThanOrEqual(panel.x);
  expect(code.x + code.width).toBeLessThanOrEqual(panel.x + panel.width);
  await assertNoOverflow(page);
});

test('WeCare shop descriptor stays beside the original logo in every language and viewport', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const [code, label] of [['en', 'Shop'], ['zh', '微店'], ['fr', 'Boutique'], ['de', 'Shop'], ['es', 'Tienda']]) {
      await page.locator(`[data-language="${code}"]`).click();
      await expect(page.locator('.wecare-shop-label')).toHaveText(label);
      await expect(page.locator('.wecare-tagline, [data-i18n="wecareTagline"]')).toHaveCount(0);
      await expect(page.locator('.wecare-description')).not.toBeEmpty();
      await expect(page.locator('.wecare-shop-label')).toHaveCSS('font-size', width <= 700 ? '16px' : '18px');
      const layout = await page.locator('#wecare-title').evaluate(element => ({
        logo: element.querySelector('.wecare-logo-window').getBoundingClientRect().toJSON(),
        label: element.querySelector('.wecare-shop-label').getBoundingClientRect().toJSON(),
        heading: element.getBoundingClientRect().toJSON(),
      }));
      expect(layout.label.left).toBeGreaterThan(layout.logo.right);
      expect(Math.abs(layout.label.bottom - layout.logo.bottom)).toBeLessThanOrEqual(1);
      expect(layout.label.height).toBeLessThan(layout.logo.height);
      expect(Math.abs(layout.logo.width / layout.logo.height - 468 / 160)).toBeLessThan(.01);
      expect(layout.label.right).toBeLessThanOrEqual(layout.heading.right + 1);
      await expect(page.locator('#wecare-title img')).toHaveAttribute('alt', 'WeCare');
      await expect(page.locator('#wecare img')).toHaveCount(2);
      await assertNoOverflow(page);
    }
  }
});

test('practice name uses one type size and wraps only before the intact Women’s Health phrase', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const layout = await page.locator('#hero-title').evaluate(element => {
      const phrase = element.querySelector('span');
      const nameRange = document.createRange();
      nameRange.setStart(element.firstChild, 0);
      nameRange.setEnd(element.firstChild, element.firstChild.textContent.trimEnd().length);
      return {
        name: nameRange.getBoundingClientRect().toJSON(),
        phrase: phrase.getBoundingClientRect().toJSON(),
        heading: element.getBoundingClientRect().toJSON(),
        size: getComputedStyle(element).fontSize,
        phraseSize: getComputedStyle(phrase).fontSize,
        family: getComputedStyle(element).fontFamily,
        phraseFamily: getComputedStyle(phrase).fontFamily,
        nowrap: getComputedStyle(phrase).whiteSpace,
      };
    });
    expect(layout.phraseSize).toBe(layout.size);
    expect(layout.phraseFamily).toBe(layout.family);
    expect(layout.nowrap).toBe('nowrap');
    expect(layout.phrase.right).toBeLessThanOrEqual(layout.heading.right + 1);
    if (width >= 768) expect(layout.phrase.top).toBeLessThan(layout.name.bottom);
    else expect(layout.phrase.top).toBeGreaterThan(layout.name.top + layout.name.height / 2);
    await assertNoOverflow(page);
  }
});

test('all five languages render without broken resources, broken links or overflow', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(`Script error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`Console: ${message.text()}`); });
  page.on('requestfailed', request => failures.push(`Request failed: ${request.url()}: ${request.failure().errorText}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('base')).toHaveCount(0);
  await expect(page.locator('meta[name="build-revision"]')).toHaveAttribute('content', '0123456789abcdef0123456789abcdef01234567');
  const title = await page.locator('.hero-life').innerText();
  for (const language of ['en', 'zh-CN', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${language === 'zh-CN' ? 'zh' : language}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page).toHaveTitle(language === 'zh-CN' ? 'Ferguson 女性健康' : "Ferguson Women's Health");
    await expect(page.locator('.profile-name')).toHaveCount(1);
    await expect(page.locator('.about-portrait figcaption')).toHaveCount(0);
    await expect(page.locator('.profile-identity > h3, .profile-identity > p')).toHaveCount(3);
    await expect(page.locator('.profile-identity [data-i18n="signatureDetail"]')).toContainText('MD, FACOG');
    await expect(page.locator('.profile-identity .profile-role')).not.toBeEmpty();
    const identityMetaStyles = await page.locator('.profile-identity > p').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { color: style.color, fontSize: style.fontSize, fontFamily: style.fontFamily, fontWeight: style.fontWeight, lineHeight: style.lineHeight };
    }));
    expect(identityMetaStyles).toHaveLength(2);
    expect(identityMetaStyles[1]).toEqual(identityMetaStyles[0]);
    const profileNameColor = await page.locator('.profile-name').evaluate(element => getComputedStyle(element).color);
    expect(identityMetaStyles[0].color).toBe(profileNameColor);
    expect(profileNameColor).toBe('rgb(26, 45, 86)');
    expect(await page.locator('[data-i18n-html="aboutBody"]').evaluate(element => getComputedStyle(element).color)).toBe('rgb(89, 100, 116)');
    const identityLayout = await page.locator('.profile-identity').evaluate(identity => [...identity.children].map(element => {
      const { left, top, bottom } = element.getBoundingClientRect();
      return { left, top, bottom };
    }));
    for (const [index, line] of identityLayout.entries()) {
      expect(Math.abs(line.left - identityLayout[0].left)).toBeLessThan(1);
      if (index) expect(line.top).toBeGreaterThan(identityLayout[index - 1].bottom);
    }
    await expect(page.locator('[data-i18n="careFertilityAssessment"]')).toHaveText({
      en: 'Fertility evaluation and management',
      'zh-CN': '生育力评估与管理',
      fr: 'Évaluation et prise en charge de la fertilité',
      de: 'Fertilitätsdiagnostik und -management',
      es: 'Evaluación y manejo de la fertilidad',
    }[language]);
    expect(await page.locator('#hero-title').innerText()).not.toContain('undefined');
    await assertNoOverflow(page);
    await assertLinks(page);
    const translated = await page.locator('[data-i18n], [data-i18n-html]').allTextContents();
    expect(translated.every(text => text.trim() && !text.includes('undefined'))).toBe(true);
    await expect(page.locator('#hero-title')).toHaveText('Ferguson Women’s Health');
    if (language !== 'en') expect(await page.locator('.hero-life').innerText()).not.toBe(title);

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
  await page.locator('[data-language="zh"]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero-life')).toHaveText(title, { useInnerText: true });
  await expect(page.locator('.lock-form')).toHaveCount(0);
  expect(failures).toEqual([]);
});

test('French, German and Spanish preserve credentials, disclosures, and language across insights', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('[data-language]')).toHaveText(['EN', '中文', 'FR', 'DE', 'ES']);
  const firstService = page.locator('#care .care-item').first();
  await firstService.locator('summary').click();
  for (const [code, name, service, article] of [
    ['fr', 'Français', 'Santé hormonale et ménopause', 'La perte osseuse silencieuse après la ménopause'],
    ['de', 'Deutsch', 'Hormongesundheit und Wechseljahre', 'Stiller Knochenverlust nach den Wechseljahren'],
    ['es', 'Español', 'Salud hormonal y menopausia', 'La pérdida ósea silenciosa después de la menopausia'],
  ]) {
    await page.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('[data-language][aria-pressed="true"]')).toHaveAttribute('data-language', code);
    await expect(firstService).toHaveAttribute('open', '');
    await expect(firstService.locator('h3')).toHaveText(service);
    await expect(page.locator('.profile-details')).not.toHaveAttribute('open');
    await page.locator('.profile-details summary').click();
    const credential = page.locator('[data-i18n-html="aboutBody"]');
    await expect(credential.locator('strong')).toHaveCount(2);
    await expect(credential).toContainText('FACOG');
    await expect(page.locator('[data-i18n-html="profileDegree"] strong')).toHaveText('Doctor of Medicine');
    await expect(page.locator('[data-i18n="profileResidency"]')).toContainText('Rutgers Robert Wood Johnson Medical School');
    await expect(page.locator('[data-i18n="profileTraining"]')).toContainText('New York University');
    await expect(page.locator('[data-i18n="carePMOS"]')).toContainText('PMOS');
    await assertNoOverflow(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('#care .care-item[open]')).toHaveCount(0);
    await page.locator('[data-wechat-category="articles"] summary').click();
    await page.locator('[data-i18n="insightBone"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('#bone-title')).toHaveText(article);
    await expect(page.locator('[data-i18n="series"]')).toContainText({ fr: 'anglais', de: 'Englisch', es: 'inglés' }[code]);
    await expect(page.locator('video')).not.toHaveAttribute('autoplay');
    const copy = await page.locator('[data-i18n]').allTextContents();
    expect(copy.every(text => text.trim() && !text.includes('undefined'))).toBe(true);
    await assertLinks(page);
    await assertNoOverflow(page);
    await page.locator('[data-i18n="back"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await firstService.locator('summary').click();
  }
});

test('five-language selection works when optional preference storage is disabled', async ({ page, context }) => {
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await waitForRenderedPage(page);
  for (const code of ['fr', 'de', 'es', 'zh', 'en']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', code === 'zh' ? 'zh-CN' : code);
    await expect(page.locator('[data-language][aria-pressed="true"]')).toHaveAttribute('data-language', code);
    await assertNoOverflow(page);
  }
});

test('resource categories are translated, keyboard accessible, and keep patient links pending', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const categories = page.locator('.insight-category');
  await expect(categories).toHaveCount(3);
  await expect(page.locator('.insight-category[open]')).toHaveCount(0);
  for (const [code, labels, pending] of [
    ['en', ['Articles', 'Videos', 'Patient feedback'], 'WeChat links coming soon.'],
    ['zh', ['文章', '视频', '患者反馈'], '微信公众号链接即将添加。'],
    ['fr', ['Articles', 'Vidéos', 'Témoignages de patientes'], 'Les liens WeChat seront ajoutés prochainement.'],
    ['de', ['Artikel', 'Videos', 'Rückmeldungen von Patientinnen'], 'WeChat-Links werden demnächst ergänzt.'],
    ['es', ['Artículos', 'Vídeos', 'Comentarios de pacientes'], 'Próximamente se añadirán enlaces de WeChat.'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(categories.locator('summary')).toHaveText(labels);
    for (const category of await categories.all()) {
      const summary = category.locator('summary');
      expect((await summary.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(category).toHaveAttribute('open', '');
      if (await category.getAttribute('data-wechat-category') === 'feedback') {
        await expect(category.locator('.resource-pending')).toHaveText(pending);
        await expect(category.locator('a, img, video')).toHaveCount(0);
      }
      await assertNoOverflow(page);
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(category).not.toHaveAttribute('open');
    }
  }
  await expect(page.locator('[data-wechat-category="articles"] a')).toHaveCount(4);
  await expect(page.locator('[data-wechat-category="videos"] a')).toHaveCount(1);
  await expect(page.locator('.insight-categories a')).toHaveCount(5);
});

test('WeChat article topics preserve the supplied language, links and collapsed layout', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-wechat-category="articles"] summary').click();
  await page.locator('[data-i18n="insightAllArticles"]').click();
  await expect(page.locator('#wechat-articles-title')).toBeVisible();
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    const language = code === 'zh' ? 'zh' : 'en';
    const library = page.locator(`[data-wechat-library="${language}"]`);
    await expect(library).toBeVisible();
    await expect(page.locator('[data-wechat-library]:not([hidden])')).toHaveCount(1);
    await expect(library.locator('a')).toHaveCount(language === 'zh' ? 15 : 25);
    await expect(library.locator('details')).toHaveCount(5);
    await expect(library.locator('details[open]')).toHaveCount(0);
    for (const topic of await library.locator('details').all()) {
      await topic.locator('summary').press('Enter');
      await expect(topic).toHaveAttribute('open', '');
      await expect(topic.locator('a').first()).toBeVisible();
      for (const link of await topic.locator('a').all()) {
        await expect(link).toHaveAttribute('href', /^https:\/\/mp\.weixin\.qq\.com\/s\?/);
        await expect(link).toHaveAttribute('lang', language === 'zh' ? 'zh-CN' : 'en');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
      await assertNoOverflow(page);
      await topic.locator('summary').press('Enter');
      await expect(topic).not.toHaveAttribute('open');
    }
    await assertLinks(page);
  }
  await expect(page.locator('video source')).toHaveAttribute('src', /\/assets\/mood-swings\.mp4$/);
});

test('the event is clearly labelled as a health talk in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const event = page.getByRole('article', { name: 'Growing Pains', exact: true });
  for (const [code, label] of [
    ['en', 'Health talk'], ['zh', '健康讲座'], ['fr', 'Conférence santé'],
    ['de', 'Gesundheitsvortrag'], ['es', 'Charla de salud'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    const badge = event.locator('.event-heading .event-type');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(label);
    await expect(badge).toHaveCSS('border-color', 'rgb(225, 137, 0)');
    await expect(badge).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    await expect(event.getByRole('heading', { name: 'Growing Pains', exact: true })).toHaveCount(1);
    await expect(event.locator('time')).toHaveAttribute('datetime', '2026-10-24T14:00:00+08:00');
    await expect(event.locator('a')).toHaveAttribute('href', 'https://www.theplushealth.org/#events');
    expect((await badge.boundingBox()).height).toBeGreaterThanOrEqual(30);
    await assertNoOverflow(page);
  }
});

test('both Ferguson Plus external actions use matching unfilled gold circles', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const links = page.locator('.external-circle-link');
  await expect(links).toHaveCount(2);
  expect(await links.evaluateAll(elements => elements.map(element => element.getAttribute('href')))).toEqual([
    'https://www.theplushealth.org/', 'https://www.theplushealth.org/#events',
  ]);
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    for (const link of await links.all()) {
      const circle = link.locator('.external-link-circle');
      await expect(circle).toHaveCSS('border-color', 'rgb(225, 137, 0)');
      await expect(circle).toHaveCSS('border-radius', '50%');
      await expect(circle).toHaveCSS('width', '40px');
      await expect(circle).toHaveCSS('height', '40px');
      await expect(circle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(circle.locator('svg')).toHaveCSS('stroke', 'rgb(26, 45, 86)');
      await expect(circle.locator('use')).toHaveAttribute('href', '#arrow-up');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      const layout = await link.evaluate(element => ({
        label: element.firstElementChild.getBoundingClientRect().toJSON(),
        circle: element.lastElementChild.getBoundingClientRect().toJSON(),
        height: element.getBoundingClientRect().height,
      }));
      expect(layout.circle.left).toBeGreaterThan(layout.label.right);
      expect(layout.height).toBeGreaterThanOrEqual(44);
    }
    await assertNoOverflow(page);
  }
});

test('community and education efforts link to bilingual insights and a local video', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('[data-i18n="workEyebrow"]')).toHaveText('Our efforts');
  await expect(page.locator('#work-title')).toHaveText('Beyondthe clinic.');
  await expect(page.locator('.effort-list summary>span:first-child')).toHaveText(['Community education', 'Multidisciplinary exchange', 'Learning together']);
  await expect(page.locator('[data-i18n="effortCommunityBody"]')).toHaveText('Dr. Ferguson and the team regularly give community talks on women’s health, sharing clear, practical knowledge and making space for questions and open conversation.');
  await expect(page.locator('[data-i18n="effortMDTBody"]')).toContainText('multidisciplinary team (MDT) discussions');
  await expect(page.locator('[data-i18n="effortCMEBody"]')).toContainText('continuing medical education (CME) discussions');
  await expect(page.locator('.resource-list a')).toHaveCount(5);
  await expect(page.locator('.event-date time')).toHaveAttribute('datetime', '2026-10-24T14:00:00+08:00');
  await expect(page.locator('[data-i18n="eventLink"]').locator('..')).toHaveAttribute('href', 'https://www.theplushealth.org/#events');
  await page.locator('[data-wechat-category="articles"] summary').click();
  await page.locator('[data-i18n="insightBone"]').click();
  await expect(page.locator('#bone-title')).toHaveText('Silent bone loss after menopause');
  await expect(page.locator('.insights-home')).toHaveText("Ferguson Women's Health");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/assets\/favicon\.svg$/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f8f7f3');
  await expect(page.locator('.insight-article')).toHaveCount(4);
  await expect(page.locator('.practice-locations, .appointment-code, .email-address')).toHaveCount(0);
  const video = page.locator('video');
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).toHaveAttribute('poster', /\/releases\/[0-9a-f]{40}\/assets\/mood-swings-poster\.png$/);
  await expect(video.locator('source')).toHaveAttribute('src', /\/releases\/[0-9a-f]{40}\/assets\/mood-swings\.mp4$/);
  await expect(video).not.toHaveAttribute('autoplay');
  await assertLinks(page);
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('#bone-title')).toHaveText('绝经后的无声骨流失');
  await expect(page.locator('#video-title')).toHaveText('情绪波动，还是抑郁？了解两者的区别');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await assertNoOverflow(page);
  await page.locator('[data-i18n="back"]').click();
  await expect(page.locator('[data-i18n="workEyebrow"]')).toHaveText('社区与教育');
  await expect(page.locator('.effort-list summary>span:first-child')).toHaveText(['社区健康教育', '多学科交流', '共同学习']);
  await expect(page.locator('[data-i18n="effortCommunityBody"]')).toHaveText('吕医生与团队经常开展女性健康主题的社区讲座，以清晰、实用的方式分享知识，也为提问和坦诚交流留出空间。');
  await expect(page.locator('[data-i18n="effortMDTBody"]')).toContainText('合作医院的平台');
  await expect(page.locator('[data-i18n="effortCMEBody"]')).toContainText('继续医学教育（CME）讨论');
});

test('effort descriptions are independent native disclosures with preserved multilingual content', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const efforts = page.locator('.effort-item');
  await expect(efforts).toHaveCount(3);
  await expect(page.locator('.effort-item[open]')).toHaveCount(0);
  for (const effort of await efforts.all()) {
    await expect(effort.locator('p')).toBeHidden();
    await expect(effort.locator('summary')).toHaveCSS('font-size', '16px');
    expect(await effort.locator('.details-toggle').evaluate(element => getComputedStyle(element, '::after').transform)).toBe('matrix(0, 1, -1, 0, 0, 0)');
    await effort.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(effort).toHaveAttribute('open', '');
    await expect(effort.locator('p')).toBeVisible();
    await expect(effort.locator('p')).toHaveCSS('font-size', '15px');
    expect(await effort.locator('.details-toggle').evaluate(element => getComputedStyle(element, '::after').transform)).toBe('none');
    await expect(effort.locator('.details-toggle')).toHaveCSS('outline-width', '2px');
    await page.keyboard.press('Space');
    await expect(effort).not.toHaveAttribute('open');
  }
  await efforts.first().locator('summary').click();
  await efforts.last().locator('summary').click();
  for (const code of ['zh', 'fr', 'de', 'es', 'en']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(efforts.first()).toHaveAttribute('open', '');
    await expect(efforts.nth(1)).not.toHaveAttribute('open');
    await expect(efforts.last()).toHaveAttribute('open', '');
    await expect(efforts.first().locator('p')).toBeVisible();
    for (const summary of await efforts.locator('summary').all()) {
      const layout = await summary.evaluate(element => ({
        title: element.firstElementChild.getBoundingClientRect().toJSON(),
        arrow: element.lastElementChild.getBoundingClientRect().toJSON(),
        height: element.getBoundingClientRect().height,
      }));
      expect(layout.arrow.left).toBeGreaterThan(layout.title.right);
      expect(layout.height).toBeGreaterThanOrEqual(44);
    }
    await assertNoOverflow(page);
  }
  const plus = page.locator('.plus-feature>a');
  await expect(plus).toHaveAttribute('href', 'https://www.theplushealth.org/');
  await expect(plus.locator('use')).toHaveAttribute('href', '#arrow-up');
  await page.reload();
  await expect(page.locator('.effort-item[open]')).toHaveCount(0);
});

test('doctor biography retains the supplied role and clinical focus with accessible expanded training', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('.profile-name')).toHaveText('Dr. Michelle Lu-Ferguson');
  await expect(page.locator('.about-portrait figcaption')).toHaveCount(0);
  await expect(page.locator('.profile-role')).toHaveText('Founder & President, Ferguson Women’s Health');
  const introduction = page.locator('[data-i18n-html="aboutBody"]');
  await expect(introduction).toContainText('decades of clinical experience across the United States and China');
  await expect(introduction.locator('strong')).toHaveText(['American board-certified OB/GYN specialist', 'Fellow of the American College of Obstetricians and Gynecologists (FACOG).']);
  const emphasisWeights = await introduction.locator('strong').evaluateAll(elements => elements.map(element => Number(getComputedStyle(element).fontWeight)));
  expect(emphasisWeights.every(weight => weight >= 600)).toBe(true);
  const connector = await introduction.evaluate(element => {
    const node = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent === ' and a ');
    return node ? Number(getComputedStyle(node.parentElement).fontWeight) : null;
  });
  expect(connector).not.toBeNull();
  expect(connector).toBeLessThan(600);
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('PMOS (Polyendocrine Metabolic Ovarian Syndrome)');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('complex and high-risk prenatal situations');
  await expect(page.locator('[data-i18n="aboutPractice"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="aboutBody2"]')).toBeHidden();
  const details = page.locator('.profile-details');
  const summary = details.locator('summary');
  await expect(summary.locator('[data-i18n="profileDetailsTitle"]')).toHaveText('Clinical focus & medical training');
  await expect(details).not.toHaveAttribute('open');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('[data-i18n="profileTraining"]')).toBeVisible();
  for (const institution of ['Peking University', 'Peking Union Medical College', 'New York University']) {
    await expect(details.locator('[data-i18n="profileTraining"]')).toContainText(institution);
  }
  const degree = details.locator('[data-i18n-html="profileDegree"]');
  const residency = details.locator('[data-i18n="profileResidency"]');
  await expect(degree).toContainText('Doctor of Medicine degree from the Medical University of Ohio');
  await expect(degree.locator('strong')).toHaveText('Doctor of Medicine');
  expect(await degree.locator('strong').evaluate(element => Number(getComputedStyle(element).fontWeight))).toBeGreaterThanOrEqual(600);
  await expect(residency).toContainText('She completed her residency in obstetrics and gynecology at Rutgers Robert Wood Johnson Medical School');
  await expect(residency.locator('strong')).toHaveCount(0);
  expect(await residency.evaluate(element => Number(getComputedStyle(element).fontWeight))).toBeLessThan(600);
  await expect(residency).toContainText('she joined the faculty');
  await expect(residency).toContainText('clinical care, medical education, and clinical research');
  await expect(details.locator('[data-i18n="profileTraining"]')).toContainText('pre-medical studies at Peking University');
  await expect(details.locator('[data-i18n="profileTraining"]')).toContainText('PhD-level research training at New York University');
  await expect(details).not.toContainText('Ohio University College of Medicine');
  await expect(details.locator('[data-i18n="profileSurgery"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('full spectrum of women’s health');
  for (const focus of ['fertility and preconception counseling', 'sexual and vulvovaginal health', 'adolescent gynecology', 'pelvic floor health', 'long-term preventive care']) {
    await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText(focus);
  }
  await page.locator('[data-language-switch]').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('.profile-name')).toHaveText('吕明旭医生');
  await expect(summary.locator('[data-i18n="profileDetailsTitle"]')).toHaveText('咨询重点与医学背景');
  await expect(introduction.locator('strong')).toHaveText(['美国妇产科专科认证医生', '美国妇产科医师学会会士（FACOG）。']);
  await expect(page.locator('.profile-role')).toHaveText('Ferguson Women’s Health 创始人兼总裁');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('复杂及高危孕期情况');
  await expect(degree).toContainText('俄亥俄医科大学（Medical University of Ohio）取得医学博士（MD）学位');
  await expect(degree.locator('strong')).toHaveText('医学博士（MD）');
  await expect(residency).toContainText('完成妇产科住院医师培训');
  await expect(residency).toContainText('临床照护、医学教育与临床研究');
  await expect(residency.locator('strong')).toHaveCount(0);
  await expect(details.locator('[data-i18n="profileTraining"]')).toContainText('纽约大学接受博士阶段科研培训');
  await expect(details.locator('[data-i18n="profileTraining"]')).not.toContainText('取得博士学位');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('盆底健康及长期预防保健');
  await assertNoOverflow(page);
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(details).not.toHaveAttribute('open');
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('.profile-role')).toHaveText('Founder & President, Ferguson Women’s Health');
  await expect(introduction.locator('strong').first()).toHaveText('American board-certified OB/GYN specialist');
  await assertNoOverflow(page);
});

test('practice name leads the compact hero and the portrait stays with the doctor profile', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('#hero-title')).toHaveText('Ferguson Women’s Health');
  await expect(page.locator('.hero-life')).toHaveText('for every chapter of your life.');
  await expect(page.locator('.hero-life')).toHaveCSS('font-style', 'italic');
  const headlineScale = await page.locator('#hero-title, #care-title').evaluateAll(headings => headings.map(heading => {
    const style = getComputedStyle(heading);
    return [style.fontFamily, style.fontStyle, style.fontWeight];
  }));
  expect(headlineScale[0]).toEqual(headlineScale[1]);
  await expect(page.locator('.hero .doctor-photo')).toHaveCount(0);
  await expect(page.locator('.hero-who-title')).toHaveText('Who We Are');
  await expect(page.locator('.hero-intro')).toHaveText('We are a women’s health team combining evidence-based care with clear communication, cross-cultural understanding, and long-term support.');
  await expect(page.locator('.purpose-details')).not.toHaveAttribute('open');
  await expect(page.locator('#mission-title')).toBeHidden();
  await page.locator('.purpose-details summary').click();
  await expect(page.locator('#mission-title')).toBeVisible();
  await expect(page.locator('.purpose-item h2')).toHaveText(['Mission', 'Vision']);
  const englishHeadings = await page.locator('.hero-who-title, .purpose-item h2').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
  }));
  expect(englishHeadings).toHaveLength(3);
  for (const style of englishHeadings) expect(style).toEqual(englishHeadings[0]);
  await expect(page.locator('.purpose-item p')).toHaveText([
    'To help every woman understand her body and make informed, confident health decisions through thoughtful guidance and personalized care.',
    'A future where every woman can benefit from international standards of women’s healthcare and live a healthier, fuller life.',
  ]);
  const teamCopy = await page.locator('.hero-team').innerText();
  expect(teamCopy.match(/international/gi)).toHaveLength(1);
  expect(teamCopy.match(/evidence-based/gi)).toHaveLength(1);
  const portrait = page.locator('#about .doctor-photo');
  await expect(portrait).toHaveCount(1);
  await expect(page.locator('.doctor-photo')).toHaveCount(1);
  await portrait.scrollIntoViewIfNeeded();
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#about .about-portrait figcaption')).toHaveCount(0);
  await expect(page.locator('#about .about-portrait')).toHaveAttribute('aria-labelledby', 'profile-name');
  await expect(page.locator('.profile-identity > h3, .profile-identity > p')).toHaveText(['Dr. Michelle Lu-Ferguson', 'MD, FACOG · Obstetrics & Gynaecology · Women’s Health', 'Founder & President, Ferguson Women’s Health']);
  await expect(portrait).toHaveAttribute('src', /dr-ferguson-light-grey\.jpg/);
  expect(await portrait.evaluate(image => [image.naturalWidth, image.naturalHeight])).toEqual([1084, 1451]);
  if (isMobile) {
    const order = await page.locator('.about-grid').evaluate(grid => ({
      headingBottom: grid.querySelector('.section-heading').getBoundingClientRect().bottom,
      portraitTop: grid.querySelector('.about-portrait').getBoundingClientRect().top,
      portraitBottom: grid.querySelector('.about-portrait').getBoundingClientRect().bottom,
      copyTop: grid.querySelector('.about-copy').getBoundingClientRect().top,
    }));
    expect(order.portraitTop).toBeGreaterThan(order.headingBottom);
    expect(order.copyTop).toBeGreaterThan(order.portraitBottom);
  }
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('#hero-title')).toHaveText('Ferguson Women’s Health');
  await expect(page.locator('.hero-life')).toHaveText('关爱人生的每一个阶段。');
  await expect(page.locator('.hero-who-title')).toHaveText('我们是谁');
  await expect(page.locator('.hero-intro')).toHaveText('我们是一支专注女性健康的团队，以循证医学为基础，注重清晰沟通、跨文化理解和长期支持。');
  await expect(page.locator('.purpose-item h2')).toHaveText(['使命', '愿景']);
  const chineseHeadings = await page.locator('.hero-who-title, .purpose-item h2').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
  }));
  expect(chineseHeadings).toHaveLength(3);
  for (const style of chineseHeadings) expect(style).toEqual(chineseHeadings[0]);
  await expect(page.locator('.purpose-item p')).toHaveText([
    '通过细致指导与个性化照护，帮助每位女性了解自己的身体，充分知情、自信地做出健康选择。',
    '让每位女性都能受益于国际标准的女性健康照护，拥有更健康、更充实的生活。',
  ]);
  await expect(page.locator('#about .about-portrait figcaption')).toHaveCount(0);
  await expect(page.locator('.profile-identity > h3, .profile-identity > p')).toHaveText(['吕明旭医生', 'MD, FACOG · 妇产科 · 女性健康', 'Ferguson Women’s Health 创始人兼总裁']);
  await assertNoOverflow(page);
  for (const [code, understanding, care, future] of [
    ['fr', 'compréhension interculturelle', 'des soins personnalisés', 'Un avenir'],
    ['de', 'interkulturellem Verständnis', 'individuell abgestimmte Versorgung', 'Eine Zukunft'],
    ['es', 'comprensión intercultural', 'una atención personalizada', 'Un futuro'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(page.locator('.hero-intro')).toContainText(understanding);
    await expect(page.locator('[data-i18n="missionBody"]')).toContainText(care);
    await expect(page.locator('[data-i18n="visionBody"]')).toContainText(future);
    await assertNoOverflow(page);
  }
});

test('Who We Are has the original text-free logo beside its heading in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const mark = page.locator('.hero-team-heading .brand-mark');
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark).toHaveText('');
  await expect(mark).toHaveCSS('background-image', /\/assets\/ferguson-logo\.png/);
  await expect(mark).toHaveCSS('background-size', '349.44% 339.39%');
  await expect(mark).toHaveCSS('background-position', '63.23% 31.65%');
  for (const [code, label] of [
    ['en', 'Who We Are'], ['zh', '我们是谁'], ['fr', 'Qui sommes-nous ?'],
    ['de', 'Wer wir sind'], ['es', 'Quiénes somos'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(mark).toBeVisible();
    await expect(page.locator('.hero-who-title')).toHaveText(label);
    const row = await page.locator('.hero-team-heading').evaluate(element => {
      const logo = element.querySelector('.brand-mark').getBoundingClientRect();
      const title = element.querySelector('h2').getBoundingClientRect();
      return { gap: title.left - logo.right, centerDifference: Math.abs(logo.top + logo.height / 2 - title.top - title.height / 2) };
    });
    expect(row.gap).toBeGreaterThanOrEqual(12);
    expect(row.centerDifference).toBeLessThanOrEqual(1);
    await expect(page.locator('.purpose-details')).not.toHaveAttribute('open');
    await assertNoOverflow(page);
  }
});

test('mission and vision stay compact with a keyboard-accessible disclosure in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const details = page.locator('.purpose-details');
  const summary = details.locator('summary');
  for (const [code, label] of [
    ['en', 'Our mission & vision'], ['zh', '我们的使命与愿景'],
    ['fr', 'Notre mission et notre vision'], ['de', 'Unsere Mission und Vision'],
    ['es', 'Nuestra misión y visión'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(summary).toHaveText(label);
    await expect(details).not.toHaveAttribute('open');
    await expect(page.locator('.hero-who-title')).toBeVisible();
    await expect(page.locator('.hero-intro')).toBeVisible();
    await expect(page.locator('#mission-title')).toBeHidden();
    await expect(page.locator('#vision-title')).toBeHidden();
    const compactHeight = await page.locator('.hero-team').evaluate(panel => panel.getBoundingClientRect().height);
    await summary.focus();
    await summary.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await expect(page.locator('#mission-title')).toBeVisible();
    await expect(page.locator('#vision-title')).toBeVisible();
    expect(await page.locator('.hero-team').evaluate(panel => panel.getBoundingClientRect().height)).toBeGreaterThan(compactHeight + 100);
    await assertNoOverflow(page);
    await summary.press('Space');
    await expect(details).not.toHaveAttribute('open');
    await expect(page.locator('#mission-title')).toBeHidden();
    await expect(summary).toBeFocused();
    await assertNoOverflow(page);
  }
});

test('mission and vision can expand without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#mission-title')).toBeHidden();
  await page.locator('.purpose-details summary').click();
  await expect(page.locator('#mission-title')).toBeVisible();
  await expect(page.locator('#vision-title')).toBeVisible();
  await context.close();
});

test('clinic information is pale blue while the calendar keeps its paper background in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const calendar = page.locator('#appointment-calendar');
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(page.locator('.locations-overview')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    await expect(page.locator('#locations')).toHaveCSS('background-color', 'rgb(248, 247, 243)');
    await expect(calendar).toHaveCSS('background-color', 'rgb(248, 247, 243)');
    await expect(page.locator('#work')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    for (const frame of await page.locator('#locations .appointment-qr-frame').all()) {
      await expect(frame).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    }
    const bands = await page.locator('#locations').evaluate(section => ({
      overview: section.querySelector('.locations-overview').getBoundingClientRect().toJSON(),
      calendar: section.querySelector('.appointment-calendar').getBoundingClientRect().toJSON(),
      section: section.getBoundingClientRect().toJSON(),
    }));
    expect(bands.overview.left).toBe(bands.section.left);
    expect(bands.overview.right).toBe(bands.section.right);
    expect(bands.overview.bottom).toBeLessThan(bands.calendar.top);
    await calendar.locator('summary').click();
    await expect(calendar).toHaveAttribute('open', '');
    await expect(calendar).toHaveCSS('background-color', 'rgb(248, 247, 243)');
    await calendar.locator('summary').click();
    await assertNoOverflow(page);
  }
});

test('section closing lines stay understated and news precedes articles', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const closings = page.locator('main > section > .section-closing');
  await expect(closings).toHaveText([
    'Understanding your needs. Supporting every stage.',
    'Experience that listens. Care that feels personal.',
    'Making time for your health.',
    'Sharing knowledge. Connecting communities.',
    'Questions welcome. Connections begin here.',
  ]);
  await expect(page.locator('.hero-bottom')).toContainText('Expertise. Empathy. A little more understanding.');
  for (const closing of await closings.all()) {
    await expect(closing).toHaveCSS('border-top-width', '1px');
    await expect(closing).toHaveCSS('font-size', '12px');
  }
  const cards = page.locator('.community-grid > .community-card');
  expect(await cards.evaluateAll(elements => elements.map(element => element.getAttribute('aria-labelledby')))).toEqual(['event-title', 'insights-title']);
  const arrangement = await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
  if (isMobile) expect(arrangement[1].top).toBeGreaterThan(arrangement[0].bottom);
  else expect(arrangement[1].left).toBeGreaterThan(arrangement[0].right);
  await expect(page.locator('#contact .brand-mark')).toHaveCount(0);
  await expect(page.locator('#care .care-aside, #care [data-i18n="careIntro"]')).toHaveCount(0);
  await expect(page.locator('#care .brand-mark')).toHaveCount(1);
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(closings).toHaveText([
    '了解您的需要，陪伴每一个阶段。', '专业始于经验，关怀始于倾听。', '为健康，留一点时间。',
    '分享知识，连接社区。', '欢迎提问，从交流开始。',
  ]);
  const calendar = page.locator('#appointment-calendar');
  const closing = page.locator('#locations > .section-closing');
  await expect(calendar).not.toHaveAttribute('open');
  await expect(closing).toHaveCount(1);
  for (const [language, text] of Object.entries({
    en: 'Making time for your health.', zh: '为健康，留一点时间。',
    fr: 'Du temps pour votre santé.', de: 'Zeit für Ihre Gesundheit.', es: 'Tiempo para tu salud.',
  })) {
    await page.locator(`[data-language="${language}"]`).click();
    await expect(closing).toHaveText(text);
    await expect(closing).toBeVisible();
    await expect(calendar).toHaveCSS('border-bottom-width', '0px');
    expect((await closing.boundingBox()).y).toBeGreaterThanOrEqual((await calendar.boundingBox()).y + (await calendar.boundingBox()).height);
    await assertNoOverflow(page);
  }
  await calendar.locator('summary').click();
  await expect(calendar).toHaveAttribute('open', '');
  await expect(closing).toBeVisible();
  await calendar.locator('summary').click();
  await expect(calendar).not.toHaveAttribute('open');
  await expect(closing).toBeVisible();
  await assertNoOverflow(page);
});

test('balanced team panel leads to services before the doctor profile', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  expect(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.id || 'hero')))
    .toEqual(['hero', 'care', 'about', 'locations', 'work', 'wecare', 'connect']);
  for (const navigation of ['.desktop-nav', '#mobile-nav']) {
    expect(await page.locator(`${navigation} a`).evaluateAll(links => links.map(link => link.getAttribute('href'))))
      .toEqual(navigation === '.desktop-nav' ? ['#care', '#about', '#locations', '#work'] : ['#care', '#about', '#locations', '#work', '#contact']);
  }
  await expect(page.locator('.hero-team .hero-who-title')).toHaveText('Who We Are');
  await expect(page.locator('.hero-team .purpose-item')).toHaveCount(2);
  const arrangement = await page.locator('.hero').evaluate(hero => ({
    copy: hero.querySelector('.hero-copy').getBoundingClientRect().toJSON(),
    panel: hero.querySelector('.hero-team').getBoundingClientRect().toJSON(),
  }));
  if (isMobile) expect(arrangement.panel.top).toBeGreaterThan(arrangement.copy.bottom);
  else expect(arrangement.panel.left).toBeGreaterThan(arrangement.copy.right);
  await expect(page.locator('[data-i18n="careEyebrow"]')).toHaveText('Areas of care');
  await expect(page.locator('[data-i18n="aboutEyebrow"]')).toHaveText('Meet Dr. Ferguson');
  await expect(page.locator('[data-i18n="locationsEyebrow"]')).toHaveText('Find us');
  await expect(page.locator('#locations .practice')).toHaveCount(2);
  await expect(page.locator('#locations #appointment-calendar')).toHaveCount(1);
  await expect(page.locator('#locations #contact')).toHaveCount(1);
  await expect(page.locator('#connect .practice, #connect #appointment-calendar, #connect a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('#connect .wechat-and-social')).toHaveCount(1);
  await expect(page.locator('[data-i18n="insightsUpdates"]')).toHaveAttribute('href', '#connect');
  await expect(page.locator('.hero .text-link[href="#care"]')).toHaveCount(0);
  if (isMobile) await page.locator('.menu-toggle').click();
  await page.locator(`${isMobile ? '#mobile-nav' : '.desktop-nav'} a[href="#care"]`).click();
  await expect(page).toHaveURL(/#care$/);
  await expect(page.locator('#care')).toBeInViewport();
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('[data-i18n="careEyebrow"]')).toHaveText('咨询领域');
  await expect(page.locator('[data-i18n="navCare"]')).toHaveText(['咨询领域', '咨询领域']);
  await expect(page.locator('[data-i18n="contactLabel"]')).toHaveText('一般咨询：');
  await expect(page.locator('[data-i18n="aboutEyebrow"]')).toHaveText('认识吕医生');
  await expect(page.locator('[data-i18n="heroCta"]')).toHaveCount(0);
  await assertNoOverflow(page);
});

test('official-account QR keeps its white margin inside the matching blue frame', async ({ page }) => {
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

test('social icons stay beside WeChat when they fit and wrap together when space is narrow', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const social = page.locator('.connected-profile');
  await expect(page.locator('#connected-title')).toHaveText('Stay connected');
  await expect(page.locator('[data-i18n="contactLabel"]')).toHaveText('General enquiries:');
  await expect(page.locator('[data-i18n="wechatBody"]')).toHaveText('Scan for news & updates.');
  await expect(page.locator('[data-i18n="wechatNote"], [data-i18n="socialTitle"]')).toHaveCount(0);
  await expect(page.locator('.practice h3')).toHaveText(['1. Am-Sino Ding Xiang Clinic', '2. Parkway MediCentre Xintiandi']);
  await expect(page.locator('.connected-grid > *')).toHaveCount(2);
  await expect(page.locator('.social-icon-row > .connected-profile')).toHaveCount(3);
  await expect(social.locator('.social-handle')).toHaveCount(0);
  await expect(social.locator('a')).toHaveCount(3);
  await expect(page.getByRole('article', { name: 'Facebook', exact: true }).locator('a')).toHaveCount(1);
  await expect(page.getByRole('article', { name: 'Instagram', exact: true }).locator('a')).toHaveCount(1);
  await expect(social.locator('h3')).toHaveText(['Xiaohongshu · 小红书', 'Facebook', 'Instagram']);
  await expect(social.locator('h3:not(.visually-hidden)')).toHaveCount(0);
  for (const label of await social.locator('h3').all()) await expect(label).toHaveCSS('clip-path', 'inset(50%)');
  await expect(page.getByRole('article', { name: 'Facebook', exact: true })).toHaveCount(1);
  await expect(page.getByRole('article', { name: 'Instagram', exact: true })).toHaveCount(1);
  const position = await page.locator('.wechat-and-social').evaluate(group => ({
    groupTop: group.getBoundingClientRect().top,
    bookingBottom: document.querySelector('.practice-locations').getBoundingClientRect().bottom,
    qr: group.querySelector('.wechat-contact').getBoundingClientRect().toJSON(),
    social: group.querySelector('.social-icon-row').getBoundingClientRect().toJSON(),
    code: group.querySelector('.wechat-contact .connected-visual').getBoundingClientRect().toJSON(),
    caption: group.querySelector('.wechat-contact figcaption').getBoundingClientRect().toJSON(),
  }));
  expect(position.groupTop).toBeGreaterThan(position.bookingBottom);
  if (isMobile) {
    expect(position.social.top).toBeGreaterThanOrEqual(position.qr.bottom + 20);
    expect(Math.abs(position.social.left - position.qr.left)).toBeLessThan(1);
  } else {
    expect(position.social.left).toBeGreaterThan(position.qr.right);
    expect(Math.abs((position.social.top + position.social.bottom) / 2 - (position.qr.top + position.qr.bottom) / 2)).toBeLessThan(1);
  }
  expect(position.social.width).toBeLessThanOrEqual(isMobile ? 200 : 260);
  expect(position.caption.left).toBeGreaterThan(position.code.right);
  const channels = await page.locator('.social-icon-row .social-profile-link').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
  for (const channel of channels) expect(Math.abs(channel.top - channels[0].top)).toBeLessThan(1);
  for (let index = 1; index < channels.length; index++) {
    const gap = channels[index].left - channels[index - 1].right;
    expect(gap).toBeGreaterThanOrEqual(20);
    expect(gap).toBeLessThanOrEqual(28);
  }
  const booking = await page.locator('.practice').evaluateAll(practices => practices.map(practice => ({
    text: practice.querySelector('.practice-details').getBoundingClientRect().toJSON(),
    code: practice.querySelector('.appointment-code').getBoundingClientRect().toJSON(),
    card: practice.getBoundingClientRect().toJSON(),
  })));
  for (const practice of booking) {
    expect(Math.abs(practice.code.top - practice.text.top)).toBeLessThan(1);
    expect(practice.code.left).toBeGreaterThan(practice.text.right);
  }
  if (isMobile) expect(booking[1].card.top).toBeGreaterThan(booking[0].card.bottom);
  else expect(booking[1].card.left).toBeGreaterThan(booking[0].card.right);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('#connected-title')).toHaveText('保持联系');
  await expect(page.locator('[data-i18n="locationsTitle"]')).toHaveText('咨询地点');
  await expect(page.locator('[data-i18n="wechatBody"]')).toHaveText('扫码关注，获取最新资讯。');
  await expect(page.locator('.practice h3')).toHaveText(['1. 美华丁香门诊部', '2. 百汇新天地医疗中心']);
  await expect(page.locator('.wechat-contact h3')).toHaveText('官方微信公众号');
  await expect(social.locator('h3')).toHaveText(['小红书', 'Facebook', 'Instagram']);
  await assertNoOverflow(page);
  if (!isMobile) {
    for (const width of [1000, 860, 701]) {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ['zh-CN', 'en']) {
        await page.locator(`[data-language="${language === 'zh-CN' ? 'zh' : language}"]`).click();
        const codes = await page.locator('.appointment-code').evaluateAll(elements => elements.map(element => ({
          top: element.getBoundingClientRect().top,
          caption: element.querySelector('figcaption').getBoundingClientRect().top,
        })));
        expect(Math.abs(codes[0].top - codes[1].top), `QR alignment at ${width}px in ${language}`).toBeLessThan(1);
        expect(Math.abs(codes[0].caption - codes[1].caption)).toBeLessThan(1);
        await assertNoOverflow(page);
      }
    }
  }
  for (const width of [1280, 800, 780, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ['en', 'zh', 'fr', 'de', 'es']) {
      await page.locator(`[data-language="${language}"]`).click();
      const layout = await page.locator('.connected-grid').evaluate(group => ({
        qr: group.querySelector('.wechat-contact').getBoundingClientRect().toJSON(),
        row: group.querySelector('.social-icon-row').getBoundingClientRect().toJSON(),
        icons: [...group.querySelectorAll('.social-profile-link')].map(icon => icon.getBoundingClientRect().toJSON()),
      }));
      for (const icon of layout.icons) {
        expect(Math.abs(icon.top - layout.icons[0].top)).toBeLessThan(1);
        expect(icon.width).toBeGreaterThanOrEqual(44);
      }
      if (width >= 800) expect(layout.row.left).toBeGreaterThan(layout.qr.right);
      else {
        expect(layout.row.top).toBeGreaterThanOrEqual(layout.qr.bottom + 20);
        expect(Math.abs(layout.row.left - layout.qr.left)).toBeLessThan(1);
      }
      await assertNoOverflow(page);
    }
  }
});

test('general enquiries sit with clinic locations and Contact reaches the email', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const email = page.locator('#locations #contact');
  await expect(page.locator('a[href="mailto:info@fergusonhealth.com"]')).toHaveCount(1);
  await expect(email.locator('a')).toHaveAttribute('href', 'mailto:info@fergusonhealth.com');
  await expect(page.locator('#connect .contact-heading, #connect .contact-copy')).toHaveCount(0);
  await expect(page.locator('#connect > .wrap .wechat-and-social')).toHaveCount(1);
  for (const [code, label, contact] of [
    ['en', 'General enquiries:', 'Contact'], ['zh', '一般咨询：', '联系我们'],
    ['fr', 'Renseignements généraux :', 'Contact'], ['de', 'Allgemeine Anfragen:', 'Kontakt'],
    ['es', 'Consultas generales:', 'Contacto'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(email.locator('[data-i18n="contactLabel"]')).toHaveText(label);
    await expect(page.locator('[data-i18n="navContact"]')).toHaveText([contact, contact]);
    const layout = await email.evaluate(element => ({
      bottom: element.getBoundingClientRect().bottom,
      cardsTop: document.querySelector('.practice-locations').getBoundingClientRect().top,
      emailSize: parseFloat(getComputedStyle(element).fontSize),
      linkHeight: element.querySelector('a').getBoundingClientRect().height,
      codes: [...document.querySelectorAll('#locations .appointment-qr-frame img')].map(image => image.getBoundingClientRect().width),
    }));
    expect(layout.cardsTop).toBeGreaterThan(layout.bottom);
    expect(layout.emailSize).toBe(15);
    expect(layout.linkHeight).toBeGreaterThanOrEqual(44);
    for (const size of layout.codes) expect(size).toBeGreaterThanOrEqual(108);
    if (isMobile) await page.locator('.menu-toggle').click();
    await page.locator(`${isMobile ? '#mobile-nav' : '.header-actions'} a[href="#contact"]`).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(email).toBeInViewport();
    await assertNoOverflow(page);
  }
  await page.reload();
  await expect(email).toBeInViewport();
});

test('social icons open the owner-supplied profiles and stay accessible in every language', async ({ page, context }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const xiaohongshuUrl = 'https://xhslink.cn/o/3PidH8Y4ZmB';
  const instagramUrl = 'https://www.instagram.com/fergusonhealth_sh/';
  const facebookUrl = 'https://www.facebook.com/share/19wwsiyueH/';
  for (const [code, xiaohongshuName] of [
    ['en', 'Xiaohongshu · 小红书'], ['zh', '小红书'], ['fr', 'Xiaohongshu · 小红书'],
    ['de', 'Xiaohongshu · 小红书'], ['es', 'Xiaohongshu · 小红书'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    for (const [name, profileUrl] of [[xiaohongshuName, xiaohongshuUrl], ['Instagram', instagramUrl], ['Facebook', facebookUrl]]) {
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', profileUrl);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await link.focus();
      await expect(link).toBeFocused();
      const size = await link.boundingBox();
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
    await assertNoOverflow(page);
  }
  // Exercise the real links without requiring a third-party login or network access.
  for (const [name, profileUrl] of [['Xiaohongshu · 小红书', xiaohongshuUrl], ['Instagram', instagramUrl], ['Facebook', facebookUrl]]) {
    await context.route(profileUrl, route => route.fulfill({
      status: 200, contentType: 'text/html', body: '<title>Profile link test</title>',
    }));
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name, exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(profileUrl);
    await popup.close();
  }
});

test('contact email opens the configured email app in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const email = page.locator('#locations .locations-email a');
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(email).toHaveText('info@fergusonhealth.com');
    await expect(email).toHaveAttribute('href', 'mailto:info@fergusonhealth.com');
  }
  // Verify keyboard access without opening an external app or sending mail.
  await email.focus();
  await expect(email).toBeFocused();
  await assertNoOverflow(page);
});

test('clinic phone numbers match address styling without a booking label in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const phones = page.locator('.practice-phone a');
  await expect(phones).toHaveText(['（021）3175-2500', '400-819-6622']);
  await expect(phones.nth(0)).toHaveAttribute('href', 'tel:+862131752500');
  await expect(phones.nth(1)).toHaveAttribute('href', 'tel:4008196622');
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(page.locator('.practice-phone')).toHaveText(['（021）3175-2500', '400-819-6622']);
    if (code === 'zh') {
      await expect(page.locator('[data-i18n-html="clinic1Address"]')).toHaveText('华山路800号丁香公寓6号裙楼3层');
      await expect(page.locator('[data-i18n="clinic1Entrance"]')).toHaveText('（入口在镇宁路上）');
    }
    await expect(page.locator('[data-i18n="clinicBookingPhone"]')).toHaveCount(0);
    await expect(phones).toHaveText(['（021）3175-2500', '400-819-6622']);
    const locations = await page.locator('.practice-details').evaluateAll(details => details.map(card => ({
      cityBeforeAddress: Boolean(card.querySelector('.practice-city').compareDocumentPosition(card.querySelector('address')) & Node.DOCUMENT_POSITION_FOLLOWING),
      cityTop: card.querySelector('.practice-city').getBoundingClientRect().top,
      cityBottom: card.querySelector('.practice-city').getBoundingClientRect().bottom,
      addressTop: card.querySelector('address').getBoundingClientRect().top,
      addressBottom: card.querySelector('address').getBoundingClientRect().bottom,
      phoneTop: card.querySelector('.practice-phone').getBoundingClientRect().top,
      card: card.getBoundingClientRect().toJSON(),
      phone: card.querySelector('.practice-phone a').getBoundingClientRect().toJSON(),
      addressSize: getComputedStyle(card.querySelector('address')).fontSize,
      phoneSize: getComputedStyle(card.querySelector('.practice-phone a')).fontSize,
      addressColor: getComputedStyle(card.querySelector('address')).color,
      phoneColor: getComputedStyle(card.querySelector('.practice-phone a')).color,
      phoneDecoration: getComputedStyle(card.querySelector('.practice-phone a')).textDecorationLine,
    })));
    for (const location of locations) {
      expect(location.cityBeforeAddress).toBe(code === 'zh');
      if (code === 'zh') expect(location.addressTop).toBeGreaterThanOrEqual(location.cityBottom);
      else expect(location.cityTop).toBeGreaterThanOrEqual(location.addressBottom);
      expect(location.phoneTop).toBeGreaterThan(location.cityBottom);
      expect(location.phone.left).toBeGreaterThanOrEqual(location.card.left);
      expect(location.phone.right).toBeLessThanOrEqual(location.card.right + 1);
      expect(location.phoneSize).toBe(location.addressSize);
      expect(location.phoneColor).toBe(location.addressColor);
      expect(location.phoneDecoration).toBe('none');
    }
    await assertNoOverflow(page);
  }
  await page.locator('[data-language="zh"]').click();
  await page.reload();
  await waitForRenderedPage(page);
  await expect(page.locator('.practice-details > .clinic-name + .practice-city + address')).toHaveCount(2);
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('.practice-details > .practice-city + .practice-phone')).toHaveCount(2);
  await phones.nth(0).focus();
  await expect(phones.nth(0)).toBeFocused();
});

test('clinic calendar date rules include both boundaries, the break and the confirmed year-end date', () => {
  const { sessionFor, daysInMonth } = require('../draft/calendar.js');
  expect(sessionFor('2026-10-03')).toBeNull();
  expect(sessionFor('2026-10-05')).toEqual({ clinic: 'am-sino', time: 'afternoon' });
  expect(sessionFor('2026-10-06')).toEqual({ clinic: 'parkway', time: '13:00–19:00' });
  expect(sessionFor('2026-10-07')).toEqual({ clinic: 'am-sino', time: 'allDay' });
  expect(sessionFor('2026-10-08')).toBeNull();
  expect(sessionFor('2026-10-09')).toEqual({ clinic: 'parkway', time: '13:00–19:00' });
  expect(sessionFor('2026-10-10')).toEqual({ clinic: 'am-sino', time: 'allDay' });
  expect(sessionFor('2026-10-11')).toBeNull();
  expect(sessionFor('2026-10-20')).toEqual({ clinic: 'parkway', time: '13:00–19:00' });
  for (const date of ['2026-10-21', '2026-10-31', '2026-11-02', '2026-11-06']) expect(sessionFor(date)).toBeNull();
  expect(sessionFor('2026-11-07')).toEqual({ clinic: 'am-sino', time: 'allDay' });
  expect(sessionFor('2026-12-01')).toEqual({ clinic: 'parkway', time: '13:00–19:00' });
  expect(sessionFor('2026-12-15')).toEqual({ clinic: 'parkway', time: '13:00–19:00' });
  for (const date of ['2026-12-16', '2026-12-18', '2026-12-31', '2027-01-04']) expect(sessionFor(date)).toBeNull();
  expect(daysInMonth(2026, 11).filter(day => day.session).map(({ date, session }) => [date, session.clinic, session.time])).toEqual([
    ['2026-12-01', 'parkway', '13:00–19:00'], ['2026-12-02', 'am-sino', 'allDay'],
    ['2026-12-04', 'parkway', '13:00–19:00'], ['2026-12-05', 'am-sino', 'allDay'],
    ['2026-12-07', 'am-sino', 'afternoon'], ['2026-12-08', 'parkway', '13:00–19:00'],
    ['2026-12-09', 'am-sino', 'allDay'], ['2026-12-11', 'parkway', '13:00–19:00'],
    ['2026-12-12', 'am-sino', 'allDay'], ['2026-12-14', 'am-sino', 'afternoon'],
    ['2026-12-15', 'parkway', '13:00–19:00'],
  ]);
  expect(daysInMonth(2026, 9).filter(day => day.session)).toHaveLength(12);
  expect(daysInMonth(2026, 10)).toHaveLength(30);
  expect(daysInMonth(2028, 1)).toHaveLength(29);
});

test('collapsed calendar shows the right clinic QR, closes with Escape and retains its month across languages', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T00:00:00Z') });
  await page.goto('/');
  const calendar = page.locator('.appointment-calendar');
  await expect(calendar).not.toHaveAttribute('open');
  await calendar.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(calendar).toHaveAttribute('open', '');
  await expect(calendar.locator('.calendar-disclosure-icon svg')).toHaveCSS('transform', 'matrix(0, -1, 1, 0, 0, 0)');
  await expect(page.locator('#calendar-month')).toHaveText('October 2026');
  await expect(page.getByRole('button', { name: 'Previous month', exact: true })).toBeDisabled();
  await expect(calendar.locator('.calendar-session')).toHaveCount(12);
  await expect(calendar.locator('[data-date="2026-10-01"]')).toHaveCSS('grid-column-start', '4');
  await expect(calendar.locator('[data-date="2026-10-21"] button')).toHaveCount(0);
  await expect(page.locator('.calendar-note')).toContainText('not available appointment slots');
  const dialog = page.locator('.booking-dialog');
  for (const [date, clinic, practiceIndex] of [['2026-10-05', 'Am-Sino Ding Xiang Clinic', 0], ['2026-10-06', 'Parkway MediCentre Xintiandi', 1]]) {
    const session = calendar.locator(`[data-date="${date}"] button`);
    await session.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#booking-clinic')).toHaveText(clinic);
    await expect(dialog.locator('img')).toHaveAttribute('src', await page.locator('.appointment-qr-frame img').nth(practiceIndex).getAttribute('src'));
    await expect.poll(() => dialog.locator('img').evaluate(image => image.complete && image.naturalWidth === 460)).toBe(true);
    await expect(page.locator('.booking-close')).toBeFocused();
    await assertNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(session).toBeFocused();
    await expect(dialog.locator('img')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('November 2026');
  await expect(calendar.locator('[data-date="2026-11-01"]')).toHaveCSS('grid-column-start', '7');
  await expect(calendar.locator('[data-date="2026-11-06"] button')).toHaveCount(0);
  await expect(calendar.locator('[data-date="2026-11-07"] button')).toHaveAttribute('data-clinic', 'am-sino');
  await expect(calendar.locator('[data-date="2026-11-30"] button')).toHaveAttribute('data-clinic', 'am-sino');
  for (const [code, month, clinic] of [
    ['zh', '2026年11月', '美华丁香门诊部'], ['fr', 'novembre 2026', 'Am-Sino Ding Xiang Clinic'],
    ['de', 'November 2026', 'Am-Sino Ding Xiang Clinic'], ['es', 'noviembre de 2026', 'Am-Sino Ding Xiang Clinic'],
  ]) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(calendar).toHaveAttribute('open', '');
    await expect(page.locator('#calendar-month')).toHaveText(month);
    await calendar.locator('[data-date="2026-11-07"] button').click();
    await expect(page.locator('#booking-clinic')).toHaveText(clinic);
    await expect(dialog.locator('img')).toHaveAttribute('alt', await page.locator('.appointment-qr-frame img').first().getAttribute('alt'));
    await expect(dialog.locator('#booking-help')).not.toContainText('undefined');
    await assertNoOverflow(page);
    await dialog.locator('.booking-close').click();
  }
  await page.locator('[data-language="en"]').click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(calendar.locator('[data-date="2026-12-01"] button')).toHaveAttribute('data-clinic', 'parkway');
  await expect(calendar.locator('.calendar-session')).toHaveCount(11);
  await expect(calendar.locator('.calendar-year-end')).toHaveCount(0);
  await expect(calendar.locator('[data-date="2026-12-16"] button, [data-date="2026-12-31"] button')).toHaveCount(0);
  await calendar.locator('[data-date="2026-12-15"] button').click();
  await expect(page.locator('#booking-clinic')).toHaveText('Parkway MediCentre Xintiandi');
  await expect(page.locator('#booking-date')).toContainText('December 15, 2026');
  await expect(dialog.locator('img')).toHaveAttribute('src', await page.locator('.appointment-qr-frame img').nth(1).getAttribute('src'));
  await dialog.locator('.booking-close').click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('January 2027');
  await expect(calendar.locator('.calendar-session')).toHaveCount(0);
  await expect(calendar.locator('.calendar-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('December 2026');
  await page.reload();
  await expect(calendar).not.toHaveAttribute('open');
});

test('calendar month is based on Shanghai even when the visitor is in another time zone', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles', baseURL });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-10-31T17:00:00Z') });
    await page.goto('/');
    await expect(page.locator('#calendar-month')).toHaveText('November 2026');
  } finally { await context.close(); }
});

test('main navigation starts at each section edge in every language without changing calendar positioning', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const originalPadding = await page.locator('html').evaluate(el => getComputedStyle(el).scrollPaddingTop);
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    for (const id of ['care', 'about', 'work', 'locations']) {
      if (isMobile) await page.locator('.menu-toggle').click();
      await page.locator(`${isMobile ? '#mobile-nav' : '.desktop-nav'} a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator('html')).toHaveCSS('scroll-padding-top', '0px');
      await expect.poll(() => page.locator(`#${id}`).evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
      await expect(page.locator('#appointment-calendar')).not.toHaveAttribute('open');
    }
    await assertNoOverflow(page);
  }
  await page.reload();
  await waitForRenderedPage(page);
  // Reload keeps native fragment/history restoration; saved translations can
  // reflow after the browser restores the scroll position on a narrow screen.
  await expect(page).toHaveURL(/#locations$/);
  await expect(page.locator('html')).toHaveCSS('scroll-padding-top', '0px');
  await expect(page.locator('#locations-title')).toBeInViewport();
  await page.locator('.hero-actions [data-calendar-link]').click();
  await expect(page).toHaveURL(/#appointment-calendar$/);
  await expect(page.locator('html')).toHaveCSS('scroll-padding-top', originalPadding);
  await expect(page.locator('#appointment-calendar')).toHaveAttribute('open', '');
  await expect.poll(() => page.locator('#appointment-calendar').evaluate((el, padding) => Math.abs(el.getBoundingClientRect().top - parseFloat(padding)), originalPadding)).toBeLessThanOrEqual(1);
});

test('Find us navigation replaces the duplicate hero shortcut and the calendar opens in its new section', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const calendar = page.locator('.appointment-calendar');
  const shortcut = page.locator('.hero-actions [data-calendar-link]');
  await expect(shortcut.locator('[data-i18n="heroCalendarCta"]')).toHaveText('Booking');
  await expect(calendar).not.toHaveAttribute('open');
  await expect(calendar.locator('.details-toggle')).toHaveCount(0);
  await expect(calendar.locator('[data-i18n="calendarTitle"]')).toHaveText('Appointment calendar for Dr. Ferguson');
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    await expect(shortcut.locator('[data-i18n="heroCalendarCta"]')).toHaveText({ en: 'Booking', zh: '预约', fr: 'Prendre rendez-vous', de: 'Termin buchen', es: 'Pedir cita' }[code]);
    await expect(calendar.locator('[data-i18n="calendarTitle"]')).toContainText(code === 'zh' ? '吕明旭医生' : 'Ferguson');
    await expect(calendar).not.toHaveAttribute('open');
    await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('border-color', 'rgb(225, 137, 0)');
    await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('border-radius', '50%');
    await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('width', '40px');
    await expect(calendar.locator('.calendar-disclosure-icon')).toHaveCSS('height', '40px');
    await expect(calendar.locator('.calendar-disclosure-icon svg')).toHaveCSS('stroke', 'rgb(26, 45, 86)');
    await expect(calendar.locator('.calendar-disclosure-icon svg')).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
    await expect(calendar.locator('summary')).toHaveCSS('border-bottom-style', 'solid');
    const titleLayout = await calendar.locator('summary').evaluate(summary => ({
      arrow: summary.querySelector('.calendar-disclosure-icon').getBoundingClientRect().toJSON(),
      text: summary.querySelector('[data-i18n="calendarTitle"]').getBoundingClientRect().toJSON(),
    }));
    expect(titleLayout.arrow.left).toBeGreaterThan(titleLayout.text.right);
    expect(Math.abs(titleLayout.arrow.left - titleLayout.text.right - 14)).toBeLessThanOrEqual(1);
    await expect(calendar.locator('summary')).toHaveCSS('justify-content', 'flex-start');
    await expect(page.locator('.hero-actions a')).toHaveCount(1);
    await expect(page.locator('.hero-actions a .link-circle')).toHaveCount(1);
    await expect(page.locator('.hero-actions a svg use')).toHaveCount(1);
    expect(await page.locator('.hero-actions a').evaluateAll(elements => elements.map(element => element.getAttribute('href')))).toEqual(['#appointment-calendar']);
    await expect(page.locator('[data-i18n="heroLocationsCta"]')).toHaveCount(0);
    await expect(page.locator('.desktop-nav [data-i18n="navLocations"]')).toHaveText({ en: 'Find us', zh: '咨询地点', fr: 'Nous trouver', de: 'Standorte', es: 'Encuéntranos' }[code]);
    await expect(page.locator('[data-i18n="locationsEyebrow"]')).not.toContainText('03 /');
    await expect(page.locator('[data-i18n="workEyebrow"]')).not.toContainText('04 /');
    await expect(shortcut).toHaveAttribute('href', '#appointment-calendar');
    await expect(shortcut).toHaveCSS('border-bottom-style', 'none');
    await expect(shortcut.locator('.link-circle')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(shortcut.locator('.link-circle')).toHaveCSS('border-color', 'rgb(225, 137, 0)');
    await expect(shortcut.locator('.link-circle')).toHaveCSS('border-radius', '50%');
    await expect(shortcut.locator('svg')).toHaveCSS('stroke', 'rgb(26, 45, 86)');
    await expect(shortcut.locator('svg')).toHaveCSS('transform', 'none');
    await expect(shortcut.locator('[data-i18n="heroCalendarCta"]')).toHaveCSS('color', 'rgb(26, 45, 86)');
    await shortcut.hover();
    await expect(shortcut.locator('.link-circle')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const shortcutLayout = await shortcut.evaluate(link => ({
      arrow: link.querySelector('.link-circle').getBoundingClientRect().toJSON(),
      text: link.querySelector('[data-i18n="heroCalendarCta"]').getBoundingClientRect().toJSON(),
      height: link.getBoundingClientRect().height,
    }));
    expect(shortcutLayout.arrow.right).toBeLessThan(shortcutLayout.text.left);
    expect(shortcutLayout.height).toBeGreaterThanOrEqual(44);
    await assertNoOverflow(page);
  }
  if (isMobile) await page.locator('.menu-toggle').click();
  const locations = page.locator(`${isMobile ? '#mobile-nav' : '.desktop-nav'} a[href="#locations"]`);
  await locations.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#locations$/);
  await expect(page.locator('#locations-title')).toBeInViewport();
  await expect.poll(() => page.locator('#locations').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  await expect(calendar).not.toHaveAttribute('open');
  await shortcut.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#appointment-calendar$/);
  await expect(calendar).toHaveAttribute('open', '');
  await expect(calendar.locator('summary')).toBeFocused();
  await expect(calendar.locator('summary')).toBeInViewport();
  await expect(calendar.locator('summary')).toHaveCSS('outline-style', 'none');
  await expect(calendar.locator('summary .calendar-disclosure-icon')).toHaveCSS('outline-style', 'solid');
  await expect(calendar.locator('summary .calendar-disclosure-icon')).toHaveCSS('outline-width', '2px');
  await expect(calendar.locator('summary .calendar-disclosure-icon')).toHaveCSS('border-radius', '50%');
  await expect(calendar.locator('summary .calendar-disclosure-icon svg')).toHaveCSS('transform', 'matrix(0, -1, 1, 0, 0, 0)');
  const headingSpacing = await calendar.evaluate(element => ({
    summaryBottom: element.querySelector('summary').getBoundingClientRect().bottom,
    introTop: element.querySelector('.calendar-intro').getBoundingClientRect().top,
  }));
  expect(headingSpacing.introTop - headingSpacing.summaryBottom).toBeGreaterThanOrEqual(8);
  await page.reload();
  await expect(calendar).toHaveAttribute('open', '');
  await expect(calendar.locator('summary')).toBeInViewport();
  await calendar.locator('summary').click();
  await expect(calendar).not.toHaveAttribute('open');
  await shortcut.click();
  await expect(calendar).toHaveAttribute('open', '');
});

test('nine unnumbered service categories put hormone and menopause health first', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('#care-title')).toHaveText('Care that growswith you.');
  const cards = page.locator('#care .care-item');
  await expect(cards).toHaveCount(9);
  await expect(cards.locator('.care-number')).toHaveCount(0);
  if (isMobile) {
    const inset = await cards.first().evaluate(card => card.querySelector('h3').getBoundingClientRect().left - card.getBoundingClientRect().left);
    expect(inset, 'The old number gutter should not remain on mobile').toBe(0);
  }
  await expect(cards.locator('h3')).toHaveText([
    'Hormone & Menopause Health', 'Women’s Preventive Health', 'Gynecologic Care', 'Reproductive & Fertility Health',
    'Contraception & Family Planning', 'Sexual & Vulvovaginal Health', 'Adolescent Health',
    'Minimally Invasive Procedures', 'Pelvic Floor Health',
  ]);
  await expect(cards.locator('.care-list li')).toHaveText([
    'Perimenopause and menopause care', 'Hormone replacement therapy (HRT)',
    'Polyendocrine Metabolic Ovarian Syndrome (PMOS, formerly PCOS) and endocrine assessment', 'Hormone-related changes in mood, sleep and weight',
    'Bone density and bone health', 'Cardiovascular and menopause-related risk assessment',
    'Chronic conditions and hormone management', 'Weight and lifestyle medicine',
    'Cervical screening (HPV / TCT / colposcopy)', 'Menstrual disorders and endometrial disease',
    'Uterine fibroids, ovarian cysts and endometriosis', 'Vaginitis and vulvar skin conditions',
    'Fertility evaluation and management', 'Preconception planning and counseling',
    'Early pregnancy care (up to 12 weeks)', 'High risk pregnancy consultation', 'Fertility preservation',
    'Intrauterine devices (IUDs)', 'Contraceptive implants', 'Individualized contraceptive medication choices',
    'Sexual pain (dyspareunia and vaginismus)', 'Vulvar skin conditions (including lichen sclerosus)',
    'Genitourinary syndrome of menopause (GSM)', 'Menarche and puberty counseling',
    'Adolescent menstrual concerns', 'Sex education and contraceptive guidance',
    'Hysteroscopy', 'Laparoscopy', 'Minimally invasive management of fibroids and cysts',
    'Pelvic floor function assessment', 'Mild urinary incontinence', 'Postpartum pelvic floor rehabilitation',
  ]);
  for (const [index, count] of [4, 4, 4, 5, 3, 3, 3, 3, 3].entries()) {
    await expect(cards.nth(index).locator('li')).toHaveCount(count);
  }
  await expect(page.locator('#care')).not.toContainText(/egg[- ]freezing/i);
  const firstRow = await cards.evaluateAll(elements => elements.slice(0, 2).map(element => element.getBoundingClientRect().toJSON()));
  if (isMobile) expect(firstRow[1].top).toBeGreaterThanOrEqual(firstRow[0].bottom);
  else {
    expect(Math.abs(firstRow[0].top - firstRow[1].top)).toBeLessThan(1);
    expect(firstRow[1].left).toBeGreaterThan(firstRow[0].right);
  }
  await cards.nth(3).locator('summary').click();
  await expect(cards.nth(3).locator('[data-i18n="careHighRiskPregnancy"]')).toBeVisible();
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('#care-title')).toHaveText('陪伴每一个不同的你。');
  await expect(cards.locator('h3')).toHaveText([
    '激素与更年期', '女性长期健康', '妇科咨询', '生育与生殖', '避孕与家庭计划', '性健康与外阴阴道健康',
    '青少年女性健康', '微创手术咨询', '盆底健康',
  ]);
  await expect(cards.locator('.care-list li')).toHaveText([
    '围绝经期与绝经管理', '激素替代治疗（HRT）', '多内分泌代谢性卵巢综合征（PMOS，原称多囊卵巢综合征）与内分泌评估', '激素相关情绪、睡眠与体重变化',
    '骨密度与骨健康', '心血管与绝经风险评估', '慢性病与激素管理', '体重与生活方式医学',
    '宫颈筛查（HPV / TCT / 阴道镜）', '月经异常与子宫内膜疾病', '子宫肌瘤、卵巢囊肿、内膜异位症', '阴道炎、外阴皮肤病',
    '生育力评估与管理', '备孕与孕前咨询', '早孕管理（至 12 周）', '高危妊娠咨询', '生育力保护',
    '宫内节育器（IUD）', '皮下埋植', '药物避孕个体化选择',
    '性疼痛（性交痛、阴道痉挛）', '外阴皮肤病（硬化性苔藓等）', '绝经相关泌尿生殖综合征（GSM）',
    '初潮与青春期咨询', '青少年月经问题', '性教育与避孕指导',
    '宫腔镜', '腹腔镜', '肌瘤、囊肿微创管理', '盆底功能评估', '轻度尿失禁', '产后盆底康复',
  ]);
  await expect(page.locator('#care')).not.toContainText(/冷冻卵子|冻卵/);
  await expect(cards.nth(3).locator('[data-i18n="careHighRiskPregnancy"]')).toBeVisible();
  await assertNoOverflow(page);
});

test('service disclosures preserve their state across languages and support keyboard access', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const cards = page.locator('#care details.care-item');
  await expect(cards).toHaveCount(9);
  await expect(page.locator('#care details[open]')).toHaveCount(0);
  await expect(cards.first().locator('.care-list')).toBeHidden();
  const second = cards.nth(1);
  await expect(second.locator('.care-list')).toBeHidden();
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second.locator('.care-list')).toBeVisible();
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(second.locator('h3')).toHaveText('女性长期健康');
  await expect(second.locator('.care-list')).toBeVisible();
  await second.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(second.locator('.care-list')).toBeHidden();
  await expect(cards.first().locator('.care-list')).toBeHidden();
  await cards.first().locator('summary').click();
  await expect(cards.first().locator('.care-list')).toBeVisible();
  await page.locator('[data-language="en"]').click();
  await expect(cards.first().locator('.care-list')).toBeVisible();
  await cards.first().locator('summary').click();
  await expect(page.locator('#care details[open]')).toHaveCount(0);
});

test('section logos match Who We Are and replace numbers in every language', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const labels = page.locator('.section-label');
  await expect(labels).toHaveCount(4);
  const expectedSize = await page.evaluate(() => innerWidth <= 700 ? ['44px', '33px'] : ['52px', '39px']);
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    for (const label of await labels.all()) {
      const mark = label.locator('.section-label-mark');
      await expect(mark).toBeVisible();
      await expect(mark).toHaveAttribute('aria-hidden', 'true');
      await expect(mark).toHaveText('');
      await expect(mark).toHaveCSS('width', expectedSize[0]);
      await expect(mark).toHaveCSS('height', expectedSize[1]);
      await expect(mark).toHaveCSS('background-image', /\/assets\/ferguson-logo\.png/);
      await expect(label.locator('[data-i18n]')).not.toHaveText(/^0[1-4]\s*\//);
      const row = await label.evaluate(element => {
        const logo = element.querySelector('.section-label-mark').getBoundingClientRect();
        const text = element.querySelector('[data-i18n]').getBoundingClientRect();
        return { gap: text.left - logo.right, centerDifference: Math.abs(logo.top + logo.height / 2 - text.top - text.height / 2) };
      });
      expect(row.gap).toBeGreaterThanOrEqual(12);
      expect(row.centerDifference).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('.hero .team-flower')).toHaveCSS('width', expectedSize[0]);
    await expect(page.locator('.hero .team-flower')).toHaveCSS('height', expectedSize[1]);
    const aboutAlignment = await page.locator('#about').evaluate(section => ({
      labelLeft: section.querySelector('.about-section-label').getBoundingClientRect().left,
      contentLeft: section.querySelector('.about-grid').getBoundingClientRect().left,
      labelPrecedesGrid: Boolean(section.querySelector('.about-section-label').compareDocumentPosition(section.querySelector('.about-grid')) & Node.DOCUMENT_POSITION_FOLLOWING),
    }));
    expect(Math.abs(aboutAlignment.labelLeft - aboutAlignment.contentLeft)).toBeLessThanOrEqual(1);
    expect(aboutAlignment.labelPrecedesGrid).toBe(true);
    await assertNoOverflow(page);
  }
});

test('the single-column doctor heading aligns left while the portrait and readable prose retain their original widths', async ({ page }) => {
  await page.setViewportSize({ width: 897, height: 900 });
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${code}"]`).click();
    const layout = await page.locator('#about').evaluate(section => {
      const box = selector => section.querySelector(selector).getBoundingClientRect();
      const grid = box('.about-grid');
      const title = box('.section-heading');
      const label = box('.about-section-label');
      const portrait = box('.about-portrait');
      const copy = box('.about-copy');
      return { left: grid.left, titleLeft: title.left, labelLeft: label.left,
        center: grid.left + grid.width / 2,
        portraitCenter: portrait.left + portrait.width / 2, portraitWidth: portrait.width,
        copyCenter: copy.left + copy.width / 2, copyWidth: copy.width };
    });
    expect(Math.abs(layout.titleLeft - layout.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.labelLeft - layout.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.portraitCenter - layout.center)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.copyCenter - layout.center)).toBeLessThanOrEqual(1);
    expect(layout.portraitWidth).toBe(430);
    expect(layout.copyWidth).toBe(640);
    await assertNoOverflow(page);
  }
});

test('section colors and decorative marks use the local brand and platform assets', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('#care')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
  await expect(page.locator('#about')).toHaveCSS('background-color', 'rgb(248, 247, 243)');
  await expect(page.locator('#work')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
  await expect(page.locator('#connect')).toHaveCSS('background-color', 'rgb(248, 247, 243)');
  await expect(page.locator('use[href="#flower"], use[href="#sprig"], .tiny-star')).toHaveCount(0);
  const marks = page.locator('.brand-mark');
  await expect(marks).toHaveCount(6);
  for (const mark of await marks.all()) {
    await expect(mark).toHaveCSS('background-image', /\/assets\/ferguson-logo\.png/);
  }
  await expect(page.locator('.hero-copy .pearl-mark')).toHaveCount(0);
  await expect(page.locator('[data-i18n="heroEyebrow"], .practice-description')).toHaveCount(0);
  await expect(page.locator('.hero-copy .brand-mark')).toHaveCount(0);
  const icons = page.locator('.connected-profile .social-icon');
  await expect(icons).toHaveCount(3);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveCSS('background-image', /\/assets\/social-(xiaohongshu|facebook|instagram)\.svg/);
  }
});

test('hero stays free of a shell background while other shell decorations and the official slogan are retained', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const heroDecoration = await page.locator('.hero').evaluate(section => {
    const style = getComputedStyle(section, '::before');
    return { content: style.content, background: style.backgroundImage };
  });
  expect(heroDecoration).toEqual({ content: 'none', background: 'none' });
  const decoration = await page.locator('#care').evaluateAll(sections => sections.map(section => {
    const style = getComputedStyle(section, '::before');
    return { background: style.backgroundImage, pointerEvents: style.pointerEvents, opacity: Number(style.opacity), zIndex: style.zIndex };
  }));
  expect(decoration).toHaveLength(1);
  await expect(page.locator('#connect')).toHaveCSS('display', 'block');
  expect(await page.locator('#connect').evaluate(section => getComputedStyle(section, '::before').display)).toBe('none');
  for (const item of decoration) {
    expect(item.background).toMatch(/\/assets\/shell-and-pearl\.svg/);
    expect(item.pointerEvents).toBe('none');
    expect(item.zIndex).toBe('-1');
    expect(item.opacity).toBeGreaterThan(0);
    expect(item.opacity).toBeLessThanOrEqual(0.2);
    const url = item.background.match(/url\("([^\"]+)"\)/)[1];
    const response = await page.request.get(url);
    expect(response.ok(), 'The local shell background asset should load').toBeTruthy();
  }
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('[data-language-switch]').click();
    await expect(page.locator('[data-i18n="footerMessage"]')).toHaveText('Because We Care');
    await expect(page.locator('[data-i18n="footerMessage"]')).toHaveAttribute('lang', 'en');
    await assertNoOverflow(page);
  }
});

test('team panel stays light and the doctor introduction uses our own voice without a Parkway promotion', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('.hero-team')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('a[href*="parkwayshanghai.com"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="profileLink"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="aboutPhilosophy"]')).toHaveCount(0);
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('[data-i18n="aboutPhilosophy"]')).toHaveCount(0);
  await expect(page.locator('#about')).not.toContainText('查看官方医生简介');
  await assertNoOverflow(page);
});

test('the removed subtitle stays absent and all languages share the approved life-stage design', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const code of ['en', 'zh', 'fr', 'de', 'es']) {
      await page.locator(`[data-language="${code}"]`).click();
      await expect(page.locator('.practice-description, [data-i18n="heroEyebrow"]')).toHaveCount(0);
      const heroOrder = await page.locator('.hero-copy').evaluate(element => [...element.children].map(child => child.id || child.className));
      expect(heroOrder).toEqual(['hero-actions', 'hero-title', 'hero-life']);
      const bookingPosition = await page.locator('.hero-copy').evaluate(element => ({
        booking: element.querySelector('.hero-actions').getBoundingClientRect().toJSON(),
        title: element.querySelector('#hero-title').getBoundingClientRect().toJSON(),
        headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom,
      }));
      expect(bookingPosition.booking.bottom).toBeLessThan(bookingPosition.title.top);
      expect(bookingPosition.booking.left).toBe(bookingPosition.title.left);
      expect(bookingPosition.booking.top).toBeGreaterThanOrEqual(bookingPosition.headerBottom);
      const scale = await page.locator('.hero').evaluate(element => ({
        life: getComputedStyle(element.querySelector('.hero-life')).fontSize,
        care: getComputedStyle(document.querySelector('#care-title')).fontSize,
      }));
      expect(parseFloat(scale.life)).toBeCloseTo(parseFloat(scale.care) * .9, 2);
      await expect(page.locator('.hero-life')).toHaveCSS('color', 'rgb(97, 113, 143)');
      await expect(page.locator('.hero-life em')).toHaveCSS('color', 'rgb(97, 113, 143)');
      await expect(page.locator('.hero-life br')).toHaveCSS('display', 'none');
      await expect(page.locator('.hero-life em')).toHaveCSS('white-space', 'nowrap');
      const endingPosition = await page.locator('.hero-life').evaluate(element => ({
        right: element.querySelector('em').getBoundingClientRect().right,
        containerRight: element.getBoundingClientRect().right,
      }));
      expect(endingPosition.right).toBeLessThanOrEqual(endingPosition.containerRight + 1);
      await expect(page.locator('.hero-life')).toContainText(code === 'zh' ? '关爱人生的' : { en: 'for every chapter', fr: 'À chaque étape', de: 'Für jede Phase', es: 'Para cada etapa' }[code]);
      await assertNoOverflow(page);
    }
  }
});

test('English life-stage message shares one line when it fits and wraps the complete italic phrase', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  await page.locator('[data-language="en"]').click();
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const message = page.locator('.hero-life');
    await expect(message).toHaveText('for every chapter of your life.');
    await expect(message).toHaveCSS('font-style', 'italic');
    await expect(message.locator('br')).toHaveCSS('display', 'none');
    await expect(message.locator('em')).toHaveText('of your life.');
    await expect(message.locator('em')).toHaveCSS('white-space', 'nowrap');
    await expect(message.locator('em')).toHaveCSS('font-style', 'italic');
    const layout = await message.evaluate(element => {
      const opening = document.createRange();
      opening.selectNodeContents(element.firstChild);
      return {
        opening: opening.getBoundingClientRect().toJSON(),
        ending: element.querySelector('em').getBoundingClientRect().toJSON(),
        message: element.getBoundingClientRect().toJSON(),
      };
    });
    expect(layout.ending.right).toBeLessThanOrEqual(layout.message.right + 1);
    if (width >= 768) expect(layout.ending.top).toBeLessThan(layout.opening.bottom);
    else expect(layout.ending.top).toBeGreaterThan(layout.opening.top + layout.opening.height / 2);
    await assertNoOverflow(page);
  }
});

test('practice name and life-stage headings retain the approved type hierarchy and readable labels', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const englishBrandFamily = await page.locator('#hero-title').evaluate(element => getComputedStyle(element).fontFamily);
  expect(englishBrandFamily).toMatch(/^Cormorant,/);
  const labels = page.locator('[data-i18n="aboutEyebrow"], [data-i18n="careEyebrow"], [data-i18n="workEyebrow"], [data-i18n="locationsEyebrow"]');
  await expect(labels).toHaveCount(4);
  for (const language of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${language}"]`).click();
    for (const label of await labels.all()) {
      await expect(label).toHaveCSS('font-size', '14px');
    }
    const taglineSize = await page.locator('.hero-life').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    const careSize = await page.locator('#care-title').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(taglineSize).toBeCloseTo(careSize * .9, 2);
    const headingFamilies = await page.locator('#hero-title, #care-title').evaluateAll(elements => elements.map(element => getComputedStyle(element).fontFamily));
    expect(headingFamilies[0]).toBe(englishBrandFamily);
    await expect(page.locator('#hero-title span')).toHaveCSS('font-family', englishBrandFamily);
    if (language === 'zh') expect(headingFamilies[1]).toContain('Songti SC');
    else expect(headingFamilies[0]).toBe(headingFamilies[1]);
    await expect(page.locator('.hero h1')).toHaveCSS('font-style', 'normal');
    await expect(page.locator('.hero h1')).toHaveCSS('font-weight', '400');
    await expect(page.locator('.hero-life br')).toHaveCount(1);
    await expect(page.locator('.hero-life em')).toHaveCount(1);
    await expect(page.locator('.hero-bottom a')).toHaveCount(0);
    await assertNoOverflow(page);
  }
});

test('shared copy and action sizes stay readable in all five languages', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const language of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${language}"]`).click();
    for (const selector of [
      '.hero-intro', '.purpose-details summary', '.profile-identity > p',
      '.profile-details summary', '.practice address', '.practice-phone a',
      '.connected-grid .wechat-contact h3', '.plus-details summary',
      '.hero-actions .text-link',
    ]) {
      for (const element of await page.locator(selector).all()) {
        await expect(element).toHaveCSS('font-size', '15px');
      }
    }
    await expect(page.locator('.appointment-code figcaption').first()).toHaveCSS('font-size', '13px');
    if (isMobile) {
      const clinics = page.locator('.calendar-clinic');
      await expect(clinics.first()).toHaveCSS('font-size', '12px');
      for (const clinic of await clinics.all()) {
        expect(language === 'zh' ? ['美华', '百汇'] : ['Am-Sino', 'Parkway']).toContain(await clinic.textContent());
        expect(await clinic.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      }
    }
    await assertNoOverflow(page);
  }
});

test('header navigation keeps readable type in all five languages', async ({ page, isMobile }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const language of ['en', 'zh', 'fr', 'de', 'es']) {
    await page.locator(`[data-language="${language}"]`).click();
    await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 243)');
    for (const button of await page.locator('.language-switch').all()) {
      await expect(button).toHaveCSS('font-size', '15px');
    }
    if (isMobile) {
      const menu = page.locator('button[aria-controls="mobile-nav"]');
      await menu.click();
      await expect(page.locator('#mobile-nav')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
      for (const link of await page.locator('#mobile-nav a').all()) {
        await expect(link).toBeVisible();
        await expect(link).toHaveCSS('font-size', '16px');
      }
      await assertNoOverflow(page);
      await menu.click();
    } else {
      for (const link of await page.locator('.desktop-nav a, .contact-link').all()) {
        await expect(link).toBeVisible();
        await expect(link).toHaveCSS('font-size', '15px');
      }
    }
    await assertNoOverflow(page);
  }
});

test('Ferguson Plus has a compact local logo, bilingual group information and its own website link', async ({ page }) => {
  await page.goto('/');
  await waitForRenderedPage(page);
  const card = page.locator('.plus-feature');
  await expect(card.locator('h3')).toHaveText('Ferguson Plus');
  await expect(card.locator('img')).toHaveCount(1);
  const logo = card.locator('.plus-logo');
  await expect(logo).toHaveAttribute('alt', 'Ferguson Plus logo');
  const image = await logo.evaluate(element => ({
    origin: new URL(element.src).origin,
    pageOrigin: location.origin,
    loaded: element.complete && element.naturalWidth > 0,
    width: element.getBoundingClientRect().width,
  }));
  expect(image.origin).toBe(image.pageOrigin);
  expect(image.loaded).toBe(true);
  expect(image.width).toBeLessThanOrEqual(88);
  await expect(card.locator('.plus-intro')).toContainText('brought together by Dr. Ferguson');
  await expect(card.locator('[data-i18n="plusBody"]')).toHaveCount(0);
  const details = card.locator('.plus-details');
  const summary = details.locator('summary');
  await expect(details).not.toHaveAttribute('open');
  await expect(card.locator('.plus-specialties')).not.toBeVisible();
  await expect(card.locator('.plus-values')).not.toBeVisible();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(card.locator('.plus-specialties')).toBeVisible();
  await expect(card.locator('.plus-specialties')).toContainText('Physical therapy');
  await expect(card.locator('.plus-values li')).toHaveText([
    'Compassion Across Cultures', 'Science with Understanding', 'Shared Health Journey',
  ]);
  const link = card.getByRole('link', { name: 'Visit Ferguson Plus' });
  await expect(link).toHaveAttribute('href', 'https://www.theplushealth.org/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await page.locator('[data-language-switch]').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(card.locator('.plus-intro')).toHaveText('由吕医生与多位医学专业人士共同组织的多学科医疗健康团体。');
  await expect(card.locator('.plus-specialties')).toContainText('物理治疗');
  await expect(card.locator('.plus-values li')).toHaveText([
    '跨文化的深度关怀', '科学与洞察并行', '健康旅程的同行者',
  ]);
  await expect(card.getByRole('link', { name: '了解 Ferguson Plus' })).toHaveAttribute('href', 'https://www.theplushealth.org/');
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(details).not.toHaveAttribute('open');
  await expect(card.locator('.plus-values')).not.toBeVisible();
  await assertNoOverflow(page);
  await page.locator('[data-language="en"]').click();
  await expect(card.locator('.plus-intro')).toContainText('brought together by Dr. Ferguson');
  await assertNoOverflow(page);
});

test('navigation reaches contact and mobile menu closes on selection and Escape', async ({ page, isMobile }) => {
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
  await page.route('**/assets/dr-ferguson-light-grey.jpg', route => route.fulfill({ status: 404, body: 'missing image' }));
  await page.goto('/');
  const failures = await brokenImages(page);
  expect(failures.some(source => source.endsWith('/dr-ferguson-light-grey.jpg'))).toBe(true);
});

test('live layout readiness waits for a delayed stylesheet before checking mobile overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Reproduces the mobile deployment check.');
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
