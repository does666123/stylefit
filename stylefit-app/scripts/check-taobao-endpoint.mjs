import assert from 'node:assert/strict';
import { createTopSign, TAOBAO_SCENES } from '../edge-functions/lib/taobao.js';
import { onRequest } from '../edge-functions/api/taobao/products.js';

assert.equal(createTopSign({ foo_bar: '3', foo: '1', bar: '2', foobar: '4' }, 'helloworld'), '5AAF1C690262A24768F5478B084C2C8A');

const response = await onRequest({
  request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work'),
  env: {},
});
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { error: '服务未配置' });

const invalidSceneResponse = await onRequest({
  request: new Request('https://stylefit.example/api/taobao/products?scene=arbitrary_query'),
  env: {},
});
assert.equal(invalidSceneResponse.status, 400);
assert.deepEqual(await invalidSceneResponse.json(), { error: '不支持的检索场景' });

const invalidCategoryResponse = await onRequest({
  request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work&category=anything'),
  env: {},
});
assert.equal(invalidCategoryResponse.status, 400);
assert.deepEqual(await invalidCategoryResponse.json(), { error: '不支持的商品分类' });
assert.equal(TAOBAO_SCENES.mens_work.queries.top, '男士 通勤 衬衫');
assert.equal(TAOBAO_SCENES.mens_work.queries.bottom, '男士 通勤 西裤');
assert.equal(TAOBAO_SCENES.mens_work.queries.shoes, '男士 通勤 皮鞋');
assert.equal(TAOBAO_SCENES.mens_work.queries.accessory, '男士 通勤 腰带 领带');

const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
let upstreamBody = '';
globalThis.fetch = async (_url, options) => {
  upstreamCalls += 1;
  upstreamBody = options.body;
  return new Response(JSON.stringify({
  error_response: { code: 15, sub_code: 'isv.invalid-app', msg: 'Invalid application credentials', request_id: 'safe-request-id' },
  }), { status: 200 });
};
const configuredEnv = {
  TAOBAO_APP_KEY: 'test-key',
  TAOBAO_APP_SECRET: 'test-secret',
  TAOBAO_PID: 'mm_1_2_3',
};
try {
  const regularFailure = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work'),
    env: configuredEnv,
  });
  assert.equal(regularFailure.status, 502);
  assert.deepEqual(await regularFailure.json(), { error: '商品服务暂时不可用' });

  const diagnosticFailure = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work&diagnostic=1'),
    env: configuredEnv,
  });
  assert.equal(diagnosticFailure.status, 502);
  assert.deepEqual(await diagnosticFailure.json(), {
    error: '商品服务暂时不可用',
    diagnostic: {
      kind: 'top_error',
      httpStatus: 200,
      code: '15',
      subCode: 'isv.invalid-app',
      message: 'Invalid application credentials',
      errorName: '',
      requestId: 'safe-request-id',
    },
  });

  const invalidDiagnostic = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=arbitrary_query&diagnostic=1'),
    env: configuredEnv,
  });
  assert.equal(invalidDiagnostic.status, 400);
  assert.equal(upstreamCalls, 2);

  const invalidConfiguredCategory = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work&category=anything'),
    env: configuredEnv,
  });
  assert.equal(invalidConfiguredCategory.status, 400);
  assert.equal(upstreamCalls, 2);

  globalThis.fetch = async (_url, options) => {
    upstreamCalls += 1;
    upstreamBody = options.body;
    return new Response(JSON.stringify({
      tbk_dg_material_optional_upgrade_response: {
        total_results: 41,
        result_list: {
          map_data: [{
            item_id: 'upgrade-item-1',
            publish_info: { coupon_share_url: '//uland.taobao.com/coupon/example' },
            income_info: { commission_rate: '12.5' },
            price_promotion_info: { reserve_price: '120', zk_final_price: '100', final_promotion_price: '80' },
            item_basic_info: { title: '升级接口测试皮鞋', pict_url: '//img.alicdn.com/test.jpg', shop_title: '测试店铺', volume: 12, category_name: '鞋履' },
          }],
        },
      },
    }), { status: 200 });
  };
  const success = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work&category=shoes'),
    env: configuredEnv,
  });
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), {
    products: [{
      itemId: 'upgrade-item-1',
      title: '升级接口测试皮鞋',
      image: 'https://img.alicdn.com/test.jpg',
      price: 100,
      couponAmount: 20,
      couponPrice: 80,
      commissionRate: 12.5,
      shopTitle: '测试店铺',
      volume: 12,
      category: 'shoes',
      promotionUrl: 'https://uland.taobao.com/coupon/example',
    }],
    page: 1,
    hasMore: true,
  });
  assert.match(upstreamBody, /method=taobao.tbk.dg.material.optional.upgrade/);
  assert.equal(new URLSearchParams(upstreamBody).get('q'), '男士 通勤 皮鞋');

  const secondPage = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work&page=2'),
    env: configuredEnv,
  });
  assert.equal(secondPage.status, 200);
  assert.equal((await secondPage.json()).page, 2);
  assert.match(upstreamBody, /page_no=2/);
  assert.match(upstreamBody, /page_size=20/);

  globalThis.fetch = async () => new Response(JSON.stringify({
    tbk_dg_material_optional_upgrade_response: { result_list: { map_data: [] } },
  }), { status: 200 });
  const empty = await onRequest({
    request: new Request('https://stylefit.example/api/taobao/products?scene=mens_work'),
    env: configuredEnv,
  });
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { products: [], page: 1, hasMore: false, message: '暂无匹配的淘宝联盟商品' });
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Taobao endpoint checks passed');
