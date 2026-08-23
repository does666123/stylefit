const bottomKnowledge = {
  cleanFit: {
    match: ['clean fit', 'clean', '简约', '极简', 'minimal'],
    preferred: ['高腰', '直筒', '宽松', '垂感', '西裤', '休闲裤', '素色'],
    avoid: ['紧身', '束脚', '收口', '运动裤'],
  },
  oldMoney: {
    match: ['old money', 'quiet luxury', '老钱', '商务', '轻熟'],
    preferred: ['灰色', '卡其', '深色', '羊毛', '毛呢', '西裤', '宽直筒', '直筒'],
    avoid: ['大logo', '卡通', '破洞', '运动裤', '束脚'],
  },
  americanVintage: {
    match: ['美式', '复古', '街头', '工装'],
    preferred: ['水洗', '牛仔', '工装', '军裤', '宽版', '直筒'],
    avoid: ['紧身', '束脚'],
  },
};

const materialTerms = ['羊毛', '毛呢', '针织', '棉麻', '亚麻', '真皮', '灯芯绒', '牛仔'];
const fitTerms = ['高腰', '宽直筒', '直筒', '阔腿', '宽松', '垂感', '修身', '紧身', '束脚', '运动'];
const basicColors = ['黑', '白', '灰', '米', '卡其', '棕', '深蓝', '藏蓝'];
const advancedRejectTerms = /大logo|大标|卡通|夸张印花|荧光|爆款|网红|地摊|清仓|直播款|速干|训练服|篮球服|足球服|健身服/;
const styleTagRules = {
  clean_fit: { label: 'Clean Fit', terms: ['clean fit', 'clean', '简约', '极简', '纯色', '基础', '直筒', '小白鞋'] },
  old_money: { label: 'Old Money', terms: ['old money', 'quiet luxury', '老钱', '针织', '羊毛', '衬衫', '西裤', '乐福鞋'] },
  cityboy: { label: 'Cityboy', terms: ['cityboy', 'city boy', '城市', '宽松', '廓形', '工装', '衬衫'] },
  american_vintage: { label: '美式复古', terms: ['美式', '复古', '水洗', '牛仔', '工装', '灯芯绒', '板鞋'] },
  korean: { label: '韩系', terms: ['韩系', '轻熟', '短外套', '阔腿', '简洁', '垂感'] },
  french: { label: '法式', terms: ['法式', '优雅', '针织', '衬衫', '低饱和', '玛丽珍'] },
};

const outfitKnowledge = {
  cleanFit: {
    match: ['clean fit', 'clean', '简约', '极简', 'minimal'],
    preferred: ['直筒', '宽松', '垂感', '基础', '纯色', '小白鞋', '休闲鞋'],
    avoid: ['大logo', '紧身', '束脚', '收口', '运动裤'],
  },
  oldMoney: {
    match: ['old money', 'quiet luxury', '老钱', '商务', '轻熟'],
    preferred: ['羊毛', '毛呢', '针织', '衬衫', '西裤', '乐福鞋', '皮鞋', '卡其', '深蓝'],
    avoid: ['运动鞋', '球鞋', '潮牌', '街头', '大logo', '卡通'],
  },
  americanVintage: {
    match: ['美式', '复古', '街头', '工装'],
    preferred: ['工装', '牛仔', '水洗', '宽松', '直筒', '帆布鞋', '板鞋'],
    avoid: ['西装', '商务', '领带', '正装皮鞋'],
  },
};

function countMatches(text, terms) {
  return terms.filter((term) => text.includes(term)).length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function analyzeStyleKnowledge(title, category) {
  const text = String(title || '').toLowerCase();
  return {
    category: category === 'bottom' || /裤|牛仔|工装|西裤|休闲裤/.test(text) ? 'bottom' : category,
    fit: fitTerms.filter((term) => text.includes(term)),
    material: materialTerms.filter((term) => text.includes(term)),
  };
}

export function getStyleTags(profile, blueprint, template) {
  const context = [profile?.stylePreference, profile?.occasion, blueprint?.style, blueprint?.fit, blueprint?.formality, template?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const tags = Object.entries(styleTagRules)
    .filter(([, rule]) => rule.terms.some((term) => context.includes(term)))
    .map(([id]) => id);
  return tags.length ? tags : ['clean_fit'];
}

export function getStyleTagLabels(profile, blueprint, template) {
  return getStyleTags(profile, blueprint, template).map((tag) => styleTagRules[tag].label);
}

export function matchesRecommendationMode(candidate, profile) {
  if (profile?.mode !== 'advanced') return true;
  return !advancedRejectTerms.test(String(candidate?.title || '').toLowerCase());
}

export function scoreRecommendationMode(candidate, profile, blueprint, template) {
  if (profile?.mode !== 'advanced') return 0;
  const text = String(candidate?.title || '').toLowerCase();
  const styleMatches = getStyleTags(profile, blueprint, template)
    .reduce((count, tag) => count + countMatches(text, styleTagRules[tag].terms), 0);
  const refinedMatches = countMatches(text, ['羊毛', '毛呢', '针织', '棉麻', '亚麻', '真皮', '简约', '纯色', '剪裁', '垂感', '直筒']);
  return styleMatches * 4 + refinedMatches * 2;
}

export function scoreBottomKnowledge(candidate, profile, blueprint, template) {
  const knowledge = analyzeStyleKnowledge(candidate?.title, candidate?.category);
  if (knowledge.category !== 'bottom') return 0;

  const context = [profile?.stylePreference, blueprint?.style, blueprint?.fit, template?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const rule = Object.values(bottomKnowledge).find((item) => item.match.some((term) => context.includes(term)))
    || bottomKnowledge.cleanFit;
  const text = String(candidate?.title || '').toLowerCase();
  const preferred = countMatches(text, rule.preferred);
  const avoided = countMatches(text, rule.avoid);

  return preferred * 4 + knowledge.material.length * 2 - avoided * 5;
}

export function scoreOutfitMatch(items, profile, blueprint, template) {
  const text = items.map((item) => String(item?.candidate?.title || '')).join(' ').toLowerCase();
  const context = [profile?.stylePreference, blueprint?.style, blueprint?.fit, template?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const rule = Object.values(outfitKnowledge).find((item) => item.match.some((term) => context.includes(term)))
    || outfitKnowledge.cleanFit;
  const preferred = countMatches(text, rule.preferred);
  const avoided = countMatches(text, rule.avoid);
  const colors = [...(blueprint?.colors || []), ...basicColors];
  const colorMatches = countMatches(text, colors);
  const sceneTerms = profile?.occasion === 'work' ? ['通勤', '商务', '衬衫', '西裤', '皮鞋']
    : profile?.occasion === 'date' ? ['优雅', '轻熟', '简约', '乐福鞋']
      : ['休闲', '基础', '牛仔', 't恤', '运动鞋'];
  const sceneMatches = countMatches(text, sceneTerms);
  const bottom = items.find((item) => item?.candidate?.category === 'bottom')?.candidate;
  const bodyTerms = {
    slim: ['宽松', '直筒', '垂感'],
    standard: ['合体', '直筒', '简约'],
    athletic: ['合体', '直筒', '修身'],
    curvy: ['高腰', '垂感', '直筒'],
    plus: ['垂感', '直筒', '宽松', '深色'],
  };
  const bodyMatches = countMatches(String(bottom?.title || '').toLowerCase(), bodyTerms[profile?.bodyType] || []);

  const coordination = clamp(14 + preferred * 4 - avoided * 5, 0, 30);
  const colorMatch = clamp(8 + colorMatches * 3 - avoided * 2, 0, 20);
  const proportion = clamp(8 + bodyMatches * 4, 0, 20);
  const sceneMatch = clamp(7 + sceneMatches * 2, 0, 15);
  const bodyFit = clamp(7 + bodyMatches * 3, 0, 15);
  return coordination + colorMatch + proportion + sceneMatch + bodyFit;
}
