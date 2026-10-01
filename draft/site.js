(() => {
  'use strict';
  const translations = {
    en: {},
    zh: {
      skip: '跳转到正文', brand: '女性健康', navAbout: '认识吕医生', navCare: '诊疗领域', navWork: '专业经历', navContact: '联系咨询',
      heroEyebrow: '用心了解，关爱女性健康', heroTitle: '关爱人生的<br><em>每一个阶段。</em>',
      heroIntro: '认识吕明旭医生（Dr. Michelle Lu-Ferguson）。以近30年的临床经验和个体化的照护理念，在上海关爱女性健康。', heroCta: '了解吕医生',
      heroName: '吕明旭医生 · MD, FACOG', heroLocation: '中国 · 上海', portraitName: '吕明旭医生', portraitDetail: '妇产科', heroBottom: '专业、关怀，以及多一份理解。',
      aboutEyebrow: '01 / 认识吕医生', aboutTitle: '医生。<br>倾听者。<br><em>健康路上的同行者。</em>', aboutLead: '好的照护，从倾听开始。',
      aboutBody: '吕明旭医生是一位在上海执业的妇科医生，拥有医学博士学位，并在罗格斯大学罗伯特伍德约翰逊医学院完成住院医师培训。',
      aboutBody2: '她的经历涵盖临床诊疗、医学教育及女性健康领域的管理工作。目前在上海百汇医疗新天地门诊部执业，可使用英语和普通话交流。', profileLink: '查看官方医生简介', signatureDetail: 'MD, FACOG · 妇产科',
      careEyebrow: '02 / 诊疗领域', careTitle: '陪伴每一个<br><em>不同的你。</em>', careIntro: '每一个人生阶段，都有新的疑问。留一些时间，听您慢慢说。',
      care1Title: '妇科健康', care1Body: '常见妇科疾病与微创手术，关注每一位女性的个体化需求。', care2Title: '激素与更年期健康', care2Body: '关注更年期与激素变化，包括卵巢功能及内分泌健康。', care3Title: '盆底与性健康', care3Body: '关注盆底及泌尿问题、性健康与女性私密健康。',
      care4Title: '青少年健康', care4Body: '为年轻女性提供妇科照护，耐心解答疑问，理解成长中的变化。',
      workEyebrow: '03 / 专业经历', workTitle: '以经验积累，<br><em>践行关怀。</em>', workLead: '关爱女性，也分享专业知识。', workBody: '在临床工作之外，吕医生也曾承担医学生教学、住院医师培训及临床研究工作，将患者照护与下一代医生的培养相结合。', workFeatureType: '官方医生简介', workFeatureTitle: '认识吕明旭医生', workSource: '上海百汇医疗',
      contactEyebrow: '从这里开始', contactTitle: '下一步，<br><em>我们一起走。</em>', contactBody: '如需了解最新的执业信息与预约方式，请访问吕医生的官方医生简介页面。', contactCta: '执业与联系信息', footerMessage: '用心关怀，真诚相伴。', backTop: '返回顶部', previewNote: '内部设计预览 · 内容待审核', lockPreview: '锁定预览'
    }
  };
  const translatedElements = [...document.querySelectorAll('[data-i18n], [data-i18n-html]')];
  translatedElements.forEach(element => {
    const key = element.dataset.i18n || element.dataset.i18nHtml;
    translations.en[key] = element.dataset.i18nHtml ? element.innerHTML : element.textContent;
  });
  let language = 'en';
  try { if (localStorage.getItem('ferguson-language') === 'zh') language = 'zh'; } catch (_) { /* Storage may be disabled. */ }
  const languageButton = document.querySelector('[data-language-switch]');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  function applyLanguage(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    translatedElements.forEach(element => {
      const key = element.dataset.i18n || element.dataset.i18nHtml;
      if (element.dataset.i18nHtml) element.innerHTML = translations[language][key];
      else element.textContent = translations[language][key];
    });
    languageButton.textContent = language === 'en' ? '中文' : 'EN';
    languageButton.setAttribute('aria-label', language === 'en' ? '切换至简体中文' : 'Switch to English');
    languageButton.setAttribute('lang', language === 'en' ? 'zh-CN' : 'en');
    document.title = language === 'en' ? "Ferguson Women's Health · Dr. Michelle Lu-Ferguson" : 'Ferguson 女性健康 · 吕明旭医生';
    updateMenuLabel();
    try { localStorage.setItem('ferguson-language', language); } catch (_) { /* The selected language still works for this visit. */ }
  }
  function updateMenuLabel() {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-label', language === 'en' ? (open ? 'Close navigation' : 'Open navigation') : (open ? '关闭导航' : '打开导航'));
  }
  function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); updateMenuLabel(); }
  languageButton.addEventListener('click', () => applyLanguage(language === 'en' ? 'zh' : 'en'));
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    mobileNav.hidden = open;
    menuButton.setAttribute('aria-expanded', String(!open));
    updateMenuLabel();
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
  const desktop = window.matchMedia('(min-width: 701px)');
  desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });
  document.querySelector('.lock-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/__preview_logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok || (await response.text()).trim() !== 'ok') throw new Error('Logout failed');
      window.location.replace('/preview.html');
    } catch (_) {
      button.textContent = language === 'en' ? 'Try locking again' : '请重试锁定';
      button.disabled = false;
    }
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());
  applyLanguage(language);
})();
