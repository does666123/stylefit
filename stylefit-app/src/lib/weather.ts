/**
 * 天气感知推荐模块
 * 
 * 数据源：Open-Meteo 免费天气 API（免密钥、支持 CORS）
 * 缓存：localStorage stylefit_weather（30 分钟 TTL + 0.1 度位置变化阈值）
 * 降级：定位失败/超时 → 默认上海；API 失败 → 用缓存或静默回退静态季节逻辑
 */

import type { Season } from '@/types';

// ============ 类型定义 ============

export interface WeatherData {
  temperature: number;       // 实际温度 °C
  apparentTemperature: number; // 体感温度 °C
  weatherCode: number;       // WMO 天气代码
  precipitation: number;     // 降水量 mm
  windSpeed: number;         // 风速 km/h
}

export interface WeatherCache {
  data: WeatherData;
  timestamp: number;         // 获取时间戳 ms
  lat: number;
  lng: number;
}

export type ThicknessTier = 'scorching' | 'hot' | 'comfortable' | 'cool' | 'cold' | 'freezing';

export interface WeatherInterpretation {
  temperature: number;
  apparentTemperature: number;
  weatherLabel: string;       // 如 "晴"、"多云"、"小雨"
  thicknessTier: ThicknessTier;
  thicknessLabel: string;     // 如 "酷热（短袖短裤）"、"舒适（长袖薄卫衣）"
  clothingAdvice: string;     // 穿搭建议短句
  rainNote: string | null;    // 降水提示
  windNote: string | null;    // 大风提示
  isDefault: boolean;         // 是否为默认城市降级
  locationName: string;       // 位置描述
}

// ============ 常量 ============

const DEFAULT_LAT = 31.2304;
const DEFAULT_LNG = 121.4737;
const CACHE_KEY = 'stylefit_weather';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟
const LOCATION_THRESHOLD = 0.1; // 度

// ============ 天气代码映射 ============

export function getWeatherLabel(code: number): string {
  if (code === 0) return '晴';
  if (code <= 3) return code === 1 ? '大部晴朗' : code === 2 ? '多云' : '阴';
  if (code === 45 || code === 48) return '雾';
  if (code >= 51 && code <= 55) return '小雨';
  if (code >= 56 && code <= 57) return '冻雨';
  if (code >= 61 && code <= 65) return code <= 63 ? '中雨' : '大雨';
  if (code >= 66 && code <= 67) return '冻雨';
  if (code >= 71 && code <= 75) return code <= 73 ? '小雪' : '大雪';
  if (code === 77) return '雪粒';
  if (code >= 80 && code <= 82) return '阵雨';
  if (code >= 85 && code <= 86) return '阵雪';
  if (code >= 95 && code <= 99) return '雷雨';
  return '未知';
}

export function isPrecipitationCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 71 && code <= 77) ||
         (code >= 80 && code <= 82) || (code >= 85 && code <= 86) ||
         (code >= 95 && code <= 99);
}

// ============ 体感温度 → 厚度档 ============

export function getThicknessTier(temp: number): ThicknessTier {
  if (temp >= 30) return 'scorching';
  if (temp >= 24) return 'hot';
  if (temp >= 18) return 'comfortable';
  if (temp >= 10) return 'cool';
  if (temp >= 0) return 'cold';
  return 'freezing';
}

const thicknessLabels: Record<ThicknessTier, string> = {
  scorching: '酷热 · 短袖短裤/速干/凉鞋',
  hot: '炎热 · 短袖薄裤/透气面料',
  comfortable: '舒适 · 长袖T/衬衫/薄卫衣',
  cool: '微凉 · 卫衣/夹克/针织衫',
  cold: '寒冷 · 毛衣/风衣/大衣',
  freezing: '严寒 · 羽绒服/加绒内搭',
};

const thicknessSeasonMap: Record<ThicknessTier, Season> = {
  scorching: 'summer',
  hot: 'summer',
  comfortable: 'spring',
  cool: 'autumn',
  cold: 'winter',
  freezing: 'winter',
};

// ============ 厚度档 → 季节映射（用于匹配引擎） ============

export function thicknessTierToSeason(tier: ThicknessTier): Season {
  return thicknessSeasonMap[tier];
}

// ============ 天气解读 ============

export function interpretWeather(data: WeatherData, isDefault: boolean, locationName: string): WeatherInterpretation {
  const tier = getThicknessTier(data.apparentTemperature);
  const weatherLabel = getWeatherLabel(data.weatherCode);
  const hasRain = isPrecipitationCode(data.weatherCode) || data.precipitation > 0;
  const hasWind = data.windSpeed >= 30;

  let clothingAdvice = '';
  switch (tier) {
    case 'scorching': clothingAdvice = '适合清爽透气的搭配'; break;
    case 'hot': clothingAdvice = '适合轻薄舒适的搭配'; break;
    case 'comfortable': clothingAdvice = '适合层次灵活的搭配'; break;
    case 'cool': clothingAdvice = '适合加一件外套的搭配'; break;
    case 'cold': clothingAdvice = '注意保暖，优选厚实面料'; break;
    case 'freezing': clothingAdvice = '全副武装，保暖第一'; break;
  }

  const rainNote = hasRain ? '出门记得带伞，鞋已优先防水款' : null;
  const windNote = hasWind ? '风力较大，建议加防风外套' : null;

  return {
    temperature: data.temperature,
    apparentTemperature: data.apparentTemperature,
    weatherLabel,
    thicknessTier: tier,
    thicknessLabel: thicknessLabels[tier],
    clothingAdvice,
    rainNote,
    windNote,
    isDefault,
    locationName,
  };
}

// ============ 天气话术（用于推荐结果页） ============

export function getWeatherRemark(data: WeatherData | null): string | null {
  if (!data) return null;
  const parts: string[] = [];
  parts.push(`今天 ${Math.round(data.apparentTemperature)}°C`);
  if (isPrecipitationCode(data.weatherCode) || data.precipitation > 0) {
    parts.push('有雨，鞋已优先防水款');
  }
  if (data.windSpeed >= 30) {
    parts.push('风大，建议防风外套');
  }
  return parts.join(' · ');
}

// ============ 缓存读写 ============

function readCache(): WeatherCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherCache;
  } catch {
    return null;
  }
}

function writeCache(cache: WeatherCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 静默失败
  }
}

function isCacheValid(cache: WeatherCache, lat: number, lng: number): boolean {
  const age = Date.now() - cache.timestamp;
  if (age > CACHE_TTL_MS) return false;
  const dist = Math.sqrt(Math.pow(cache.lat - lat, 2) + Math.pow(cache.lng - lng, 2));
  return dist < LOCATION_THRESHOLD;
}

// ============ 定位 ============

interface GeoResult {
  lat: number;
  lng: number;
  isDefault: boolean;
}

function getGeolocation(timeout = 5000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, isDefault: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, isDefault: false }),
      () => resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, isDefault: true }),
      { timeout, enableHighAccuracy: false }
    );
  });
}

// ============ API 请求 ============

async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const current = json?.current;
    if (!current) return null;
    return {
      temperature: current.temperature_2m ?? 20,
      apparentTemperature: current.apparent_temperature ?? 20,
      weatherCode: current.weather_code ?? 0,
      precipitation: current.precipitation ?? 0,
      windSpeed: current.wind_speed_10m ?? 0,
    };
  } catch {
    return null;
  }
}

// ============ 主入口 ============

/**
 * 获取天气数据（带缓存 + 定位降级）
 * 永不抛异常，失败时返回 null
 */
export async function fetchWeatherWithCache(): Promise<{
  data: WeatherData | null;
  isDefault: boolean;
  locationName: string;
} | null> {
  try {
    const geo = await getGeolocation();
    const cached = readCache();

    // 缓存有效且位置未变
    if (cached && isCacheValid(cached, geo.lat, geo.lng)) {
      return {
        data: cached.data,
        isDefault: geo.isDefault,
        locationName: geo.isDefault ? '默认上海天气' : '当前位置',
      };
    }

    // 请求 API
    const fresh = await fetchWeather(geo.lat, geo.lng);
    if (fresh) {
      writeCache({ data: fresh, timestamp: Date.now(), lat: geo.lat, lng: geo.lng });
      return {
        data: fresh,
        isDefault: geo.isDefault,
        locationName: geo.isDefault ? '默认上海天气' : '当前位置',
      };
    }

    // API 失败但有缓存
    if (cached) {
      return {
        data: cached.data,
        isDefault: geo.isDefault,
        locationName: geo.isDefault ? '默认上海天气' : '当前位置（缓存）',
      };
    }

    // 完全无数据
    return null;
  } catch {
    return null;
  }
}
