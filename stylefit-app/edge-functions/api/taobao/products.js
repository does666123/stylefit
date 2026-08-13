import { searchTaobaoProducts } from '../../lib/taobao.js';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const searchParams = new URL(request.url).searchParams;
  const scene = searchParams.get('scene') || '';
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100) : 1;
  const result = await searchTaobaoProducts(env, scene, page);
  if (result.error === 'invalid_scene') return json({ error: '不支持的检索场景' }, 400);
  if (result.error === 'not_configured') return json({ error: '服务未配置' }, 503);
  if (result.error) {
    const diagnostic = scene === 'mens_work' && searchParams.get('diagnostic') === '1' ? result.diagnostic : null;
    return json(diagnostic ? { error: '商品服务暂时不可用', diagnostic } : { error: '商品服务暂时不可用' }, 502);
  }
  return json(result.message
    ? { products: result.products, page: result.page, hasMore: result.hasMore, message: result.message }
    : { products: result.products, page: result.page, hasMore: result.hasMore });
}
