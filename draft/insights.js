(() => {
  'use strict';
  const zh = {
    skip: '跳转到正文', back: '返回首页', eyebrow: '文章与视频', title: '健康知识',
    intro: '一个话题，多一份理解。以下摘要介绍我们的文章主题；视频来自更年期系列。',
    boneNav: '骨健康', fertilityNav: '生育力', proteinNav: '营养', videoNav: '更年期视频', overview: '文章摘要', reading: '延伸阅读：',
    boneTitle: '绝经后的无声骨流失',
    boneBody: '骨流失可能没有明显症状。绝经后，雌激素水平下降可能加速骨量减少；有时直到发生骨折，才发现骨质疏松。',
    boneBody2: '在问题出现之前，就值得关注骨健康。个人及家族病史、既往骨折和其他风险因素，有助于判断是否需要骨密度检查。规律进行负重和抗阻运动、摄入充足的钙与维生素D、不吸烟，都是保护骨健康的重要部分。',
    fertilityTitle: '35岁之后的生育力',
    fertilityBody: '生育力会随年龄变化，但某一个年龄或单项检查，无法概括每个人的情况。了解月经周期、病史和生育计划，有助于建立更清晰的孕前预期。',
    fertilityBody2: '孕前咨询可以讨论已有疾病、正在使用的药物，以及备孕的实际准备。如果迟迟没有怀孕，何时进行生育力评估取决于年龄及病史；已有相关问题的人，可能需要更早评估。',
    proteinTitle: '50岁之后，蛋白质比想象中更重要',
    proteinBody: '随着年龄增长，维持肌肉越来越重要。蛋白质是均衡饮食的一部分，与规律运动共同支持力量和日常活动能力。',
    proteinBody2: '鱼、蛋、奶类、瘦肉、豆类和豆制品，都可以成为日常蛋白质来源。多样化的饮食，比只关注某一种食物或补充剂更有意义。个体需求并不相同，尤其是患有肾脏疾病或其他疾病的人；调整饮食时，需要考虑这些情况。',
    series: '更年期系列 · 英语视频', videoTitle: '情绪波动，还是抑郁？了解两者的区别',
    videoIntro: '介绍更年期前后的情绪变化，以及为什么需要区分情绪波动与抑郁。',
    videoFallback: '您的浏览器不支持内嵌视频。', videoNote: '原视频为英语。请使用播放器控制播放、暂停和音量。',
    disclaimer: '内容仅供一般健康教育，不构成个体化医疗建议。文章摘要根据 Ferguson Health 提供的素材整理。个人健康问题应由具备资质的医疗专业人士评估。'
  };
  const elements = [...document.querySelectorAll('[data-i18n]')];
  const en = Object.fromEntries(elements.map(element => [element.dataset.i18n, element.textContent]));
  const button = document.querySelector('[data-language-switch]');
  let language = 'en';
  try { if (localStorage.getItem('ferguson-language') === 'zh') language = 'zh'; } catch (_) { /* Optional preference storage. */ }
  function apply() {
    const copy = language === 'zh' ? zh : en;
    elements.forEach(element => { element.textContent = copy[element.dataset.i18n]; });
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? '健康知识 · Ferguson Health' : 'Health insights · Ferguson Health';
    button.textContent = language === 'zh' ? 'EN' : '中文';
    button.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换至简体中文');
    button.setAttribute('lang', language === 'zh' ? 'en' : 'zh-CN');
    try { localStorage.setItem('ferguson-language', language); } catch (_) { /* Translation still works. */ }
  }
  button.addEventListener('click', () => { language = language === 'en' ? 'zh' : 'en'; apply(); });
  apply();
})();
