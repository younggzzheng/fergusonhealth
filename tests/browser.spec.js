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

test('doctor biography retains the supplied role and clinical focus with accessible expanded training', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('.profile-name')).toHaveText('Dr. Michelle Lu-Ferguson, MD, FACOG');
  await expect(page.locator('.profile-role')).toHaveText('Founder & President, Ferguson Women’s Health');
  await expect(page.locator('[data-i18n="aboutBody"]')).toContainText('decades of clinical experience across the United States and China');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('PMOS (Polyendocrine Metabolic Ovarian Syndrome)');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('complex and high-risk prenatal situations');
  await expect(page.locator('[data-i18n="aboutPractice"]')).toContainText('English and Mandarin');
  const details = page.locator('.profile-details');
  const summary = details.locator('summary');
  await expect(details).not.toHaveAttribute('open');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('[data-i18n="profileTraining"]')).toBeVisible();
  for (const institution of ['Peking University', 'Peking Union Medical College', 'New York University', 'Ohio University College of Medicine', 'Rutgers Robert Wood Johnson Medical School']) {
    await expect(details.locator('[data-i18n="profileTraining"]')).toContainText(institution);
  }
  await expect(details.locator('[data-i18n="profileSurgery"]')).toContainText('hysteroscopy and laparoscopy');
  await page.locator('[data-language-switch]').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('.profile-name')).toHaveText('吕明旭医生，MD, FACOG');
  await expect(page.locator('.profile-role')).toHaveText('Ferguson Women’s Health 创始人兼总裁');
  await expect(page.locator('[data-i18n="aboutBody2"]')).toContainText('复杂及高危孕期情况');
  await expect(details.locator('[data-i18n="profileTraining"]')).toContainText('俄亥俄大学医学院');
  await expect(details.locator('[data-i18n="profileSurgery"]')).toContainText('宫腔镜与腹腔镜');
  await assertNoOverflow(page);
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(details).not.toHaveAttribute('open');
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('.profile-role')).toHaveText('Founder & President, Ferguson Women’s Health');
  await assertNoOverflow(page);
});

test('team introduction keeps the hero headline and moves the portrait to the doctor profile', async ({ page, isMobile }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('#hero-title')).toHaveText('For every chapterof your life.');
  await expect(page.locator('.hero .doctor-photo')).toHaveCount(0);
  await expect(page.locator('.hero-who-title')).toHaveText('Who We Are');
  await expect(page.locator('.hero-intro')).toHaveText('We are a women’s health team committed to clear communication, evidence-based care, and long-term support.');
  await expect(page.locator('.purpose-item h2')).toHaveText(['Mission', 'Vision']);
  await expect(page.locator('.purpose-item p')).toHaveText([
    'To provide reliable, evidence-based care that helps every woman understand her body and make confident health decisions.',
    'Bringing international standards of women’s healthcare to every woman, supporting her health and quality of life.',
  ]);
  const portrait = page.locator('#about .doctor-photo');
  await expect(portrait).toHaveCount(1);
  await expect(page.locator('.doctor-photo')).toHaveCount(1);
  await portrait.scrollIntoViewIfNeeded();
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#about .about-portrait figcaption span')).toHaveText(['Dr. Michelle Lu-Ferguson', 'Obstetrics & Gynaecology']);
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
  await expect(page.locator('#hero-title')).toHaveText('关爱人生的每一个阶段。');
  await expect(page.locator('.hero-who-title')).toHaveText('我们是谁');
  await expect(page.locator('.hero-intro')).toHaveText('我们是一支专注女性健康的团队，以清晰沟通、科学诊疗和长期陪伴为核心。');
  await expect(page.locator('.purpose-item h2')).toHaveText(['使命', '愿景']);
  await expect(page.locator('.purpose-item p')).toHaveText([
    '以科学、可信赖的方式，帮助每位女性更好地了解自己，做出清晰而自信的健康选择。',
    '以国际标准的诊疗体系，让每位女性拥有更健康、更有力量的生活。',
  ]);
  await expect(page.locator('#about .about-portrait figcaption span')).toHaveText(['吕明旭医生', '妇产科']);
  await assertNoOverflow(page);
});

test('balanced team panel leads to services before the doctor profile', async ({ page, isMobile }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  expect(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.id || 'hero')))
    .toEqual(['hero', 'care', 'about', 'work', 'contact']);
  for (const navigation of ['.desktop-nav', '#mobile-nav']) {
    expect(await page.locator(`${navigation} a`).evaluateAll(links => links.map(link => link.getAttribute('href'))))
      .toEqual(navigation === '.desktop-nav' ? ['#care', '#about', '#work'] : ['#care', '#about', '#work', '#contact']);
  }
  await expect(page.locator('.hero-team .hero-who-title')).toHaveText('Who We Are');
  await expect(page.locator('.hero-team .purpose-item')).toHaveCount(2);
  const arrangement = await page.locator('.hero').evaluate(hero => ({
    copy: hero.querySelector('.hero-copy').getBoundingClientRect().toJSON(),
    panel: hero.querySelector('.hero-team').getBoundingClientRect().toJSON(),
  }));
  if (isMobile) expect(arrangement.panel.top).toBeGreaterThan(arrangement.copy.bottom);
  else expect(arrangement.panel.left).toBeGreaterThan(arrangement.copy.right);
  await expect(page.locator('[data-i18n="careEyebrow"]')).toHaveText('01 / Areas of care');
  await expect(page.locator('[data-i18n="aboutEyebrow"]')).toHaveText('02 / Meet Dr. Ferguson');
  await expect(page.locator('.hero .text-link')).toHaveAttribute('href', '#care');
  await page.locator('.hero .text-link').click();
  await expect(page).toHaveURL(/#care$/);
  await expect(page.locator('#care')).toBeInViewport();
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('[data-i18n="careEyebrow"]')).toHaveText('01 / 诊疗领域');
  await expect(page.locator('[data-i18n="aboutEyebrow"]')).toHaveText('02 / 认识吕医生');
  await expect(page.locator('[data-i18n="heroCta"]')).toHaveText('了解我们的诊疗服务');
  await assertNoOverflow(page);
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

test('supplied social account names appear below the official WeChat code', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  const social = page.locator('.social-profiles');
  await expect(social.locator('dd')).toHaveText([
    '@Ferguson健康咨询上海', '@FergusonHealth_SH', '@FergusonHealth_SH',
  ]);
  await expect(social.locator('a')).toHaveCount(0);
  await expect(social.locator('dt')).toHaveText(['Xiaohongshu · 小红书', 'Facebook', 'Instagram']);
  const position = await page.locator('.wechat-and-social').evaluate(group => ({
    qrBottom: group.querySelector('.wechat-contact').getBoundingClientRect().bottom,
    socialTop: group.querySelector('.social-profiles').getBoundingClientRect().top,
  }));
  expect(position.socialTop).toBeGreaterThan(position.qrBottom);
  await page.locator('[data-language-switch]').click();
  await expect(social.locator('h3')).toHaveText('关注我们');
  await expect(social.locator('dt')).toHaveText(['小红书', 'Facebook', 'Instagram']);
  await assertNoOverflow(page);
});

test('nine unnumbered service categories put hormone and menopause health first', async ({ page, isMobile }) => {
  await authenticate(page);
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
    'Hormone & Menopause Health', 'Gynecologic Care', 'Reproductive & Fertility Health',
    'Contraception & Family Planning', 'Sexual & Vulvovaginal Health', 'Adolescent Health',
    'Minimally Invasive Surgery', 'Pelvic Floor Health', 'Women’s Preventive Health',
  ]);
  await expect(cards.locator('.care-list li')).toHaveText([
    'Perimenopause and menopause care', 'Hormone replacement therapy (HRT)',
    'Polyendocrine Metabolic Ovarian Syndrome (PMOS, formerly PCOS) and endocrine assessment', 'Hormone-related changes in mood, sleep and weight',
    'Cervical screening (HPV / TCT / colposcopy)', 'Menstrual disorders and endometrial disease',
    'Uterine fibroids, ovarian cysts and endometriosis', 'Vaginitis and vulvar skin conditions',
    'Fertility assessment (AMH and ovarian reserve)', 'Preconception planning and counseling',
    'Early pregnancy care (up to 12 weeks)', 'High risk pregnancy consultation', 'Fertility preservation',
    'Intrauterine devices (IUDs)', 'Contraceptive implants', 'Individualized contraceptive medication choices',
    'Sexual pain (dyspareunia and vaginismus)', 'Vulvar skin conditions (including lichen sclerosus)',
    'Genitourinary syndrome of menopause (GSM)', 'Menarche and puberty counseling',
    'Adolescent menstrual concerns', 'Sex education and contraceptive guidance',
    'Hysteroscopy', 'Laparoscopy', 'Minimally invasive management of fibroids and cysts',
    'Pelvic floor function assessment', 'Mild urinary incontinence', 'Postpartum pelvic floor rehabilitation',
    'Bone density and bone health', 'Cardiovascular and menopause-related risk assessment',
    'Chronic conditions and hormone management', 'Weight and lifestyle medicine',
  ]);
  for (const [index, count] of [4, 4, 5, 3, 3, 3, 3, 3, 4].entries()) {
    await expect(cards.nth(index).locator('li')).toHaveCount(count);
  }
  await expect(page.locator('#care')).not.toContainText(/egg[- ]freezing/i);
  await cards.nth(2).locator('summary').click();
  await expect(cards.nth(2).locator('[data-i18n="careHighRiskPregnancy"]')).toBeVisible();
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('#care-title')).toHaveText('陪伴每一个不同的你。');
  await expect(cards.locator('h3')).toHaveText([
    '激素与更年期', '妇科诊疗', '生育与生殖', '避孕与家庭计划', '性健康与外阴阴道',
    '青少年女性健康', '微创妇科手术', '盆底健康', '女性长期健康',
  ]);
  await expect(cards.locator('.care-list li')).toHaveText([
    '围绝经期与绝经管理', '激素替代治疗（HRT）', '多内分泌代谢性卵巢综合征（PMOS，原称多囊卵巢综合征）与内分泌评估', '激素相关情绪、睡眠与体重变化',
    '宫颈筛查（HPV / TCT / 阴道镜）', '月经异常与子宫内膜疾病', '子宫肌瘤、卵巢囊肿、内膜异位症', '阴道炎、外阴皮肤病',
    '生育力评估（AMH、卵巢储备）', '备孕与孕前咨询', '早孕管理（至 12 周）', '高危妊娠咨询', '生育力保护',
    '宫内节育器（IUD）', '皮下埋植', '药物避孕个体化选择',
    '性疼痛（性交痛、阴道痉挛）', '外阴皮肤病（硬化性苔藓等）', '绝经相关泌尿生殖综合征（GSM）',
    '初潮与青春期咨询', '青少年月经问题', '性教育与避孕指导',
    '宫腔镜', '腹腔镜', '肌瘤、囊肿微创管理', '盆底功能评估', '轻度尿失禁', '产后盆底康复',
    '骨密度与骨健康', '心血管与绝经风险评估', '慢性病与激素管理', '体重与生活方式医学',
  ]);
  await expect(page.locator('#care')).not.toContainText(/冷冻卵子|冻卵/);
  await expect(cards.nth(2).locator('[data-i18n="careHighRiskPregnancy"]')).toBeVisible();
  await assertNoOverflow(page);
});

test('service disclosures preserve their state across languages and support keyboard access', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  const cards = page.locator('#care details.care-item');
  await expect(cards).toHaveCount(9);
  await expect(page.locator('#care details[open]')).toHaveCount(1);
  await expect(cards.first().locator('.care-list')).toBeVisible();
  const second = cards.nth(1);
  await expect(second.locator('.care-list')).toBeHidden();
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second.locator('.care-list')).toBeVisible();
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(second.locator('h3')).toHaveText('妇科诊疗');
  await expect(second.locator('.care-list')).toBeVisible();
  await second.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(second.locator('.care-list')).toBeHidden();
  await expect(cards.first().locator('.care-list')).toBeVisible();
});

test('section colors and decorative marks use the local brand and platform assets', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('#care')).toHaveCSS('background-color', 'rgb(237, 242, 248)');
  await expect(page.locator('#about')).toHaveCSS('background-color', 'rgb(245, 238, 229)');
  await expect(page.locator('#work')).toHaveCSS('background-color', 'rgb(240, 237, 244)');
  await expect(page.locator('#contact')).toHaveCSS('background-color', 'rgb(234, 242, 239)');
  await expect(page.locator('use[href="#flower"], use[href="#sprig"], .tiny-star')).toHaveCount(0);
  const marks = page.locator('.brand-mark');
  await expect(marks).toHaveCount(5);
  for (const mark of await marks.all()) {
    await expect(mark).toHaveCSS('background-image', /\/assets\/ferguson-logo\.png/);
  }
  const icons = page.locator('.social-profiles .social-icon');
  await expect(icons).toHaveCount(3);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveCSS('background-image', /\/assets\/social-(xiaohongshu|facebook|instagram)\.svg/);
  }
});

test('shell and pearl backgrounds stay decorative and the official slogan is retained in both languages', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  const decoration = await page.locator('.hero, #care, #contact').evaluateAll(sections => sections.map(section => {
    const style = getComputedStyle(section, '::before');
    return { background: style.backgroundImage, pointerEvents: style.pointerEvents, opacity: Number(style.opacity), zIndex: style.zIndex };
  }));
  expect(decoration).toHaveLength(3);
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
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  await expect(page.locator('.hero-team')).toHaveCSS('background-color', 'rgb(246, 244, 239)');
  await expect(page.locator('a[href*="parkwayshanghai.com"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="profileLink"]')).toHaveCount(0);
  await expect(page.locator('[data-i18n="aboutPhilosophy"]')).toHaveText('At Ferguson Health, we make space for your questions, explain your options clearly, and support you through each stage of life.');
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(page.locator('[data-i18n="aboutPhilosophy"]')).toHaveText('在 Ferguson Health，我们认真倾听您的疑问，清晰解释诊疗选择，陪伴您走过人生的不同阶段。');
  await expect(page.locator('#about')).not.toContainText('查看官方医生简介');
  await assertNoOverflow(page);
});

test('main section labels stay readable in both languages', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  const labels = page.locator('.hero-copy .eyebrow, [data-i18n="aboutEyebrow"], [data-i18n="careEyebrow"], [data-i18n="workEyebrow"], [data-i18n="contactEyebrow"], [data-i18n="locationsTitle"]');
  await expect(labels).toHaveCount(6);
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('[data-language-switch]').click();
    for (const label of await labels.all()) {
      await expect(label).toHaveCSS('font-size', '14px');
    }
    await assertNoOverflow(page);
  }
});

test('header navigation keeps readable type in both languages', async ({ page, isMobile }) => {
  await authenticate(page);
  await page.goto('/');
  await waitForRenderedPage(page);
  for (const language of ['en', 'zh-CN']) {
    if (language === 'zh-CN') await page.locator('[data-language-switch]').click();
    await expect(page.locator('.language-switch')).toHaveCSS('font-size', '15px');
    if (isMobile) {
      const menu = page.locator('button[aria-controls="mobile-nav"]');
      await menu.click();
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
  await authenticate(page);
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
  await expect(card.locator('.plus-specialties')).toContainText('Physical therapy');
  await expect(card.locator('.plus-values li')).toHaveText([
    'Compassion Across Cultures', 'Science with Understanding', 'Shared Health Journey',
  ]);
  const link = card.getByRole('link', { name: 'Visit Ferguson Plus' });
  await expect(link).toHaveAttribute('href', 'https://www.theplushealth.org/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await page.locator('[data-language-switch]').click();
  await expect(card.locator('.plus-intro')).toHaveText('由吕医生与多位医学专业人士共同组织的多学科医疗健康团体。');
  await expect(card.locator('.plus-specialties')).toContainText('物理治疗');
  await expect(card.locator('.plus-values li')).toHaveText([
    '跨文化的深度关怀', '科学与洞察并行', '健康旅程的同行者',
  ]);
  await expect(card.getByRole('link', { name: '了解 Ferguson Plus' })).toHaveAttribute('href', 'https://www.theplushealth.org/');
  await assertNoOverflow(page);
  await page.locator('[data-language-switch]').click();
  await expect(card.locator('.plus-intro')).toContainText('brought together by Dr. Ferguson');
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
