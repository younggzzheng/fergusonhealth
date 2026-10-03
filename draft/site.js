(() => {
  'use strict';
  const translations = {
    en: {},
    zh: {
      skip: '跳转到正文', navAbout: '认识吕医生', navCare: '诊疗领域', navWork: '专业经历', navContact: '联系咨询',
      heroEyebrow: '用心了解，关爱女性健康', heroTitle: '关爱人生的<br><em>每一个阶段。</em>',
      heroWhoTitle: '我们是谁', heroIntro: '我们是一支专注女性健康的团队，以清晰沟通、科学诊疗和长期陪伴为核心。', heroCta: '了解我们的诊疗服务',
      missionTitle: '使命', missionBody: '以科学、可信赖的方式，帮助每位女性更好地了解自己，做出清晰而自信的健康选择。',
      visionTitle: '愿景', visionBody: '以国际标准的诊疗体系，让每位女性拥有更健康、更有力量的生活。',
      heroLocation: '中国 · 上海', portraitName: '吕明旭医生', portraitDetail: '妇产科', heroBottom: '专业、关怀，以及多一份理解。',
      aboutEyebrow: '02 / 认识吕医生', aboutTitle: '医生。<br>倾听者。<br><em>健康路上的同行者。</em>',
      profileName: '吕明旭医生，MD, FACOG', profileRole: 'Ferguson Women’s Health 创始人兼总裁',
      aboutBody: '吕明旭医生是美国妇产科专科认证医生，也是美国妇产科医师学会会士（FACOG）。凭借数十年在美国与中国的临床经验，她致力于推动以循证医学为基础的跨文化女性健康照护。',
      aboutBody2: '她的诊疗范围涵盖女性健康的各个领域，尤其关注内分泌与激素健康、更年期管理、多内分泌代谢性卵巢综合征（PMOS）、妇科诊断与治疗、生育与孕前咨询、避孕与家庭计划、性健康与外阴阴道健康、青少年妇科、妇科微创诊疗、盆底健康及长期预防保健。她也为复杂及高危孕期情况提供咨询，以清晰的指导和个体化支持帮助患者。',
      aboutPractice: '吕医生目前在上海美华丁香门诊部和百汇新天地医疗中心执业，可使用英语和普通话交流。',
      profileDetailsTitle: '医学培训与诊疗理念', profileTrainingTitle: '医学培训与教育',
      profileTraining: '吕医生在俄亥俄医科大学（Medical University of Ohio）取得医学博士（MD）学位。早期求学期间，她在北京大学完成医学预科学习，随后进入中国顶尖医学院之一的北京协和医学院继续学习。之后，她在纽约大学接受博士阶段科研培训，进一步夯实了医学科学与临床研究基础。',
      profileApproachTitle: '诊疗理念',
      profileApproach: '她以严谨的临床标准、国际化的医学培训背景和细致的沟通方式，广受本地及外籍社区的认可。',
      aboutPhilosophy: '在 Ferguson Health，我们认真倾听您的疑问，清晰解释诊疗选择，陪伴您走过人生的不同阶段。', signatureDetail: 'MD, FACOG · 妇产科',
      careEyebrow: '01 / 诊疗领域', careTitle: '陪伴每一个<br><em>不同的你。</em>', careIntro: '每一个人生阶段，都有新的疑问。留一些时间，听您慢慢说。',
      careHormoneTitle: '激素与更年期', careMenopause: '围绝经期与绝经管理', careHRT: '激素替代治疗（HRT）', carePMOS: '多内分泌代谢性卵巢综合征（PMOS，原称多囊卵巢综合征）与内分泌评估', careHormoneChanges: '激素相关情绪、睡眠与体重变化',
      careGynecologyTitle: '妇科诊疗', careCervicalScreening: '宫颈筛查（HPV / TCT / 阴道镜）', careEndometrial: '月经异常与子宫内膜疾病', careGynecologicConditions: '子宫肌瘤、卵巢囊肿、内膜异位症', careVaginitis: '阴道炎、外阴皮肤病',
      careFertilityTitle: '生育与生殖', careFertilityAssessment: '生育力评估（AMH、卵巢储备）', carePreconception: '备孕与孕前咨询', careEarlyPregnancy: '早孕管理（至 12 周）', careHighRiskPregnancy: '高危妊娠咨询', careFertilityPreservation: '生育力保护',
      careContraceptionTitle: '避孕与家庭计划', careIUD: '宫内节育器（IUD）', careImplant: '皮下埋植', careContraceptiveMedication: '药物避孕个体化选择',
      careSexualTitle: '性健康与外阴阴道', careSexualPain: '性疼痛（性交痛、阴道痉挛）', careVulvarSkin: '外阴皮肤病（硬化性苔藓等）', careGSM: '绝经相关泌尿生殖综合征（GSM）',
      careAdolescentTitle: '青少年女性健康', carePuberty: '初潮与青春期咨询', careAdolescentMenstrual: '青少年月经问题', careSexEducation: '性教育与避孕指导',
      careSurgeryTitle: '微创妇科手术', careHysteroscopy: '宫腔镜', careLaparoscopy: '腹腔镜', careMinimallyInvasive: '肌瘤、囊肿微创管理',
      carePelvicTitle: '盆底健康', carePelvicAssessment: '盆底功能评估', careIncontinence: '轻度尿失禁', carePostpartumPelvic: '产后盆底康复',
      carePreventiveTitle: '女性长期健康', careBone: '骨密度与骨健康', careCardiovascular: '心血管与绝经风险评估', careChronic: '慢性病与激素管理', careLifestyle: '体重与生活方式医学',
      workEyebrow: '03 / 专业经历', workTitle: '以经验积累，<br><em>践行关怀。</em>', workLead: '关爱女性，也分享专业知识。', workBody: '吕医生将患者照护、医学教育与跨专业协作相结合，经历涵盖美国的临床实践，以及上海女性健康领域的医疗管理工作。', workFeatureType: '携手关爱健康',
      plusIntro: '由吕医生与多位医学专业人士共同组织的多学科医疗健康团体。',
      plusBody: '跨越文化、专科与生命阶段，我们以清晰沟通、细致指导和高质量照护，支持个人与家庭做出健康选择，尊重每个人独特的需求与经历。',
      plusSpecialties: '女性健康 · 全科 · 皮肤健康 · 静脉健康 · 营养 · 物理治疗',
      plusCulture: '跨文化的深度关怀', plusScience: '科学与洞察并行', plusJourney: '健康旅程的同行者', plusLink: '了解 Ferguson Plus',
      workDetailsTitle: '进一步了解她的专业历程', workEducationTitle: '医学教育与医疗质量', workEducationBody: '在罗伯特·伍德·约翰逊医学院完成妇产科住院医师培训后，吕医生留校任教，在临床工作之外参与住院医师培训、医学生教育及临床研究。2005年回国后，她在上海多家医疗机构承担临床管理与医疗质量、安全方面的工作。', workLeadershipTitle: '诊室之外的健康教育', workLeadershipBody: '她也参与社区健康教育。在2026年美华的医学职业体验活动中，她向 SCIS 学生介绍了从青春期到更年期的女性健康。', workBackgroundLink: '了解这次学生体验活动',
      contactEyebrow: '从这里开始', contactTitle: '下一步，<br><em>我们一起走。</em>', contactBody: '如需预约，请使用微信扫描下方相应门诊的预约码。如需了解执业信息，欢迎通过电子邮件联系我们。关注微信公众号，获取最新资讯。',
      locationsTitle: '执业地点', clinic1Name: '美华丁香门诊部', clinic1Address: '华山路800弄<br>6号楼3层', clinic1Entrance: '（入口在镇宁路上）', clinic1Appointment: '微信扫码预约', clinic2Name: '百汇新天地医疗中心', clinic2Address: '淮海中路138号<br>上海广场3楼', clinic2Appointment: '微信扫码预约',
      wechatTitle: '在微信上保持联系', wechatBody: '扫码关注 Ferguson 女性健康官方微信公众号。', wechatNote: '微信公众号 · 最新资讯', socialTitle: '关注我们', socialXiaohongshu: '小红书', footerMessage: 'Because We Care', backTop: '返回顶部', lockPreview: '锁定预览'
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
