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

function countMatches(text, terms) {
  return terms.filter((term) => text.includes(term)).length;
}

export function analyzeStyleKnowledge(title, category) {
  const text = String(title || '').toLowerCase();
  return {
    category: category === 'bottom' || /裤|牛仔|工装|西裤|休闲裤/.test(text) ? 'bottom' : category,
    fit: fitTerms.filter((term) => text.includes(term)),
    material: materialTerms.filter((term) => text.includes(term)),
  };
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
