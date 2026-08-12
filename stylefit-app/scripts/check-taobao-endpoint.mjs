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
console.log('Taobao endpoint checks passed');
