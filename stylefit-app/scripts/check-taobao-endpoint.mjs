import assert from 'node:assert/strict';
import { createTopSign } from '../edge-functions/lib/taobao.js';
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
let upstreamCalls = 0;
globalThis.fetch = async () => {
  upstreamCalls += 1;
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
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Taobao endpoint checks passed');
