import { STYLE_KNOWLEDGE } from './style-knowledge-data.js';

const categoryField = { top: 'tops', bottom: 'bottoms', shoes: 'shoes', accessory: 'accessories', outerwear: 'tops', dress: 'tops' };
const fitTags = {
  oversize: ['oversize', '宽松', '廓形', '落肩'],
  straight: ['直筒', '垂感', '合体', '利落'],
  wide: ['阔腿', '宽腿', '宽版', '宽直筒'],
  slim: ['修身', '微修身', '收腰'],
};

function textOf(...values) {
  return values.flat().filter(Boolean).join(' ').toLowerCase();
}

function countMatches(text, terms = []) {
  return terms.reduce((count, term) => count + (text.includes(String(term).toLowerCase()) ? 1 : 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function knowledgeEntries(profile, blueprint, template) {
  const context = textOf(profile?.stylePreference, profile?.occasion, blueprint?.style, blueprint?.fit, blueprint?.formality, template?.name);
  const matched = Object.entries(STYLE_KNOWLEDGE).filter(([, knowledge]) =>
    [knowledge.label, ...knowledge.aliases].some((term) => context.includes(String(term).toLowerCase())),
  );
  return matched.length ? matched : [['clean_fit', STYLE_KNOWLEDGE.clean_fit]];
}

function termsForCandidate(knowledge, candidate, profile) {
  const field = categoryField[candidate?.category] || 'tops';
  const gender = profile?.gender === 'female' ? 'female' : 'male';
  return [...(knowledge[field] || []), ...(knowledge.gender?.[gender]?.[field] || [])];
}

export function analyzeStyleKnowledge(title, category) {
  const text = textOf(title);
  const materialTerms = [...new Set(Object.values(STYLE_KNOWLEDGE).flatMap((knowledge) => knowledge.materials))];
  const fitTerms = [...new Set(Object.values(STYLE_KNOWLEDGE).flatMap((knowledge) => knowledge.fits))];
  return {
    category: category === 'bottom' || /裤|牛仔|工装|西裤|休闲裤|半身裙/.test(text) ? 'bottom' : category,
    fit: fitTerms.filter((term) => text.includes(String(term).toLowerCase())),
    material: materialTerms.filter((term) => text.includes(String(term).toLowerCase())),
  };
}

export function getStyleTags(profile, blueprint, template) {
  return knowledgeEntries(profile, blueprint, template).map(([id]) => id).slice(0, 3);
}

export function getStyleTagLabels(profile, blueprint, template) {
  return knowledgeEntries(profile, blueprint, template).map(([, knowledge]) => knowledge.label).slice(0, 3);
}

export function getCandidateStyleProfile(candidate) {
  const text = textOf(candidate?.title);
  const style = Object.entries(STYLE_KNOWLEDGE)
    .filter(([, knowledge]) => countMatches(text, [...knowledge.aliases, ...knowledge.tops, ...knowledge.bottoms, ...knowledge.shoes]) > 0)
    .map(([id]) => id);
  const fit = Object.entries(fitTags).filter(([, terms]) => countMatches(text, terms) > 0).map(([id]) => id);
  const premiumTerms = [...new Set(Object.values(STYLE_KNOWLEDGE).flatMap((knowledge) => knowledge.materials))];
  const premiumSignals = countMatches(text, [...premiumTerms, '简约', '纯色', '剪裁', '质感', '垂感']);
  return { style, fit, qualityLevel: premiumSignals >= 2 ? 'premium' : 'basic' };
}

export function matchesRecommendationMode() {
  return true;
}

export function scoreRecommendationMode(candidate, profile, blueprint, template) {
  const text = textOf(candidate?.title, candidate?.tags);
  const scores = knowledgeEntries(profile, blueprint, template).map(([, knowledge]) => {
    const style = clamp(countMatches(text, [...knowledge.aliases, ...termsForCandidate(knowledge, candidate, profile)]) * 8, 0, 30);
    const fit = clamp(countMatches(text, knowledge.fits) * 7, 0, 20);
    const color = clamp(countMatches(text, [...knowledge.colors, ...(blueprint?.colors || [])]) * 5, 0, 15);
    const material = clamp(countMatches(text, knowledge.materials) * 6, 0, 15);
    const scene = clamp(countMatches(textOf(text, profile?.occasion, blueprint?.occasion), knowledge.scenes) * 4, 0, 10);
    const quality = clamp(Math.log10(Math.max(Number(candidate?.volume) || 0, 1) + 1) * 2 + (candidate?.rating || 0), 0, 10);
    return clamp(style + fit + color + material + scene + quality - countMatches(text, knowledge.avoid) * 7, 0, 100);
  });
  return Math.max(...scores, 0);
}

export function scoreBottomKnowledge(candidate, profile, blueprint, template) {
  if (analyzeStyleKnowledge(candidate?.title, candidate?.category).category !== 'bottom') return 0;
  return scoreRecommendationMode(candidate, profile, blueprint, template) * 0.25;
}

export function scoreOutfitMatch(items, profile, blueprint, template) {
  if (!items.length) return 0;
  const entries = knowledgeEntries(profile, blueprint, template);
  const itemScores = items.map(({ candidate }) => scoreRecommendationMode(candidate, profile, blueprint, template));
  const averageItemScore = itemScores.reduce((total, score) => total + score, 0) / itemScores.length;
  const combinedText = textOf(items.map(({ candidate }) => candidate?.title));
  const coordination = Math.max(...entries.map(([, knowledge]) => clamp(
    12 + countMatches(combinedText, [...knowledge.rules, ...knowledge.fits, ...knowledge.materials]) * 3 - countMatches(combinedText, knowledge.avoid) * 5,
    0,
    25,
  )), 0);
  const colors = [...new Set(entries.flatMap(([, knowledge]) => knowledge.colors).concat(blueprint?.colors || []))];
  const colorScore = clamp(8 + countMatches(combinedText, colors) * 3, 0, 20);
  const bodyTerms = profile?.bodyType === 'slim' ? ['宽松', '直筒', '垂感', '层次']
    : profile?.bodyType === 'plus' ? ['直筒', '垂感', '深色', '高腰']
      : ['合体', '直筒', '高腰', '简约'];
  const bodyScore = clamp(7 + countMatches(combinedText, bodyTerms) * 3, 0, 20);
  const sceneTerms = entries.flatMap(([, knowledge]) => knowledge.scenes);
  const sceneScore = clamp(7 + countMatches(textOf(combinedText, profile?.occasion, blueprint?.occasion), sceneTerms) * 2, 0, 15);
  return clamp(averageItemScore * 0.2 + coordination + colorScore + bodyScore + sceneScore, 0, 100);
}
