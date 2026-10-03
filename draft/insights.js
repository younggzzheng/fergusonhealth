(() => {
  'use strict';
  const zh = {
    boneSource: 'NIAMS · 骨质疏松', fertilitySource: 'ASRM · 生育力评估', proteinSource: 'NIA · 健康膳食规划',
    languageChoice: '选择语言', topicsLabel: '健康主题', skip: '跳转到正文', back: '返回首页', eyebrow: '文章与视频', title: '健康知识',
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
  const fr = {
    boneSource: 'NIAMS · Ostéoporose', fertilitySource: 'ASRM · Évaluation de la fertilité', proteinSource: 'NIA · Planifier des repas sains',
    languageChoice: 'Choisir la langue', topicsLabel: 'Thèmes de santé', skip: 'Aller au contenu', back: 'Retour à l’accueil', eyebrow: 'Articles et vidéos', title: 'Mieux comprendre sa santé',
    intro: 'Mieux comprendre votre santé, un sujet à la fois. Ces courts résumés présentent les thèmes de nos articles ; la vidéo fait partie de notre série sur la ménopause.',
    boneNav: 'Santé osseuse', fertilityNav: 'Fertilité', proteinNav: 'Nutrition', videoNav: 'Vidéo sur la ménopause', overview: 'Résumé de l’article', reading: 'Pour en savoir plus : ',
    boneTitle: 'La perte osseuse silencieuse après la ménopause',
    boneBody: 'La perte osseuse peut survenir sans symptômes évidents. Après la ménopause, la baisse du taux d’œstrogènes peut accélérer cette perte ; l’ostéoporose peut ne se révéler qu’à l’occasion d’une fracture.',
    boneBody2: 'Il est utile de parler de la santé osseuse avant qu’un problème n’apparaisse. Les antécédents personnels et familiaux, les fractures antérieures et d’autres facteurs de risque aident à déterminer si une mesure de la densité osseuse est indiquée. Une activité physique régulière en charge et contre résistance, un apport suffisant en calcium et en vitamine D, ainsi que l’absence de tabagisme contribuent à protéger les os.',
    fertilityTitle: 'La fertilité après 35 ans',
    fertilityBody: 'La fertilité évolue avec l’âge, mais ni un âge précis ni un examen isolé ne résument la situation d’une personne. Comprendre votre cycle menstruel, vos antécédents médicaux et vos projets peut vous aider à aborder une grossesse avec des attentes plus claires.',
    fertilityBody2: 'Un échange préconceptionnel peut porter sur les problèmes de santé existants, les médicaments et la préparation concrète à une grossesse. Si la grossesse tarde à venir, le moment d’une évaluation de la fertilité dépend de l’âge et des antécédents médicaux ; des problèmes déjà connus peuvent justifier une évaluation plus précoce.',
    proteinTitle: 'Après 50 ans, les protéines comptent plus que vous ne le pensez',
    proteinBody: 'Préserver les muscles devient important avec l’âge. Les protéines font partie d’une alimentation équilibrée qui soutient la force et les activités du quotidien, aux côtés d’une activité physique régulière.',
    proteinBody2: 'Poisson, œufs, produits laitiers, viande maigre, haricots et aliments à base de soja permettent d’intégrer des protéines aux repas quotidiens de différentes façons. Une alimentation variée est plus utile que de se concentrer sur un seul aliment ou complément. Les besoins individuels peuvent varier, notamment en cas de maladie rénale ou d’autres problèmes médicaux ; tout changement alimentaire doit en tenir compte.',
    series: 'Série sur la ménopause · Vidéo en anglais', videoTitle: 'Sautes d’humeur ou dépression ? Comprendre la différence',
    videoIntro: 'Une introduction aux changements d’humeur autour de la ménopause et à l’importance de distinguer sautes d’humeur et dépression.',
    videoFallback: 'Votre navigateur ne prend pas en charge la vidéo intégrée.', videoNote: 'La vidéo fournie est en anglais. Utilisez les commandes du lecteur pour lancer la lecture, faire une pause et régler le volume.',
    disclaimer: 'Ces contenus sont destinés à l’éducation générale et ne constituent pas un avis médical individuel. Les résumés d’articles sont adaptés de documents fournis par Ferguson Health. Vos questions de santé personnelles nécessitent une évaluation par un professionnel de santé qualifié.'
  };
  const de = {
    boneSource: 'NIAMS · Osteoporose', fertilitySource: 'ASRM · Fertilitätsdiagnostik', proteinSource: 'NIA · Gesunde Mahlzeiten planen',
    languageChoice: 'Sprache wählen', topicsLabel: 'Gesundheitsthemen', skip: 'Zum Inhalt springen', back: 'Zur Startseite', eyebrow: 'Artikel und Videos', title: 'Gesundheit verstehen',
    intro: 'Ihre Gesundheit besser verstehen — ein Thema nach dem anderen. Diese kurzen Übersichten stellen unsere Artikelthemen vor; das Video gehört zu unserer Reihe über die Wechseljahre.',
    boneNav: 'Knochengesundheit', fertilityNav: 'Fertilität', proteinNav: 'Ernährung', videoNav: 'Wechseljahresvideo', overview: 'Artikelübersicht', reading: 'Weiterführende Informationen: ',
    boneTitle: 'Stiller Knochenverlust nach den Wechseljahren',
    boneBody: 'Knochenverlust kann ohne deutliche Symptome auftreten. Nach den Wechseljahren können niedrigere Östrogenspiegel den Knochenabbau beschleunigen; Osteoporose wird unter Umständen erst bei einem Knochenbruch erkennbar.',
    boneBody2: 'Es lohnt sich, über Knochengesundheit zu sprechen, bevor ein Problem entsteht. Die persönliche und familiäre Krankengeschichte, frühere Knochenbrüche und weitere Risikofaktoren helfen bei der Entscheidung, ob eine Knochendichtemessung sinnvoll ist. Regelmäßige Bewegung mit Belastung des Körpergewichts und Krafttraining, ausreichend Kalzium und Vitamin D sowie Nichtrauchen sind wichtige Bestandteile des Knochenschutzes.',
    fertilityTitle: 'Fertilität nach dem 35. Lebensjahr',
    fertilityBody: 'Die Fertilität verändert sich mit dem Alter, doch weder ein bestimmtes Alter noch ein einzelner Test beschreibt die gesamte individuelle Situation. Ihren Menstruationszyklus, Ihre Krankengeschichte und Ihre Pläne zu verstehen, kann helfen, eine Schwangerschaft mit klareren Erwartungen anzugehen.',
    fertilityBody2: 'Eine präkonzeptionelle Beratung kann bestehende Erkrankungen, Medikamente und die praktische Vorbereitung auf eine Schwangerschaft besprechen. Wenn eine Schwangerschaft länger auf sich warten lässt als erwartet, hängt der Zeitpunkt einer Fertilitätsdiagnostik vom Alter und der Krankengeschichte ab; bekannte Probleme können eine frühere Abklärung rechtfertigen.',
    proteinTitle: 'Nach 50 ist Eiweiß wichtiger, als Sie denken',
    proteinBody: 'Mit zunehmendem Alter wird der Erhalt der Muskulatur wichtig. Eiweiß trägt zu einer ausgewogenen Ernährung bei, die gemeinsam mit regelmäßiger körperlicher Aktivität Kraft und Alltagsaktivitäten unterstützt.',
    proteinBody2: 'Fisch, Eier, Milchprodukte, mageres Fleisch, Bohnen und Sojaprodukte bieten verschiedene Möglichkeiten, Eiweiß in die täglichen Mahlzeiten einzubauen. Eine abwechslungsreiche Ernährung ist hilfreicher als die Konzentration auf ein einzelnes Lebensmittel oder Nahrungsergänzungsmittel. Individuelle Bedürfnisse können unterschiedlich sein, besonders bei Nierenerkrankungen oder anderen medizinischen Problemen; Ernährungsänderungen sollten diese Bedürfnisse berücksichtigen.',
    series: 'Wechseljahresreihe · Video auf Englisch', videoTitle: 'Stimmungsschwankungen oder Depression? Den Unterschied verstehen',
    videoIntro: 'Eine Einführung in Stimmungsveränderungen rund um die Wechseljahre und warum die Unterscheidung zwischen Stimmungsschwankungen und Depression wichtig ist.',
    videoFallback: 'Ihr Browser unterstützt keine eingebetteten Videos.', videoNote: 'Das bereitgestellte Video ist auf Englisch. Mit den Bedienelementen können Sie die Wiedergabe starten, pausieren und die Lautstärke einstellen.',
    disclaimer: 'Nur zur allgemeinen Gesundheitsbildung, nicht als individuelle medizinische Beratung. Die Artikelübersichten wurden aus bereitgestellten Materialien von Ferguson Health erstellt. Ihre persönlichen Gesundheitsfragen erfordern eine Beurteilung durch eine qualifizierte medizinische Fachkraft.'
  };
  window.FergusonLanguages.init({
    translations: { en: {}, zh, fr, de },
    titles: { en: 'Health insights · Ferguson Health', zh: '健康知识 · Ferguson Health', fr: 'Mieux comprendre sa santé · Ferguson Health', de: 'Gesundheit verstehen · Ferguson Health' }
  });
})();
