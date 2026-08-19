const API_ENDPOINT = 'https://eco.taobao.com/router/rest';
const API_METHOD = 'taobao.tbk.dg.material.optional.upgrade';
const PAGE_SIZE = 20;

export const TAOBAO_SCENES = {
  mens_work: {
    category: '男装',
    queries: { all: '男士 通勤 服装', top: '男士 通勤 衬衫', bottom: '男士 通勤 西裤', outerwear: '男士 通勤 西装外套', shoes: '男士 通勤 皮鞋', accessory: '男士 通勤 腰带 领带' },
  },
  womens_work: {
    category: '女装',
    queries: { all: '女士 通勤 服装', top: '女士 通勤 衬衫', bottom: '女士 通勤 西裤 半身裙', dress: '女士 通勤 连衣裙', outerwear: '女士 通勤 西装外套', shoes: '女士 通勤 单鞋', accessory: '女士 通勤 包包 丝巾' },
  },
  mens_casual_outerwear: {
    category: '男装',
    queries: { all: '男士 休闲 服装', top: '男士 休闲 T恤', bottom: '男士 休闲 牛仔裤', outerwear: '男士 休闲 夹克', shoes: '男士 休闲 运动鞋', accessory: '男士 休闲 帽子 腰带' },
  },
  womens_minimal_top: {
    category: '女装',
    queries: { all: '女士 简约 服装', top: '女士 简约 上衣', bottom: '女士 简约 半身裙', dress: '女士 简约 连衣裙', outerwear: '女士 简约 外套', shoes: '女士 简约 单鞋', accessory: '女士 简约 包包' },
  },
};

const TAOBAO_CATEGORIES = new Set(['all', 'top', 'bottom', 'outerwear', 'shoes', 'accessory', 'dress']);
const WEARABLE_TERMS = /上衣|T恤|t恤|衬衫|衬衣|针织|毛衣|卫衣|Polo|polo|外套|夹克|大衣|风衣|羽绒|西装|裤|牛仔|半身裙|连衣裙|鞋|靴|凉鞋|拖鞋|包|腰带|皮带|领带|袜|丝巾|帽/;
const EXCLUDED_TERMS = /手机|电脑|数码|耳机|充电|数据线|壳|家居|家具|床|枕|餐具|食品|零食|美妆|口红|护肤|洗发|香水/;

function leftRotate(value, amount) {
  return (value << amount) | (value >>> (32 - amount));
}

function md5Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1) {
    padded[paddedLength - 8 + index] = Math.floor(bitLength / 2 ** (index * 8)) & 0xff;
  }

  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(16);
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = padded[start] | (padded[start + 1] << 8) | (padded[start + 2] << 16) | (padded[start + 3] << 24);
    }
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f;
      let g;
      if (index < 16) { f = (b & c) | (~b & d); g = index; }
      else if (index < 32) { f = (d & b) | (~d & c); g = (5 * index + 1) % 16; }
      else if (index < 48) { f = b ^ c ^ d; g = (3 * index + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * index) % 16; }
      const previousD = d;
      d = c;
      c = b;
      b = (b + leftRotate((a + f + constants[index] + words[g]) >>> 0, shifts[index])) >>> 0;
      a = previousD;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return [a0, b0, c0, d0]
    .flatMap((word) => [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff])
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function chinaTimestamp(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())} ${pad(china.getUTCHours())}:${pad(china.getUTCMinutes())}:${pad(china.getUTCSeconds())}`;
}

function readAdzoneId(pid) {
  const match = typeof pid === 'string' && pid.match(/^mm_\d+_\d+_(\d+)$/);
  return match?.[1] || null;
}

function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function asText(value, maxLength = 300) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : '';
}

function diagnosticText(value, maxLength = 160) {
  return (typeof value === 'string' || typeof value === 'number')
    ? String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
}

function topDiagnostic(status, apiError, requestId = '') {
  return {
    kind: apiError ? 'top_error' : 'http',
    httpStatus: status,
    code: diagnosticText(apiError?.code, 40) || (apiError ? 'unknown' : 'unexpected_response'),
    subCode: diagnosticText(apiError?.sub_code, 80) || '',
    message: diagnosticText(apiError?.msg),
    errorName: '',
    requestId: diagnosticText(apiError?.request_id || requestId, 120),
  };
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asPromotionUrl(value) {
  const text = asText(value, 2_000);
  if (/^\/\//.test(text)) return `https:${text}`;
  return /^https:\/\//i.test(text) ? text : '';
}

export function createTopSign(params, secret) {
  const source = Object.keys(params)
    .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return md5Hex(`${secret}${source}${secret}`);
}

function getProductCategory(text) {
  if (/鞋|靴|凉鞋|拖鞋/.test(text)) return 'shoes';
  if (/裤|牛仔|半身裙/.test(text)) return 'bottom';
  if (/外套|夹克|大衣|风衣|羽绒|西装/.test(text)) return 'outerwear';
  if (/包|帽|围巾|腰带|皮带|眼镜|首饰|领带|袜|丝巾/.test(text)) return 'accessory';
  if (/连衣裙/.test(text)) return 'dress';
  return 'top';
}

function mapProduct(item, category) {
  const publishInfo = asRecord(item.publish_info) || {};
  const incomeInfo = asRecord(item.income_info) || {};
  const priceInfo = asRecord(item.price_promotion_info) || {};
  const itemInfo = asRecord(item.item_basic_info) || {};
  const title = asText(itemInfo.title ?? item.title, 200);
  const sourceCategory = asText(itemInfo.category_name ?? item.category_name, 80);
  const categoryText = `${sourceCategory} ${title}`;
  if (!WEARABLE_TERMS.test(categoryText) || EXCLUDED_TERMS.test(categoryText)) return null;
  const price = asNumber(priceInfo.zk_final_price ?? priceInfo.reserve_price ?? item.zk_final_price ?? item.reserve_price);
  const couponPrice = asNumber(priceInfo.final_promotion_price ?? item.final_promotion_price) || price;
  return {
    itemId: asText(item.item_id, 80),
    title,
    image: asPromotionUrl(itemInfo.pict_url ?? itemInfo.white_image ?? item.pict_url ?? item.white_image),
    price,
    couponAmount: Math.max(0, Number((price - couponPrice).toFixed(2))),
    couponPrice,
    commissionRate: asNumber(incomeInfo.commission_rate),
    shopTitle: asText(itemInfo.shop_title ?? item.shop_title, 120),
    volume: asNumber(itemInfo.volume ?? item.volume),
    category: getProductCategory(categoryText) || category,
    promotionUrl: asPromotionUrl(publishInfo.coupon_share_url ?? publishInfo.click_url ?? item.coupon_share_url ?? item.url),
  };
}

export async function searchTaobaoProducts(env, sceneKey, category = 'all', page = 1) {
  const scene = TAOBAO_SCENES[sceneKey];
  if (!scene) return { error: 'invalid_scene' };
  if (!TAOBAO_CATEGORIES.has(category) || !scene.queries[category]) return { error: 'invalid_category' };

  const appKey = asText(env?.TAOBAO_APP_KEY, 80);
  const appSecret = asText(env?.TAOBAO_APP_SECRET, 200);
  const adzoneId = readAdzoneId(env?.TAOBAO_PID);
  if (!appKey || !appSecret || !adzoneId) return { error: 'not_configured' };

  const params = {
    app_key: appKey,
    format: 'json',
    method: API_METHOD,
    sign_method: 'md5',
    timestamp: chinaTimestamp(),
    v: '2.0',
    adzone_id: adzoneId,
    page_no: String(page),
    page_size: String(PAGE_SIZE),
    q: scene.queries[category],
  };
  const payload = new URLSearchParams({ ...params, sign: createTopSign(params, appSecret) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload.toString(),
      signal: controller.signal,
      eo: { timeoutSetting: { connectTimeout: 5_000, readTimeout: 10_000, writeTimeout: 5_000 } },
    });
    const responseText = await response.text();
    let payloadJson = null;
    try {
      payloadJson = asRecord(JSON.parse(responseText));
    } catch {
      return {
        error: 'upstream_failed',
        diagnostic: {
          kind: 'http',
          httpStatus: response.status,
          code: 'invalid_json',
          subCode: '',
          message: '',
          errorName: '',
          requestId: '',
        },
      };
    }

    const responseBody = asRecord(payloadJson?.tbk_dg_material_optional_upgrade_response);
    const apiError = asRecord(payloadJson?.error_response);
    if (!response.ok || apiError || !responseBody) {
      return { error: 'upstream_failed', diagnostic: topDiagnostic(response.status, apiError, payloadJson?.request_id) };
    }
    const resultList = asRecord(responseBody.result_list);
    const sourceItems = Array.isArray(resultList?.map_data) ? resultList.map_data : [];
    const products = sourceItems.slice(0, PAGE_SIZE)
      .map(asRecord)
      .filter(Boolean)
      .map((item) => mapProduct(item, scene.category))
      .filter((item) => item && (category === 'all' || item.category === category));
    const totalResults = asNumber(responseBody.total_results);
    const hasMore = totalResults > 0 ? page * PAGE_SIZE < totalResults : sourceItems.length === PAGE_SIZE;
    return products.length ? { products, page, hasMore } : { products, page, hasMore: false, message: '暂无匹配的淘宝联盟商品' };
  } catch (error) {
    return {
      error: 'upstream_failed',
      diagnostic: {
        kind: 'network',
        httpStatus: 0,
        code: '',
        subCode: '',
        message: '',
        errorName: diagnosticText(error?.name, 80) || 'Error',
        requestId: '',
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
