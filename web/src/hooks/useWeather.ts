import { useCallback, useState } from 'react';
import { weatherCodes, weatherFallback } from '../constants/weather';
import type { WeatherReading } from '../types/home';

// Open-Meteo 的返回结构里只用到 current 这一段。
interface OpenMeteoResponse {
    current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
    };
}

// BigDataCloud 的反查结果，只取拼地名要用的几级行政区。
interface ReverseGeocodeResponse {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
}

interface WeatherState {
    reading: WeatherReading | null;
    status: string;
    isLoading: boolean;
}

const updatedFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const idleStatus = '点击后才会请求浏览器定位权限。';

// 定位只在用户点击之后才申请。坐标仅用于本次天气和地名查询，不保存也不上报。
function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('当前浏览器不支持定位，暂时无法获取天气。'));

            return;
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
                const messages: Record<number, string> = {
                    1: '你没有授予定位权限。',
                    2: '暂时无法获取位置，请稍后重试。',
                    3: '定位超时，请稍后重试。',
                };

                reject(new Error(messages[error.code] ?? '无法获取位置，请稍后重试。'));
            },
            {
                // 必须开高精度。关掉它浏览器会优先返回基于网络出口的粗略定位，
                // 桌面端拿到的其实是 IP 段估算值，挂代理时就会指到别的地方去。
                enableHighAccuracy: true,

                // 也不能复用缓存，否则切换网络后仍然拿得到上一次的旧位置。
                maximumAge: 0,
                timeout: 15000,
            },
        );
    });
}

async function fetchCurrentWeather(latitude: number, longitude: number) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');

    url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current:
            'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
        timezone: 'auto',
    }).toString();

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

    if (!response.ok) {
        throw new Error('天气服务暂时不可用，请稍后重试。');
    }

    const payload = (await response.json()) as OpenMeteoResponse;

    if (!payload.current) {
        throw new Error('没有获取到天气数据，请稍后重试。');
    }

    return payload.current;
}

// 定位精度差得离谱时补一句提示，方便判断是不是被网络出口带偏了。
function buildAccuracyHint(accuracy: number) {
    if (!Number.isFinite(accuracy) || accuracy <= 5000) {
        return '';
    }

    return ` · 定位精度约 ${Math.round(accuracy / 1000)} 公里，可能不是你的真实位置`;
}

// 坐标保留两位小数就够看出大致位置，再多是噪音。
function formatCoordinates(latitude: number, longitude: number) {
    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}

// 地名按「市 · 区」拼，缺哪一级就用能拿到的那级。
function buildLocationLabel(payload: ReverseGeocodeResponse) {
    const city = payload.city || payload.principalSubdivision || payload.countryName || '';
    const district = payload.locality || '';

    if (city && district && district !== city) {
        return `${city} · ${district}`;
    }

    return city || district;
}

// 地名只是锦上添花，查不到就留空，不影响天气本身是否显示。
async function fetchLocationName(latitude: number, longitude: number) {
    try {
        const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');

        // 语言必须写 zh-Hans，直接用 zh 会返回繁体地名。
        url.search = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            localityLanguage: 'zh-Hans',
        }).toString();

        const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

        if (!response.ok) {
            return '';
        }

        return buildLocationLabel((await response.json()) as ReverseGeocodeResponse);
    } catch {
        // 反查失败不该影响天气，静默退回不显示地名。
        return '';
    }
}

// 天气默认只显示占位，用户主动点击才会走定位和请求，避免一进首页就弹授权。
export function useWeather() {
    const [weather, setWeather] = useState<WeatherState>({
        reading: null,
        status: idleStatus,
        isLoading: false,
    });

    const load = useCallback(async () => {
        setWeather((previous) => ({
            ...previous,
            isLoading: true,
            status: '请在浏览器弹窗中允许定位。坐标只用于本次查询，不会保存。',
        }));

        try {
            const position = await getPosition();
            const { latitude, longitude, accuracy } = position.coords;

            // 天气和地名互不依赖，并发请求，地名失败也不影响天气。
            const [current, location] = await Promise.all([
                fetchCurrentWeather(latitude, longitude),
                fetchLocationName(latitude, longitude),
            ]);

            const [description, symbol] = weatherCodes[current.weather_code] ?? weatherFallback;
            const stamp = `更新于 ${updatedFormatter.format(new Date())} · Open-Meteo、BigDataCloud`;

            setWeather({
                isLoading: false,
                status: `${stamp}${buildAccuracyHint(accuracy)}`,
                reading: {
                    temperature: Math.round(current.temperature_2m),
                    symbol,
                    description,
                    feelsLike: Math.round(current.apparent_temperature),
                    humidity: current.relative_humidity_2m,
                    windSpeed: Math.round(current.wind_speed_10m),
                    location,
                    coordinates: formatCoordinates(latitude, longitude),
                },
            });
        } catch (error) {
            setWeather((previous) => ({
                ...previous,
                isLoading: false,
                status: error instanceof Error ? error.message : '获取失败，请稍后重试。',
            }));
        }
    }, []);

    return { ...weather, load };
}
