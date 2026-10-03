(() => {
  'use strict';
  const translations = {
    en: {},
    zh: {
      brandHome: 'Ferguson 女性健康首页', mainNavigation: '主要导航', mobileNavigation: '手机导航', discoverMore: '了解更多',
      plusLogoAlt: 'Ferguson Plus 标志', clinic1QrAlt: '美华预约二维码', clinic2QrAlt: '百汇预约二维码', wechatQrAlt: 'Ferguson 女性健康官方微信公众号二维码',
      skip: '跳转到正文', navAbout: '认识吕医生', navCare: '咨询领域', navWork: '社区与教育', navContact: '联系咨询',
      heroEyebrow: '用心了解，关爱女性健康', heroTitle: '关爱人生的<br><em>每一个阶段。</em>',
      heroWhoTitle: '我们是谁', heroIntro: '我们是一支专注女性健康的团队，以清晰沟通、科学诊疗和长期陪伴为核心。', heroCta: '了解我们的咨询服务',
      missionTitle: '使命', missionBody: '以科学、可信赖的方式，帮助每位女性更好地了解自己，做出清晰而自信的健康选择。',
      visionTitle: '愿景', visionBody: '以国际标准的诊疗体系，让每位女性拥有更健康、更有力量的生活。',
      heroLocation: '中国 · 上海', portraitName: '吕明旭医生', portraitDetail: '妇产科', heroBottom: '专业、关怀，以及多一份理解。',
      aboutEyebrow: '02 / 认识吕医生', aboutTitle: '医生。<br>倾听者。<br><em>健康路上的同行者。</em>',
      profileName: '吕明旭医生，MD, FACOG', profileRole: 'Ferguson Women’s Health 创始人兼总裁',
      aboutBody: '吕明旭医生是<strong>美国妇产科专科认证医生</strong>，也是<strong>美国妇产科医师学会会士（FACOG）。</strong>凭借数十年在美国与中国的临床经验，她致力于推动以循证医学为基础的跨文化女性健康照护。',
      aboutBody2: '她的诊疗范围涵盖女性健康的各个领域，尤其关注内分泌与激素健康、更年期管理、多内分泌代谢性卵巢综合征（PMOS）、妇科诊断与治疗、生育与孕前咨询、避孕与家庭计划、性健康与外阴阴道健康、青少年妇科、妇科微创诊疗、盆底健康及长期预防保健。她也为复杂及高危孕期情况提供咨询，以清晰的指导和个体化支持帮助患者。',
      profileDetailsTitle: '诊疗重点与医学培训', profileFocusTitle: '诊疗重点', profileTrainingTitle: '医学培训与教育',
      profileDegree: '吕医生在俄亥俄医科大学（Medical University of Ohio）取得<strong>医学博士（MD）</strong>学位。',
      profileResidency: '她在罗格斯大学罗伯特·伍德·约翰逊医学院（Rutgers Robert Wood Johnson Medical School）完成妇产科住院医师培训。该校是美国重要的学术医疗中心。培训结束后，她留校任教，参与临床照护、医学教育与临床研究；这些经历持续影响着她严谨、循证的临床风格。',
      profileTraining: '早期求学期间，她在北京大学完成医学预科学习，随后进入中国顶尖医学院之一的北京协和医学院继续学习。之后，她在纽约大学接受博士阶段科研培训，进一步夯实了医学科学与临床研究基础。',
      profileApproachTitle: '诊疗理念',
      profileApproach: '她以严谨的临床标准、国际化的医学培训背景和细致的沟通方式，广受本地及外籍社区的认可。',
      aboutPhilosophy: '在 Ferguson Health，我们认真倾听您的疑问，清晰解释诊疗选择，陪伴您走过人生的不同阶段。', signatureDetail: 'MD, FACOG · 妇产科 · 女性健康',
      careClosing: '了解您的需要，陪伴每一个阶段。', aboutClosing: '专业始于经验，关怀始于倾听。', workClosing: '分享知识，连接社区。', contactClosing: '欢迎提问，从交流开始。',
      careEyebrow: '01 / 咨询领域', careTitle: '陪伴每一个<br><em>不同的你。</em>',
      careHormoneTitle: '激素与更年期', careMenopause: '围绝经期与绝经管理', careHRT: '激素替代治疗（HRT）', carePMOS: '多内分泌代谢性卵巢综合征（PMOS，原称多囊卵巢综合征）与内分泌评估', careHormoneChanges: '激素相关情绪、睡眠与体重变化',
      careGynecologyTitle: '妇科咨询', careCervicalScreening: '宫颈筛查（HPV / TCT / 阴道镜）', careEndometrial: '月经异常与子宫内膜疾病', careGynecologicConditions: '子宫肌瘤、卵巢囊肿、内膜异位症', careVaginitis: '阴道炎、外阴皮肤病',
      careFertilityTitle: '生育与生殖', careFertilityAssessment: '生育力评估（AMH、卵巢储备）', carePreconception: '备孕与孕前咨询', careEarlyPregnancy: '早孕管理（至 12 周）', careHighRiskPregnancy: '高危妊娠咨询', careFertilityPreservation: '生育力保护',
      careContraceptionTitle: '避孕与家庭计划', careIUD: '宫内节育器（IUD）', careImplant: '皮下埋植', careContraceptiveMedication: '药物避孕个体化选择',
      careSexualTitle: '性健康与外阴阴道', careSexualPain: '性疼痛（性交痛、阴道痉挛）', careVulvarSkin: '外阴皮肤病（硬化性苔藓等）', careGSM: '绝经相关泌尿生殖综合征（GSM）',
      careAdolescentTitle: '青少年女性健康', carePuberty: '初潮与青春期咨询', careAdolescentMenstrual: '青少年月经问题', careSexEducation: '性教育与避孕指导',
      careSurgeryTitle: '微创手术咨询', careHysteroscopy: '宫腔镜', careLaparoscopy: '腹腔镜', careMinimallyInvasive: '肌瘤、囊肿微创管理',
      carePelvicTitle: '盆底健康', carePelvicAssessment: '盆底功能评估', careIncontinence: '轻度尿失禁', carePostpartumPelvic: '产后盆底康复',
      carePreventiveTitle: '女性长期健康', careBone: '骨密度与骨健康', careCardiovascular: '心血管与绝经风险评估', careChronic: '慢性病与激素管理', careLifestyle: '体重与生活方式医学',
      workEyebrow: '03 / 社区与教育', workTitle: '诊室之外，<br><em>分享与连接。</em>', workFeatureType: '携手关爱健康',
      effortCommunity: '社区健康教育', effortCommunityBody: '吕医生与团队经常开展女性健康主题的社区讲座，以清晰、实用的方式分享知识，也为提问和坦诚交流留出空间。',
      effortMDT: '多学科交流', effortMDTBody: '在合作医院的平台上，我们汇集不同专科的同仁，组织多学科团队（MDT）讨论，交流各自的视角，共同探讨复杂的临床问题。',
      effortCME: '共同学习', effortCMEBody: '通过继续医学教育（CME）讨论，我们分享临床知识与经验，支持持续学习，也加强医学专业人士之间的交流与联系。',
      insightsEyebrow: '文章与视频', insightsTitle: '健康知识', insightsIntro: '多一份知识，多一份理解。阅读文章摘要，观看更年期系列视频。',
      insightBone: '绝经后的无声骨流失', insightFertility: '35岁之后的生育力', insightProtein: '50岁之后，蛋白质比想象中更重要', insightVideo: '视频：情绪波动，还是抑郁？',
      insightsUpdates: '更多文章、视频与资讯，请关注我们的官方微信公众号。',
      eventsEyebrow: '新闻与活动', eventDate: '2026年10月24日 · 14:00–16:00（上海时间）', eventIntro: 'Ferguson Plus 面向6–18岁孩子及其家庭的健康讲座，关注青少年皮肤、儿童视力、姿势与运动。', eventLink: '讲座详情与报名',
      plusIntro: '由吕医生与多位医学专业人士共同组织的多学科医疗健康团体。',
      plusDetailsTitle: '团队专科与理念',
      plusSpecialties: '女性健康 · 全科 · 皮肤健康 · 静脉健康 · 营养 · 物理治疗',
      plusCulture: '跨文化的深度关怀', plusScience: '科学与洞察并行', plusJourney: '健康旅程的同行者', plusLink: '了解 Ferguson Plus',
      workDetailsTitle: '进一步了解她的专业历程', workEducationTitle: '医学教育与医疗质量', workEducationBody: '在罗伯特·伍德·约翰逊医学院完成妇产科住院医师培训后，吕医生留校任教，在临床工作之外参与住院医师培训、医学生教育及临床研究。2005年回国后，她在上海多家医疗机构承担临床管理与医疗质量、安全方面的工作。', workLeadershipTitle: '诊室之外的健康教育', workLeadershipBody: '她也参与社区健康教育。在2026年美华的医学职业体验活动中，她向 SCIS 学生介绍了从青春期到更年期的女性健康。', workBackgroundLink: '了解这次学生体验活动',
      contactEyebrow: '从这里开始', contactTitle: '下一步，<br><em>我们一起走。</em>', contactBody: '如需预约，请使用微信扫描下方相应门诊的预约码。如需了解更多信息，欢迎通过电子邮件联系我们。关注微信公众号，获取最新资讯。',
      locationsTitle: '咨询地点', clinic1Name: '1. 美华丁香门诊部', clinic1Address: '华山路800弄<br>6号楼3层', clinic1Entrance: '（入口在镇宁路上）', clinic1Appointment: '微信扫码预约', clinic2Name: '2. 百汇新天地医疗中心', clinic2Address: '淮海中路138号<br>上海广场3楼', clinic2Appointment: '微信扫码预约',
      connectedTitle: '保持联系', wechatTitle: '官方微信公众号', wechatBody: '扫码关注，获取最新资讯。', socialXiaohongshu: '小红书', footerMessage: 'Because We Care', backTop: '返回顶部', lockPreview: '锁定预览', languageChoice: '选择语言'
    },
    fr: {
      brandHome: 'Accueil de Ferguson Women’s Health', mainNavigation: 'Navigation principale', mobileNavigation: 'Navigation mobile', discoverMore: 'En savoir plus',
      plusLogoAlt: 'Logo Ferguson Plus', clinic1QrAlt: 'Code QR de rendez-vous Am-Sino', clinic2QrAlt: 'Code QR de rendez-vous Parkway', wechatQrAlt: 'Code QR du compte officiel WeChat de Ferguson Women’s Health',
      languageChoice: 'Choisir la langue', skip: 'Aller au contenu', navAbout: 'Rencontrez Dr Ferguson', navCare: 'Nos domaines de soins', navWork: 'Nos engagements', navContact: 'Nous contacter',
      heroEyebrow: 'Une approche personnelle de la santé des femmes', heroTitle: 'À chaque étape<br><em>de votre vie.</em>',
      heroWhoTitle: 'Qui sommes-nous ?', heroIntro: 'Nous sommes une équipe dédiée à la santé des femmes, engagée pour une communication claire, des soins fondés sur les données scientifiques et un accompagnement à long terme.', heroCta: 'Découvrez nos soins',
      missionTitle: 'Notre mission', missionBody: 'Proposer des soins fiables, fondés sur les données scientifiques, pour aider chaque femme à comprendre son corps et à prendre des décisions de santé en toute confiance.',
      visionTitle: 'Notre vision', visionBody: 'Mettre les standards internationaux de la santé des femmes à la portée de chacune, pour soutenir sa santé et sa qualité de vie.',
      heroLocation: 'Shanghai, Chine', portraitName: 'Michelle Lu-Ferguson', signatureDetail: 'MD, FACOG · Obstétrique et gynécologie · Santé des femmes', heroBottom: 'Expertise. Empathie. Un peu plus de compréhension.',
      aboutEyebrow: '02 / Rencontrez Dr Ferguson', aboutTitle: 'Médecin.<br>À votre écoute.<br><em>À vos côtés.</em>',
      profileName: 'Dr Michelle Lu-Ferguson, MD, FACOG', profileRole: 'Fondatrice et présidente, Ferguson Women’s Health',
      aboutBody: 'Dr Michelle Lu-Ferguson est une <strong>spécialiste en gynécologie-obstétrique certifiée aux États-Unis (board-certified)</strong> et <strong>Fellow de l’American College of Obstetricians and Gynecologists (FACOG).</strong> Forte de plusieurs décennies d’expérience clinique aux États-Unis et en Chine, elle œuvre pour des soins de santé des femmes fondés sur les données scientifiques et ouverts aux différentes cultures.',
      aboutBody2: 'Sa pratique actuelle couvre l’ensemble de la santé des femmes, avec une attention particulière aux soins endocriniens et hormonaux, à la prise en charge de la ménopause, au PMOS (Polyendocrine Metabolic Ovarian Syndrome), au diagnostic et au traitement gynécologiques, à la fertilité et au conseil préconceptionnel, à la contraception et à la planification familiale, à la santé sexuelle et vulvovaginale, à la gynécologie de l’adolescente, aux procédures gynécologiques mini-invasives, à la santé du plancher pelvien et à la prévention à long terme. Elle propose également des consultations pour les situations prénatales complexes et les grossesses à haut risque, avec des explications claires et un accompagnement individualisé.',
      profileDetailsTitle: 'Domaines cliniques et formation médicale', profileFocusTitle: 'Domaines cliniques', profileTrainingTitle: 'Formation et enseignement médical',
      profileDegree: 'Dr Lu-Ferguson a obtenu son diplôme de <strong>Doctor of Medicine</strong> à la Medical University of Ohio.',
      profileResidency: 'Elle a effectué sa formation spécialisée (residency) en obstétrique et gynécologie à la Rutgers Robert Wood Johnson Medical School, un grand centre médical universitaire aux États-Unis. Elle y a ensuite rejoint le corps enseignant, contribuant aux soins cliniques, à l’enseignement médical et à la recherche clinique — une expérience qui continue de nourrir sa pratique rigoureuse, fondée sur les données scientifiques.',
      profileTraining: 'Au début de son parcours universitaire, elle a suivi des études pré-médicales à Peking University, puis poursuivi sa formation à Peking Union Medical College, l’une des meilleures facultés de médecine de Chine. Elle a ensuite suivi une formation à la recherche de niveau doctoral à New York University, renforçant ses bases en sciences médicales et en recherche clinique.',
      profileApproachTitle: 'Approche des soins', profileApproach: 'Reconnue pour la rigueur de ses standards cliniques, sa formation internationale et sa communication attentive, elle bénéficie de l’estime des communautés locales et expatriées.',
      careClosing: 'Comprendre vos besoins. Vous accompagner à chaque étape.', aboutClosing: 'Une expérience à votre écoute. Des soins qui vous ressemblent.', workClosing: 'Partager les connaissances. Relier les communautés.', contactClosing: 'Vos questions sont les bienvenues. Le lien commence ici.',
      careEyebrow: '01 / Nos domaines de soins', careTitle: 'Des soins qui évoluent<br><em>avec vous.</em>',
      careHormoneTitle: 'Santé hormonale et ménopause', careMenopause: 'Accompagnement de la périménopause et de la ménopause', careHRT: 'Traitement hormonal substitutif (HRT)', carePMOS: 'PMOS (Polyendocrine Metabolic Ovarian Syndrome, anciennement PCOS) et évaluation endocrinienne', careHormoneChanges: 'Changements de l’humeur, du sommeil et du poids liés aux hormones',
      careGynecologyTitle: 'Soins gynécologiques', careCervicalScreening: 'Dépistage cervical (HPV / TCT / colposcopie)', careEndometrial: 'Troubles menstruels et maladies de l’endomètre', careGynecologicConditions: 'Fibromes utérins, kystes ovariens et endométriose', careVaginitis: 'Vaginite et affections cutanées de la vulve',
      careFertilityTitle: 'Santé reproductive et fertilité', careFertilityAssessment: 'Évaluation de la fertilité (AMH et réserve ovarienne)', carePreconception: 'Préparation à la grossesse et conseil préconceptionnel', careEarlyPregnancy: 'Suivi du début de grossesse (jusqu’à 12 semaines)', careHighRiskPregnancy: 'Consultation pour grossesse à haut risque', careFertilityPreservation: 'Préservation de la fertilité',
      careContraceptionTitle: 'Contraception et planification familiale', careIUD: 'Dispositifs intra-utérins (DIU)', careImplant: 'Implants contraceptifs', careContraceptiveMedication: 'Choix individualisé des médicaments contraceptifs',
      careSexualTitle: 'Santé sexuelle et vulvovaginale', careSexualPain: 'Douleurs sexuelles (dyspareunie et vaginisme)', careVulvarSkin: 'Affections cutanées de la vulve (dont le lichen scléreux)', careGSM: 'Syndrome génito-urinaire de la ménopause (GSM)',
      careAdolescentTitle: 'Santé des adolescentes', carePuberty: 'Conseil sur les premières règles et la puberté', careAdolescentMenstrual: 'Problèmes menstruels à l’adolescence', careSexEducation: 'Éducation à la sexualité et conseil en contraception',
      careSurgeryTitle: 'Procédures mini-invasives', careHysteroscopy: 'Hystéroscopie', careLaparoscopy: 'Laparoscopie', careMinimallyInvasive: 'Prise en charge mini-invasive des fibromes et des kystes',
      carePelvicTitle: 'Santé du plancher pelvien', carePelvicAssessment: 'Évaluation de la fonction du plancher pelvien', careIncontinence: 'Incontinence urinaire légère', carePostpartumPelvic: 'Rééducation du plancher pelvien après l’accouchement',
      carePreventiveTitle: 'Prévention et santé des femmes', careBone: 'Densité et santé osseuses', careCardiovascular: 'Évaluation des risques cardiovasculaires et liés à la ménopause', careChronic: 'Maladies chroniques et prise en charge hormonale', careLifestyle: 'Poids et médecine du mode de vie',
      workEyebrow: '03 / Nos engagements', workTitle: 'Au-delà<br><em>du cabinet.</em>', workFeatureType: 'Agir ensemble',
      effortCommunity: 'Éducation à la santé dans la communauté', effortCommunityBody: 'Dr Ferguson et l’équipe donnent régulièrement des conférences sur la santé des femmes dans la communauté, partageant des connaissances claires et pratiques et laissant une place aux questions et au dialogue.',
      effortMDT: 'Échanges multidisciplinaires', effortMDTBody: 'Sur les plateformes des hôpitaux partenaires, nous réunissons des collègues de différentes spécialités pour des discussions en équipe multidisciplinaire (MDT), afin de croiser les points de vue et d’explorer des questions cliniques complexes.',
      effortCME: 'Apprendre ensemble', effortCMEBody: 'À travers des discussions de formation médicale continue (CME), nous partageons les connaissances et l’expérience cliniques, encourageons l’apprentissage continu et renforçons les liens entre professionnels de santé.',
      insightsEyebrow: 'Articles et vidéos', insightsTitle: 'Mieux comprendre sa santé', insightsIntro: 'Un peu de savoir, une vision plus claire. Découvrez nos résumés d’articles et notre vidéo sur la ménopause.',
      insightBone: 'La perte osseuse silencieuse après la ménopause', insightFertility: 'La fertilité après 35 ans', insightProtein: 'Après 50 ans, les protéines comptent plus que vous ne le pensez', insightVideo: 'Vidéo : sautes d’humeur ou dépression ?',
      insightsUpdates: 'Pour de nouveaux articles, vidéos et actualités, suivez notre compte officiel WeChat.',
      eventsEyebrow: 'Actualités et événements', eventDate: '24 octobre 2026 · 14 h–16 h (Shanghai)', eventIntro: 'Une conférence santé de Ferguson Plus pour les familles avec des enfants de 6 à 18 ans, consacrée à la peau des adolescents, à la vision des enfants, à la posture et au mouvement.', eventLink: 'Détails et inscription',
      plusIntro: 'Un groupe de santé multidisciplinaire réuni par Dr Ferguson et d’autres professionnels de santé.', plusDetailsTitle: 'Spécialités et approche', plusSpecialties: 'Santé des femmes · Médecine générale · Dermatologie · Santé veineuse · Nutrition · Physiothérapie',
      plusCulture: 'La bienveillance au-delà des cultures', plusScience: 'La science avec compréhension', plusJourney: 'Un parcours de santé partagé', plusLink: 'Découvrir Ferguson Plus',
      contactEyebrow: 'Un bon point de départ', contactTitle: 'Faisons le prochain<br><em>pas, ensemble.</em>', contactBody: 'Pour prendre rendez-vous, scannez dans WeChat le code de la clinique ci-dessous. Pour plus d’informations, contactez-nous par e-mail. Notre compte officiel WeChat partage actualités et nouveautés.',
      locationsTitle: 'Où nous trouver', clinic1Name: '1. Am-Sino Ding Xiang Clinic', clinic1Address: '3e étage, bâtiment 6,<br>800 Hua Shan Road', clinic1Entrance: '(Entrée sur Zhen Ning Road)', clinic1Appointment: 'Scannez avec WeChat pour réserver', clinic2Name: '2. Parkway MediCentre Xintiandi', clinic2Address: '3e étage, Shanghai Plaza,<br>138 Middle Huaihai Road.', clinic2Appointment: 'Scannez avec WeChat pour réserver',
      connectedTitle: 'Restons en contact', wechatTitle: 'Compte officiel WeChat', wechatBody: 'Scannez pour suivre les actualités.', socialXiaohongshu: 'Xiaohongshu · 小红书', footerMessage: 'Because We Care', backTop: 'Retour en haut', lockPreview: 'Verrouiller l’aperçu'
    },
    de: {
      brandHome: 'Startseite von Ferguson Women’s Health', mainNavigation: 'Hauptnavigation', mobileNavigation: 'Mobile Navigation', discoverMore: 'Mehr erfahren',
      plusLogoAlt: 'Ferguson-Plus-Logo', clinic1QrAlt: 'QR-Code für Termine bei Am-Sino', clinic2QrAlt: 'QR-Code für Termine bei Parkway', wechatQrAlt: 'QR-Code des offiziellen WeChat-Kontos von Ferguson Women’s Health',
      languageChoice: 'Sprache wählen', skip: 'Zum Inhalt springen', navAbout: 'Dr. Ferguson kennenlernen', navCare: 'Unsere Leistungen', navWork: 'Unser Engagement', navContact: 'Kontakt',
      heroEyebrow: 'Ein persönlicher Ansatz für die Gesundheit von Frauen', heroTitle: 'Für jede Phase<br><em>Ihres Lebens.</em>',
      heroWhoTitle: 'Wer wir sind', heroIntro: 'Wir sind ein Team für Frauengesundheit und setzen uns für klare Kommunikation, evidenzbasierte Versorgung und langfristige Begleitung ein.', heroCta: 'Unsere Leistungen entdecken',
      missionTitle: 'Unsere Mission', missionBody: 'Wir bieten verlässliche, evidenzbasierte Versorgung, damit jede Frau ihren Körper verstehen und Gesundheitsentscheidungen mit Zuversicht treffen kann.',
      visionTitle: 'Unsere Vision', visionBody: 'Internationale Standards der Frauengesundheit für jede Frau zugänglich machen und ihre Gesundheit und Lebensqualität fördern.',
      heroLocation: 'Shanghai, China', portraitName: 'Michelle Lu-Ferguson', signatureDetail: 'MD, FACOG · Geburtshilfe und Gynäkologie · Frauengesundheit', heroBottom: 'Expertise. Empathie. Ein wenig mehr Verständnis.',
      aboutEyebrow: '02 / Dr. Ferguson kennenlernen', aboutTitle: 'Ärztin.<br>Zuhörerin.<br><em>An Ihrer Seite.</em>',
      profileName: 'Dr. Michelle Lu-Ferguson, MD, FACOG', profileRole: 'Gründerin und Präsidentin, Ferguson Women’s Health',
      aboutBody: 'Dr. Michelle Lu-Ferguson ist eine <strong>in den USA board-zertifizierte Spezialistin für Geburtshilfe und Gynäkologie</strong> und <strong>Fellow des American College of Obstetricians and Gynecologists (FACOG).</strong> Mit jahrzehntelanger klinischer Erfahrung in den USA und China setzt sie sich für eine evidenzbasierte, kulturübergreifende Gesundheitsversorgung von Frauen ein.',
      aboutBody2: 'Ihre heutige Tätigkeit umfasst das gesamte Spektrum der Frauengesundheit. Schwerpunkte sind endokrinologische und hormonelle Versorgung, Wechseljahresmanagement, PMOS (Polyendocrine Metabolic Ovarian Syndrome), gynäkologische Diagnostik und Behandlung, Fertilitäts- und präkonzeptionelle Beratung, Verhütung und Familienplanung, sexuelle und vulvovaginale Gesundheit, Jugendgynäkologie, minimalinvasive gynäkologische Verfahren, Beckenbodengesundheit und langfristige Prävention. Zudem berät sie bei komplexen pränatalen Situationen und Risikoschwangerschaften und bietet klare Orientierung sowie individuelle Unterstützung.',
      profileDetailsTitle: 'Klinische Schwerpunkte und medizinische Ausbildung', profileFocusTitle: 'Klinische Schwerpunkte', profileTrainingTitle: 'Medizinische Ausbildung und Lehre',
      profileDegree: 'Dr. Lu-Ferguson erwarb ihren Abschluss als <strong>Doctor of Medicine</strong> an der Medical University of Ohio.',
      profileResidency: 'Sie absolvierte ihre Facharztausbildung (Residency) in Geburtshilfe und Gynäkologie an der Rutgers Robert Wood Johnson Medical School, einem bedeutenden akademischen medizinischen Zentrum in den USA. Anschließend gehörte sie dort dem Lehrkörper an und wirkte in der klinischen Versorgung, der medizinischen Lehre und der klinischen Forschung mit. Diese Erfahrung prägt bis heute ihren sorgfältigen, evidenzbasierten klinischen Ansatz.',
      profileTraining: 'Zu Beginn ihrer akademischen Ausbildung absolvierte sie vormedizinische Studien an der Peking University und setzte ihre Ausbildung am Peking Union Medical College fort, einer der führenden medizinischen Hochschulen Chinas. Später erhielt sie eine Forschungsausbildung auf Promotionsniveau an der New York University und vertiefte damit ihre Grundlagen in medizinischer Wissenschaft und klinischer Forschung.',
      profileApproachTitle: 'Unser Versorgungsansatz', profileApproach: 'Für ihre hohen klinischen Standards, ihre internationale Ausbildung und ihre aufmerksame Kommunikation genießt sie sowohl in der lokalen als auch in der internationalen Gemeinschaft großes Ansehen.',
      careClosing: 'Ihre Bedürfnisse verstehen. Jede Lebensphase begleiten.', aboutClosing: 'Erfahrung, die zuhört. Versorgung, die persönlich ist.', workClosing: 'Wissen teilen. Gemeinschaften verbinden.', contactClosing: 'Ihre Fragen sind willkommen. Hier beginnt der Austausch.',
      careEyebrow: '01 / Unsere Leistungen', careTitle: 'Versorgung, die<br><em>mit Ihnen wächst.</em>',
      careHormoneTitle: 'Hormongesundheit und Wechseljahre', careMenopause: 'Begleitung in der Perimenopause und Menopause', careHRT: 'Hormonersatztherapie (HRT)', carePMOS: 'PMOS (Polyendocrine Metabolic Ovarian Syndrome, früher PCOS) und endokrinologische Abklärung', careHormoneChanges: 'Hormonbedingte Veränderungen von Stimmung, Schlaf und Gewicht',
      careGynecologyTitle: 'Gynäkologische Versorgung', careCervicalScreening: 'Zervixscreening (HPV / TCT / Kolposkopie)', careEndometrial: 'Menstruationsstörungen und Erkrankungen der Gebärmutterschleimhaut', careGynecologicConditions: 'Gebärmuttermyome, Eierstockzysten und Endometriose', careVaginitis: 'Vaginitis und Hauterkrankungen der Vulva',
      careFertilityTitle: 'Reproduktive Gesundheit und Fertilität', careFertilityAssessment: 'Fertilitätsdiagnostik (AMH und ovarielle Reserve)', carePreconception: 'Kinderwunschplanung und präkonzeptionelle Beratung', careEarlyPregnancy: 'Betreuung in der frühen Schwangerschaft (bis zur 12. Woche)', careHighRiskPregnancy: 'Beratung bei Risikoschwangerschaften', careFertilityPreservation: 'Fertilitätserhalt',
      careContraceptionTitle: 'Verhütung und Familienplanung', careIUD: 'Intrauterinpessare (IUDs)', careImplant: 'Verhütungsimplantate', careContraceptiveMedication: 'Individuelle Auswahl von Verhütungsmedikamenten',
      careSexualTitle: 'Sexuelle und vulvovaginale Gesundheit', careSexualPain: 'Schmerzen beim Sex (Dyspareunie und Vaginismus)', careVulvarSkin: 'Hauterkrankungen der Vulva (einschließlich Lichen sclerosus)', careGSM: 'Genitourinäres Menopausensyndrom (GSM)',
      careAdolescentTitle: 'Gesundheit von Jugendlichen', carePuberty: 'Beratung zur ersten Menstruation und Pubertät', careAdolescentMenstrual: 'Menstruationsbeschwerden bei Jugendlichen', careSexEducation: 'Sexualaufklärung und Verhütungsberatung',
      careSurgeryTitle: 'Minimalinvasive Verfahren', careHysteroscopy: 'Hysteroskopie', careLaparoscopy: 'Laparoskopie', careMinimallyInvasive: 'Minimalinvasive Behandlung von Myomen und Zysten',
      carePelvicTitle: 'Beckenbodengesundheit', carePelvicAssessment: 'Beurteilung der Beckenbodenfunktion', careIncontinence: 'Leichte Harninkontinenz', carePostpartumPelvic: 'Beckenbodenrehabilitation nach der Geburt',
      carePreventiveTitle: 'Prävention für Frauen', careBone: 'Knochendichte und Knochengesundheit', careCardiovascular: 'Beurteilung kardiovaskulärer und menopausenbezogener Risiken', careChronic: 'Chronische Erkrankungen und hormonelle Behandlung', careLifestyle: 'Gewicht und Lebensstilmedizin',
      workEyebrow: '03 / Unser Engagement', workTitle: 'Über die Praxis<br><em>hinaus.</em>', workFeatureType: 'Gemeinsam handeln',
      effortCommunity: 'Gesundheitsbildung in der Gemeinschaft', effortCommunityBody: 'Dr. Ferguson und das Team halten regelmäßig Vorträge zur Frauengesundheit in der Gemeinschaft. Sie vermitteln verständliches, praxisnahes Wissen und schaffen Raum für Fragen und offenen Austausch.',
      effortMDT: 'Multidisziplinärer Austausch', effortMDTBody: 'Auf den Plattformen unserer Partnerkrankenhäuser bringen wir Kolleginnen und Kollegen verschiedener Fachrichtungen zu multidisziplinären Teamdiskussionen (MDT) zusammen, um Perspektiven auszutauschen und komplexe klinische Fragen zu erörtern.',
      effortCME: 'Gemeinsam lernen', effortCMEBody: 'In Diskussionen zur medizinischen Fortbildung (CME) teilen wir klinisches Wissen und Erfahrungen, unterstützen kontinuierliches Lernen und stärken die Verbindungen zwischen medizinischen Fachkräften.',
      insightsEyebrow: 'Artikel und Videos', insightsTitle: 'Gesundheit verstehen', insightsIntro: 'Etwas mehr Wissen, ein klarerer Blick. Entdecken Sie unsere Artikelübersichten und unser Video zu den Wechseljahren.',
      insightBone: 'Stiller Knochenverlust nach den Wechseljahren', insightFertility: 'Fertilität nach dem 35. Lebensjahr', insightProtein: 'Nach 50 ist Eiweiß wichtiger, als Sie denken', insightVideo: 'Video: Stimmungsschwankungen oder Depression?',
      insightsUpdates: 'Neue Artikel, Videos und Nachrichten finden Sie auf unserem offiziellen WeChat-Konto.',
      eventsEyebrow: 'Neuigkeiten und Veranstaltungen', eventDate: '24. Oktober 2026 · 14:00–16:00 Uhr (Shanghai)', eventIntro: 'Ein Gesundheitsvortrag von Ferguson Plus für Familien mit Kindern von 6 bis 18 Jahren zu Jugendhaut, kindlichem Sehvermögen, Haltung und Bewegung.', eventLink: 'Vortragsdetails und Anmeldung',
      plusIntro: 'Eine multidisziplinäre Gesundheitsgruppe, die Dr. Ferguson gemeinsam mit weiteren medizinischen Fachkräften zusammengebracht hat.', plusDetailsTitle: 'Fachgebiete und Ansatz', plusSpecialties: 'Frauengesundheit · Allgemeinmedizin · Dermatologie · Venengesundheit · Ernährung · Physiotherapie',
      plusCulture: 'Mitgefühl über Kulturen hinweg', plusScience: 'Wissenschaft mit Verständnis', plusJourney: 'Ein gemeinsamer Weg zur Gesundheit', plusLink: 'Ferguson Plus entdecken',
      contactEyebrow: 'Ein guter Anfang', contactTitle: 'Gehen wir den nächsten<br><em>Schritt gemeinsam.</em>', contactBody: 'Für einen Termin scannen Sie den untenstehenden Klinikcode in WeChat. Für weitere Informationen kontaktieren Sie uns per E-Mail. Unser offizielles WeChat-Konto teilt Neuigkeiten und aktuelle Informationen.',
      locationsTitle: 'Wo Sie uns finden', clinic1Name: '1. Am-Sino Ding Xiang Clinic', clinic1Address: '3. Etage, Gebäude 6,<br>800 Hua Shan Road', clinic1Entrance: '(Eingang an der Zhen Ning Road)', clinic1Appointment: 'Mit WeChat scannen und Termin buchen', clinic2Name: '2. Parkway MediCentre Xintiandi', clinic2Address: '3. Etage, Shanghai Plaza,<br>138 Middle Huaihai Road.', clinic2Appointment: 'Mit WeChat scannen und Termin buchen',
      connectedTitle: 'Bleiben wir in Kontakt', wechatTitle: 'Offizielles WeChat-Konto', wechatBody: 'Für Neuigkeiten scannen und folgen.', socialXiaohongshu: 'Xiaohongshu · 小红书', footerMessage: 'Because We Care', backTop: 'Nach oben', lockPreview: 'Vorschau sperren'
    },
    es: {
      brandHome: 'Inicio de Ferguson Women’s Health', mainNavigation: 'Navegación principal', mobileNavigation: 'Navegación móvil', discoverMore: 'Descubre más',
      plusLogoAlt: 'Logotipo de Ferguson Plus', clinic1QrAlt: 'Código QR para citas en Am-Sino', clinic2QrAlt: 'Código QR para citas en Parkway', wechatQrAlt: 'Código QR de la cuenta oficial de WeChat de Ferguson Women’s Health',
      languageChoice: 'Elegir idioma', skip: 'Ir al contenido', navAbout: 'Conoce a la Dra. Ferguson', navCare: 'Áreas de atención', navWork: 'Nuestro compromiso', navContact: 'Contacta con nosotros',
      heroEyebrow: 'Un enfoque personal de la salud de la mujer', heroTitle: 'Para cada etapa<br><em>de tu vida.</em>',
      heroWhoTitle: 'Quiénes somos', heroIntro: 'Somos un equipo dedicado a la salud de la mujer, comprometido con una comunicación clara, una atención basada en la evidencia y un acompañamiento a largo plazo.', heroCta: 'Descubre nuestra atención',
      missionTitle: 'Nuestra misión', missionBody: 'Ofrecer una atención fiable y basada en la evidencia que ayude a cada mujer a comprender su cuerpo y a tomar decisiones sobre su salud con confianza.',
      visionTitle: 'Nuestra visión', visionBody: 'Acercar los estándares internacionales de atención a la salud de la mujer a todas las mujeres, apoyando su salud y calidad de vida.',
      heroLocation: 'Shanghái, China', portraitName: 'Michelle Lu-Ferguson', signatureDetail: 'MD, FACOG · Obstetricia y ginecología · Salud de la mujer', heroBottom: 'Experiencia. Empatía. Un poco más de comprensión.',
      aboutEyebrow: '02 / Conoce a la Dra. Ferguson', aboutTitle: 'Médica.<br>A tu escucha.<br><em>A tu lado.</em>',
      profileName: 'Dra. Michelle Lu-Ferguson, MD, FACOG', profileRole: 'Fundadora y presidenta, Ferguson Women’s Health',
      aboutBody: 'La Dra. Michelle Lu-Ferguson es <strong>especialista en obstetricia y ginecología certificada en Estados Unidos (board-certified)</strong> y <strong>Fellow del American College of Obstetricians and Gynecologists (FACOG).</strong> Con décadas de experiencia clínica en Estados Unidos y China, se dedica a impulsar una atención a la salud de la mujer basada en la evidencia y abierta a distintas culturas.',
      aboutBody2: 'Su práctica actual abarca todo el espectro de la salud de la mujer, con especial atención a la salud endocrina y hormonal, el manejo de la menopausia, el PMOS (Polyendocrine Metabolic Ovarian Syndrome), el diagnóstico y tratamiento ginecológicos, la fertilidad y el asesoramiento preconcepcional, la anticoncepción y la planificación familiar, la salud sexual y vulvovaginal, la ginecología de la adolescencia, los procedimientos ginecológicos mínimamente invasivos, la salud del suelo pélvico y la prevención a largo plazo. También ofrece consultas para situaciones prenatales complejas y embarazos de alto riesgo, con orientación clara y apoyo individualizado.',
      profileDetailsTitle: 'Áreas clínicas y formación médica', profileFocusTitle: 'Áreas clínicas', profileTrainingTitle: 'Formación y docencia médica',
      profileDegree: 'La Dra. Lu-Ferguson obtuvo su título de <strong>Doctor of Medicine</strong> en la Medical University of Ohio.',
      profileResidency: 'Completó su residencia en obstetricia y ginecología en la Rutgers Robert Wood Johnson Medical School, un importante centro médico académico de Estados Unidos. Después se incorporó al equipo docente, participando en la atención clínica, la educación médica y la investigación clínica; esta experiencia sigue marcando su estilo clínico riguroso y basado en la evidencia.',
      profileTraining: 'Al principio de su formación académica, cursó estudios premédicos en Peking University y continuó en Peking Union Medical College, una de las principales facultades de medicina de China. Más adelante recibió formación en investigación de nivel doctoral en New York University, reforzando sus bases en ciencia médica e investigación clínica.',
      profileApproachTitle: 'Enfoque de atención', profileApproach: 'Reconocida por sus rigurosos estándares clínicos, su formación internacional y su comunicación cuidadosa, goza de una gran consideración tanto en las comunidades locales como entre las personas expatriadas.',
      careClosing: 'Comprender tus necesidades. Acompañarte en cada etapa.', aboutClosing: 'Experiencia que escucha. Atención que se siente personal.', workClosing: 'Compartir conocimientos. Conectar comunidades.', contactClosing: 'Tus preguntas son bienvenidas. Aquí empieza el diálogo.',
      careEyebrow: '01 / Áreas de atención', careTitle: 'Una atención que crece<br><em>contigo.</em>',
      careHormoneTitle: 'Salud hormonal y menopausia', careMenopause: 'Atención en la perimenopausia y la menopausia', careHRT: 'Terapia hormonal sustitutiva (HRT)', carePMOS: 'PMOS (Polyendocrine Metabolic Ovarian Syndrome, antes PCOS) y evaluación endocrina', careHormoneChanges: 'Cambios del ánimo, el sueño y el peso relacionados con las hormonas',
      careGynecologyTitle: 'Atención ginecológica', careCervicalScreening: 'Cribado cervical (HPV / TCT / colposcopia)', careEndometrial: 'Trastornos menstruales y enfermedades del endometrio', careGynecologicConditions: 'Miomas uterinos, quistes ováricos y endometriosis', careVaginitis: 'Vaginitis y enfermedades de la piel de la vulva',
      careFertilityTitle: 'Salud reproductiva y fertilidad', careFertilityAssessment: 'Evaluación de la fertilidad (AMH y reserva ovárica)', carePreconception: 'Planificación y asesoramiento antes del embarazo', careEarlyPregnancy: 'Atención al inicio del embarazo (hasta las 12 semanas)', careHighRiskPregnancy: 'Consulta sobre embarazo de alto riesgo', careFertilityPreservation: 'Preservación de la fertilidad',
      careContraceptionTitle: 'Anticoncepción y planificación familiar', careIUD: 'Dispositivos intrauterinos (DIU)', careImplant: 'Implantes anticonceptivos', careContraceptiveMedication: 'Elección individualizada de medicamentos anticonceptivos',
      careSexualTitle: 'Salud sexual y vulvovaginal', careSexualPain: 'Dolor sexual (dispareunia y vaginismo)', careVulvarSkin: 'Enfermedades de la piel de la vulva (incluido el liquen escleroso)', careGSM: 'Síndrome genitourinario de la menopausia (GSM)',
      careAdolescentTitle: 'Salud de las adolescentes', carePuberty: 'Asesoramiento sobre la primera menstruación y la pubertad', careAdolescentMenstrual: 'Problemas menstruales en la adolescencia', careSexEducation: 'Educación sexual y orientación sobre anticoncepción',
      careSurgeryTitle: 'Procedimientos mínimamente invasivos', careHysteroscopy: 'Histeroscopia', careLaparoscopy: 'Laparoscopia', careMinimallyInvasive: 'Tratamiento mínimamente invasivo de miomas y quistes',
      carePelvicTitle: 'Salud del suelo pélvico', carePelvicAssessment: 'Evaluación de la función del suelo pélvico', careIncontinence: 'Incontinencia urinaria leve', carePostpartumPelvic: 'Rehabilitación del suelo pélvico después del parto',
      carePreventiveTitle: 'Salud preventiva de la mujer', careBone: 'Densidad y salud ósea', careCardiovascular: 'Evaluación del riesgo cardiovascular y relacionado con la menopausia', careChronic: 'Enfermedades crónicas y manejo hormonal', careLifestyle: 'Peso y medicina del estilo de vida',
      workEyebrow: '03 / Nuestro compromiso', workTitle: 'Más allá<br><em>de la consulta.</em>', workFeatureType: 'Trabajamos juntos',
      effortCommunity: 'Educación para la salud en la comunidad', effortCommunityBody: 'La Dra. Ferguson y el equipo dan charlas sobre la salud de la mujer con regularidad en la comunidad, compartiendo conocimientos claros y prácticos y dejando espacio para las preguntas y el diálogo abierto.',
      effortMDT: 'Intercambio multidisciplinar', effortMDTBody: 'En las plataformas de hospitales colaboradores, reunimos a colegas de distintas especialidades para debates de equipos multidisciplinares (MDT), intercambiando perspectivas y explorando cuestiones clínicas complejas.',
      effortCME: 'Aprender juntos', effortCMEBody: 'Mediante debates de educación médica continua (CME), compartimos conocimientos y experiencias clínicas, apoyamos el aprendizaje continuo y reforzamos los vínculos entre profesionales de la salud.',
      insightsEyebrow: 'Artículos y vídeos', insightsTitle: 'Comprender tu salud', insightsIntro: 'Un poco de conocimiento, una perspectiva más clara. Explora nuestros resúmenes de artículos y el vídeo sobre la menopausia.',
      insightBone: 'La pérdida ósea silenciosa después de la menopausia', insightFertility: 'La fertilidad después de los 35 años', insightProtein: 'Después de los 50, las proteínas importan más de lo que crees', insightVideo: 'Vídeo: ¿cambios de ánimo o depresión?',
      insightsUpdates: 'Para nuevos artículos, vídeos y noticias, sigue nuestra cuenta oficial de WeChat.',
      eventsEyebrow: 'Noticias y eventos', eventDate: '24 de octubre de 2026 · 14:00–16:00 (Shanghái)', eventIntro: 'Una charla de salud de Ferguson Plus para familias con niños de 6 a 18 años, sobre la piel adolescente, la visión infantil, la postura y el movimiento.', eventLink: 'Detalles e inscripción',
      plusIntro: 'Un grupo de salud multidisciplinar reunido por la Dra. Ferguson y otros profesionales médicos.', plusDetailsTitle: 'Especialidades y enfoque', plusSpecialties: 'Salud de la mujer · Medicina general · Dermatología · Salud venosa · Nutrición · Fisioterapia',
      plusCulture: 'Compasión entre culturas', plusScience: 'Ciencia con comprensión', plusJourney: 'Un camino compartido hacia la salud', plusLink: 'Descubre Ferguson Plus',
      contactEyebrow: 'Un buen punto de partida', contactTitle: 'Demos el siguiente<br><em>paso, juntos.</em>', contactBody: 'Para pedir cita, escanea en WeChat el código de la clínica que aparece abajo. Para más información, contacta por correo electrónico. Nuestra cuenta oficial de WeChat comparte noticias y novedades.',
      locationsTitle: 'Dónde encontrarnos', clinic1Name: '1. Am-Sino Ding Xiang Clinic', clinic1Address: '3.ª planta, edificio 6,<br>800 Hua Shan Road', clinic1Entrance: '(Entrada por Zhen Ning Road)', clinic1Appointment: 'Escanea con WeChat para pedir cita', clinic2Name: '2. Parkway MediCentre Xintiandi', clinic2Address: '3.ª planta, Shanghai Plaza,<br>138 Middle Huaihai Road.', clinic2Appointment: 'Escanea con WeChat para pedir cita',
      connectedTitle: 'Sigamos en contacto', wechatTitle: 'Cuenta oficial de WeChat', wechatBody: 'Escanea para seguir las novedades.', socialXiaohongshu: 'Xiaohongshu · 小红书', footerMessage: 'Because We Care', backTop: 'Volver arriba', lockPreview: 'Bloquear la vista previa'
    }
  };
  let language = 'en';
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const menuLabels = {
    en: ['Open navigation', 'Close navigation'], zh: ['打开导航', '关闭导航'],
    fr: ['Ouvrir le menu', 'Fermer le menu'], de: ['Menü öffnen', 'Menü schließen'], es: ['Abrir el menú', 'Cerrar el menú']
  };
  function updateMenuLabel() {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-label', menuLabels[language][Number(open)]);
  }
  function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); updateMenuLabel(); }
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
      button.textContent = { en: 'Try locking again', zh: '请重试锁定', fr: 'Réessayez de verrouiller', de: 'Erneut sperren', es: 'Intenta bloquear de nuevo' }[language];
      button.disabled = false;
    }
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());
  window.FergusonLanguages.init({
    translations,
    titles: { en: "Ferguson Women's Health", zh: 'Ferguson 女性健康', fr: "Ferguson Women's Health", de: "Ferguson Women's Health", es: "Ferguson Women's Health" },
    onChange(code) { language = code; updateMenuLabel(); }
  });
})();
