import assert from 'node:assert/strict';
import { onRequest } from '../edge-functions/api/recommend.js';

const originalFetch = globalThis.fetch;
let aiCalls = 0;
let taobaoCalls = 0;
let omitShoes = false;
let omitBottom = false;
let activeGender = 'male';

function titleFor(query) {
  const prefix = activeGender === 'female' ? '女士' : '男士';
  if (/鞋|靴/.test(query)) return `${query} 真皮休闲鞋`;
  if (/裤|裙/.test(query)) return `${query} 垂感直筒长裤`;
  if (/包|帽|围巾|腰带|领带|袜/.test(query)) return `${query} 质感真皮腰带`;
  return `${query || `${prefix}商务衬衫`} 棉质合体上衣`;
}

function planFor(gender) {
  const prefix = gender === 'female' ? '女士' : '男士';
  return {
    summary: '以清晰比例建立舒适且利落的场景穿搭。',
    blueprints: [
      {
        name: '利落通勤搭配', style: '商务通勤', occasion: '职场', colors: ['白色', '深蓝'], fit: '合体', formality: '正式',
        keywords: { top: `${prefix}商务衬衫`, bottom: `${prefix}通勤西裤`, shoes: `${prefix}通勤皮鞋`, accessory: `${prefix}通勤腰带` },
      },
      {
        name: '简约运动通勤', style: '简约运动', occasion: '日常', colors: ['灰色', '白色'], fit: '直筒', formality: '休闲',
        keywords: { top: `${prefix}简约Polo`, bottom: `${prefix}锥形长裤`, shoes: `${prefix}简约运动鞋`, accessory: `${prefix}通勤帆布包` },
      },
      {
        name: '复古休闲层次', style: '复古休闲', occasion: '日常', colors: ['棕色', '卡其'], fit: '宽松', formality: '休闲',
        keywords: { top: `${prefix}复古针织上衣`, bottom: `${prefix}复古直筒裤`, shoes: `${prefix}复古乐福鞋`, accessory: `${prefix}复古皮带` },
      },
    ],
  };
}

globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('qianfan.baidubce.com')) {
    aiCalls += 1;
    const requestBody = JSON.parse(options.body);
    activeGender = JSON.parse(requestBody.messages.at(-1).content).profile.gender;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(planFor(activeGender)) } }] }));
  }

  taobaoCalls += 1;
  const params = new URLSearchParams(options.body);
  const title = titleFor(params.get('q') || '');
  const variants = ['黑色直筒', '卡其宽松', '深蓝修身'];
  const isShoeQuery = /鞋|靴/.test(title);
  const isBottomQuery = /裤|裙/.test(title);
  const isAccessoryQuery = /包|帽|围巾|腰带|领带|袜/.test(title);
  const items = (omitShoes && isShoeQuery) || (omitBottom && isBottomQuery)
    ? []
    : Array.from({ length: 20 }, (_, index) => ({
      item_id: `${taobaoCalls}-${index}`,
      publish_info: { coupon_share_url: 'https://uland.taobao.com/coupon/example' },
      price_promotion_info: { zk_final_price: '109', final_promotion_price: '89' },
      item_basic_info: { title: isShoeQuery && index < 2 ? `${activeGender === 'female' ? '女士' : '男士'}${index ? '皮鞋鞋垫' : '运动袜子'}` : isAccessoryQuery && index === 0 ? `${activeGender === 'female' ? '女士' : '男士'}草帽 沙滩遮阳帽` : `${title} ${variants[index % variants.length]}`, pict_url: 'https://img.alicdn.com/example.jpg', shop_title: `测试店铺${taobaoCalls}-${index % variants.length}`, volume: 12, category_name: '服装' },
    }));
  return new Response(JSON.stringify({
    tbk_dg_material_optional_upgrade_response: { result_list: { map_data: items }, total_results: items.length },
  }));
};

async function request(profile) {
  const response = await onRequest({
    request: new Request('https://stylefit.example/api/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }),
    }),
    env: { QIANFAN_API_KEY: 'test', TAOBAO_APP_KEY: 'test', TAOBAO_APP_SECRET: 'test', TAOBAO_PID: 'mm_1_2_3' },
  });
  return response.json();
}

try {
  const scenarios = [
    { gender: 'male', height: 175, weight: 70, stylePreference: 'sporty', occasion: 'daily', season: 'autumn', bodyType: 'standard', skinTone: 'medium', budget: 300 },
    { gender: 'male', height: 175, weight: 70, stylePreference: 'business', occasion: 'work', season: 'autumn', bodyType: 'standard', skinTone: 'medium', budget: 400 },
    { gender: 'female', height: 165, weight: 52, stylePreference: 'commute', occasion: 'work', season: 'autumn', bodyType: 'standard', skinTone: 'medium', budget: 300 },
    { gender: 'female', height: 165, weight: 52, stylePreference: 'preppy', occasion: 'campus', season: 'autumn', bodyType: 'standard', skinTone: 'medium', budget: 300 },
  ];
  for (const profile of scenarios) {
    const body = await request(profile);
    assert.equal(body.status, 'ok');
    assert.ok(body.candidates.length >= 3);
    assert.equal(body.recommendation.outfits.length, 3);
    assert.equal(new Set(body.recommendation.outfits.map((outfit) => outfit.name)).size, 3);
    const selectedIds = body.recommendation.outfits.flatMap((outfit) => outfit.items.map((item) => item.id));
    assert.ok(selectedIds.every((id) => id.startsWith('taobao-')));
    assert.equal(new Set(selectedIds).size, selectedIds.length);
    for (const category of ['top', 'bottom', 'shoes']) {
      const categoryItems = body.recommendation.outfits.flatMap((outfit) => outfit.items)
        .map((item) => body.candidates.find((candidate) => candidate.id === item.id))
        .filter((item) => item.category === category);
      assert.ok(new Set(categoryItems.map((item) => item.shopTitle)).size >= 2);
    }
    for (const outfit of body.recommendation.outfits) {
      const selected = outfit.items.map((item) => body.candidates.find((candidate) => candidate.id === item.id));
      assert.ok(selected.some((item) => item.category === 'top'));
      assert.ok(selected.some((item) => item.category === 'bottom'));
      assert.ok(selected.some((item) => item.category === 'shoes'));
      assert.equal(selected.some((item) => item.category === 'shoes' && /袜子?|鞋垫|鞋带|鞋套|鞋刷|鞋油|鞋盒|鞋撑|鞋饰/.test(item.title)), false);
      assert.equal(selected.some((item) => /草帽|沙滩|功能|露营/.test(item.title)), false);
      assert.ok(selected.every((item) => item.title.startsWith(profile.gender === 'female' ? '女士' : '男士')));
      assert.ok(selected.reduce((sum, item) => sum + item.couponPrice, 0) <= profile.budget);
    }
  }
  assert.equal(aiCalls, 4);
  assert.equal(taobaoCalls, 48);

  omitShoes = true;
  const withoutShoes = await request({ ...scenarios[0], budget: 301 });
  assert.equal(withoutShoes.status, 'ok');
  assert.ok(withoutShoes.recommendation.outfits.every((outfit) => outfit.items.length >= 2));

  omitBottom = true;
  const singleItems = await request({ ...scenarios[0], budget: 302 });
  assert.equal(singleItems.status, 'ok');
  assert.ok(singleItems.recommendation.outfits.every((outfit) => outfit.items.length === 1));
  assert.ok(singleItems.recommendation.outfits.every((outfit) => {
    const selected = outfit.items.map((item) => singleItems.candidates.find((candidate) => candidate.id === item.id));
    return selected.every((item) => item.category === 'top');
  }));
  console.log('Recommendation degradation checks passed');
} finally {
  globalThis.fetch = originalFetch;
}
