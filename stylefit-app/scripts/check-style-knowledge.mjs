import assert from 'node:assert/strict';
import { STYLE_KNOWLEDGE } from '../edge-functions/lib/style-knowledge-data.js';
import { matchesRecommendationMode, scoreOutfitMatch, scoreRecommendationMode } from '../edge-functions/lib/style-knowledge.js';

const requiredFields = ['tops', 'bottoms', 'shoes', 'accessories', 'colors', 'materials', 'fits', 'rules', 'avoid', 'scenes'];

assert.equal(Object.keys(STYLE_KNOWLEDGE).length, 12);
for (const knowledge of Object.values(STYLE_KNOWLEDGE)) {
  for (const field of requiredFields) assert.ok(Array.isArray(knowledge[field]) && knowledge[field].length > 0, `${knowledge.label}.${field}`);
  assert.ok(knowledge.gender?.male && knowledge.gender?.female, `${knowledge.label}.gender`);
}

const profile = { gender: 'male', stylePreference: 'minimal', occasion: 'daily', bodyType: 'slim', mode: 'advanced' };
const blueprint = { style: 'Clean Fit', colors: ['白', '灰'], fit: '直筒', occasion: '日常' };
const template = { name: 'Clean Fit' };
const cleanTop = { title: '男士米白纯色针织Polo 微宽松', category: 'top', volume: 800, rating: 4.8 };
const noisyTop = { title: '男士荧光大logo卡通夸张印花T恤', category: 'top', volume: 800, rating: 4.8 };

assert.ok(scoreRecommendationMode(cleanTop, profile, blueprint, template) > scoreRecommendationMode(noisyTop, profile, blueprint, template));
assert.equal(matchesRecommendationMode(noisyTop, profile), true);
assert.ok(scoreOutfitMatch([
  { candidate: cleanTop },
  { candidate: { title: '男士灰色垂感直筒西裤', category: 'bottom' } },
  { candidate: { title: '男士简洁白色德训鞋', category: 'shoes' } },
], profile, blueprint, template) > scoreOutfitMatch([
  { candidate: noisyTop },
  { candidate: { title: '男士紧身荧光束脚裤', category: 'bottom' } },
  { candidate: { title: '男士夸张撞色跑鞋', category: 'shoes' } },
], profile, blueprint, template));

console.log('Style Knowledge v1 checks passed');
