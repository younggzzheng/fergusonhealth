(() => {
  'use strict';
  const translations = {
    en: {},
    zh: {
      skip: '跳转到正文', navAbout: '认识吕医生', navCare: '诊疗领域', navWork: '专业经历', navContact: '联系咨询',
      heroEyebrow: '用心了解，关爱女性健康', heroTitle: '关爱人生的<br><em>每一个阶段。</em>',
      heroIntro: '认识吕明旭医生（Dr. Michelle Lu-Ferguson）。在上海提供个体化的妇科照护，关爱女性人生的每一个阶段。', heroCta: '了解吕医生',
      heroName: '吕明旭医生 · MD, FACOG', heroLocation: '中国 · 上海', portraitName: '吕明旭医生', portraitDetail: '妇产科', heroBottom: '专业、关怀，以及多一份理解。',
      aboutEyebrow: '01 / 认识吕医生', aboutTitle: '医生。<br>倾听者。<br><em>健康路上的同行者。</em>', aboutLead: '好的照护，从倾听开始。',
      aboutBody: '吕明旭医生是美国妇产科专科认证医生，也是美国妇产科医师学会会士（FACOG）。',
      aboutBody2: '她的经历涵盖临床诊疗、医学教育及女性健康领域的管理工作。目前在上海美华丁香门诊部和百汇新天地医疗中心执业，可使用英语和普通话交流。', profileLink: '查看官方医生简介', signatureDetail: 'MD, FACOG · 妇产科',
      careEyebrow: '02 / 诊疗领域', careTitle: '陪伴每一个<br><em>不同的你。</em>', careIntro: '每一个人生阶段，都有新的疑问。留一些时间，听您慢慢说。',
      care1Title: '激素与月经健康', care2Title: '生育力与生育规划', care3Title: '全生命周期妇科照护',
      careMenopause: '更年期支持与激素管理', careMenstrual: '月经健康与月经失调', careFertility: '生育力认知与孕前咨询', careContraception: '避孕与生育规划', careSurgery: '妇科微创手术', careSexual: '性健康与外阴阴道健康', careAdolescent: '青少年妇科', careSTI: '性传播感染（STI）', careCancerScreening: '癌症筛查',
      workEyebrow: '03 / 专业经历', workTitle: '以经验积累，<br><em>践行关怀。</em>', workLead: '关爱女性，也分享专业知识。', workBody: '吕医生将患者照护、医学教育与跨专业协作相结合，经历涵盖美国的临床实践，以及上海女性健康领域的医疗管理工作。', workFeatureType: '携手关爱健康', workSource: '上海跨专业健康团队成员。',
      workDetailsTitle: '进一步了解她的专业历程', workEducationTitle: '医学教育与医疗质量', workEducationBody: '在罗伯特·伍德·约翰逊医学院完成妇产科住院医师培训后，吕医生留校任教，在临床工作之外参与住院医师培训、医学生教育及临床研究。2005年回国后，她在上海多家医疗机构承担临床管理与医疗质量、安全方面的工作。', workLeadershipTitle: '诊室之外的健康教育', workLeadershipBody: '她也参与社区健康教育。在2026年美华的医学职业体验活动中，她向 SCIS 学生介绍了从青春期到更年期的女性健康。', workBackgroundLink: '了解这次学生体验活动',
      contactEyebrow: '从这里开始', contactTitle: '下一步，<br><em>我们一起走。</em>', contactBody: '如需预约，请使用微信扫描下方相应门诊的预约码。如需了解执业信息，欢迎通过电子邮件联系我们。关注微信公众号，获取最新资讯。',
      locationsTitle: '执业地点', clinic1Name: '美华丁香门诊部', clinic1Address: '华山路800弄<br>6号楼3层', clinic1Entrance: '（入口在镇宁路上）', clinic1Appointment: '微信扫码预约', clinic2Name: '百汇新天地医疗中心', clinic2Address: '淮海中路138号<br>上海广场3楼', clinic2Appointment: '微信扫码预约',
      wechatTitle: '在微信上保持联系', wechatBody: '扫码关注 Ferguson 女性健康官方微信公众号。', wechatNote: '微信公众号 · 最新资讯', socialTitle: '关注我们', socialXiaohongshu: '小红书', footerMessage: '用心关怀，真诚相伴。', backTop: '返回顶部', lockPreview: '锁定预览'
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
