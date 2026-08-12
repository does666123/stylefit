import assert from 'node:assert/strict';
import { createTopSign, searchTaobaoProducts } from '../edge-functions/lib/taobao.js';
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

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const logs = [];
globalThis.fetch = async () => new Response(JSON.stringify({
  error_response: { code: 15, sub_code: 'isv.invalid-app', msg: 'Invalid application credentials' },
}), { status: 200 });
console.warn = (...args) => logs.push(args);
try {
  const failedSearch = await searchTaobaoProducts({
    TAOBAO_APP_KEY: 'test-key',
    TAOBAO_APP_SECRET: 'test-secret',
    TAOBAO_PID: 'mm_1_2_3',
  }, 'mens_work');
  assert.deepEqual(failedSearch, { error: 'upstream_failed' });
  assert.deepEqual(logs, [[
    'Taobao material search response',
    { httpStatus: 200, code: '15', subCode: 'isv.invalid-app', message: 'Invalid application credentials' },
  ]]);
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
}

console.log('Taobao endpoint checks passed');
