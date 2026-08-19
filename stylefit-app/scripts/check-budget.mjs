import assert from 'node:assert/strict';
import { onRequest } from '../edge-functions/api/recommend.js';

const originalFetch = globalThis.fetch;

function productForKeyword(keyword, index) {
  const isBottom = /裤|裙/.test(keyword);
  const isShoes = /鞋|靴/.test(keyword);
  const price = isBottom ? 100 : isShoes ? 70 : 120;
  const title = isBottom ? '男士通勤西裤' : isShoes ? '男士商务皮鞋' : '男士商务衬衫';
  return {
    item_id: `${title}-${index}`,
    publish_info: { coupon_share_url: 'https://uland.taobao.com/coupon/example' },
    price_promotion_info: { zk_final_price: String(price), final_promotion_price: String(price) },
    item_basic_info: { title, pict_url: 'https://img.alicdn.com/example.jpg', shop_title: '测试店铺', volume: 12, category_name: '服装' },
  };
}

globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('qianfan.baidubce.com')) {
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      summary: '预算内的简洁通勤搭配。',
      style: '商务通勤',
      outfits: [{
        name: '基础商务搭配',
        stylingTip: '保持上浅下深的利落比例。',
        topKeywords: ['男士商务衬衫'],
        bottomKeywords: ['男士通勤西裤'],
        shoesKeywords: ['男士商务皮鞋'],
      }],
    }) } }] }));
  }

  const keyword = new URLSearchParams(options.body).get('q') || '';
  const items = Array.from({ length: 20 }, (_, index) => productForKeyword(keyword, index));
  return new Response(JSON.stringify({
    tbk_dg_material_optional_upgrade_response: { result_list: { map_data: items }, total_results: items.length },
  }));
};

async function request(budget, occasion) {
  const response = await onRequest({
    request: new Request('https://stylefit.example/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { gender: 'male', bodyType: 'standard', skinTone: 'natural', stylePreference: 'business', occasion, season: 'autumn', budget } }),
    }),
    env: { QIANFAN_API_KEY: 'test', TAOBAO_APP_KEY: 'test', TAOBAO_APP_SECRET: 'test', TAOBAO_PID: 'mm_1_2_3' },
  });
  return response.json();
}

try {
  const withinBudget = await request(300, 'work');
  assert.equal(withinBudget.status, 'ok');
  assert.ok(withinBudget.recommendation.outfits.length >= 1);
  for (const outfit of withinBudget.recommendation.outfits) {
    const selected = outfit.items.map((item) => withinBudget.candidates.find((candidate) => candidate.id === item.id));
    assert.ok(selected.every(Boolean));
    assert.equal(new Set(selected.map((item) => item.category)).size, selected.length);
    assert.ok(selected.some((item) => item.category === 'top'));
    assert.ok(selected.some((item) => item.category === 'bottom'));
    assert.ok(selected.reduce((total, item) => total + item.price, 0) <= 300);
  }

  const overBudget = await request(200, 'daily');
  assert.equal(overBudget.status, 'fallback');
  assert.equal(overBudget.reason, '本场景暂未找到满足预算的上装和下装');
  console.log('Budget composition checks passed');
} finally {
  globalThis.fetch = originalFetch;
}
