import { searchTaobaoProducts } from '../../lib/taobao.js';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const scene = new URL(request.url).searchParams.get('scene') || '';
  const result = await searchTaobaoProducts(env, scene);
  if (result.error === 'invalid_scene') return json({ error: '不支持的检索场景' }, 400);
  if (result.error === 'not_configured') return json({ error: '服务未配置' }, 503);
  if (result.error) return json({ error: '商品服务暂时不可用' }, 502);
  return json({ products: result.products });
}
