import { useCallback, useEffect, useRef, useState } from 'react';
import { weatherCodes, weatherFallback } from '../constants/weather';
import type { WeatherReading } from '../types/home';

// 国内直连天气接口（uapis.cn）的实况返回结构。
interface UapisWeatherResponse {
    province?: string;
    city?: string;
    district?: string;
    weather?: string;
    weather_icon?: string;
    temperature?: number;
    feels_like?: number;
    wind_direction?: string;
    wind_power?: string;
    humidity?: number;
}

// 国内直连 IP 定位兜底接口（uapis.cn/api/v1/network/myip）。
interface UapisIpResponse {
    region?: string;
    latitude?: number;
    longitude?: number;
}

// BigDataCloud 的反查结果，只取拼地名要用的几级行政区。
interface ReverseGeocodeResponse {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
}

// wttr.in 经纬度兜底结构（用于海外城市或主源不可用时）。
interface WttrResponse {
    current_condition?: Array<{
        temp_C?: string;
        FeelsLikeC?: string;
        humidity?: string;
        windspeedKmph?: string;
        weatherCode?: string;
    }>;
}

interface WeatherState {
    reading: WeatherReading | null;
    status: string;
    isLoading: boolean;
    hasError: boolean;
}

const updatedFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const idleStatus = '点击后才会获取当前位置与实况天气。';

// 定位只在用户点击之后才申请。坐标仅用于本次天气和地名查询，不保存也不上报。
function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('当前浏览器不支持定位。'));

            return;
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
                const messages: Record<number, string> = {
                    1: '未授予定位权限',
                    2: '暂时无法获取精确位置',
                    3: '浏览器定位超时',
                };

                reject(new Error(messages[error.code] ?? '无法获取位置'));
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 8000,
            },
        );
    });
}

// 坐标保留两位小数就够看出大致位置，再多是噪音。
function formatCoordinates(latitude: number, longitude: number) {
    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}

// 地名按「市 · 区」拼，缺哪一级就用能拿到的那级。
function buildLocationLabel(city: string, district: string) {
    if (city && district && district !== city) {
        return `${city} · ${district}`;
    }

    return city || district;
}

// 将中文天气描述映射为 WMO 代码，统一驱动天气图标、小厨师和 3D 气象背景。
function mapChineseWeatherToWmoCode(weatherText: string) {
    if (weatherText.includes('雷')) return 95;

    if (weatherText.includes('暴雪') || weatherText.includes('大雪')) return 75;

    if (weatherText.includes('中雪')) return 73;

    if (weatherText.includes('雪')) return 71;

    if (weatherText.includes('暴雨') || weatherText.includes('大雨')) return 65;

    if (weatherText.includes('中雨')) return 63;

    if (weatherText.includes('阵雨')) return 80;

    if (weatherText.includes('小雨') || weatherText.includes('毛毛雨')) return 61;

    if (weatherText.includes('雨')) return 61;

    if (weatherText.includes('雾') || weatherText.includes('霾') || weatherText.includes('沙')) {
        return 45;
    }

    if (weatherText.includes('阴')) return 3;

    if (weatherText.includes('多云')) return 2;

    if (weatherText.includes('晴')) return 0;

    return 2;
}

// 将 wttr.in 的 WWO 天气代码映射为 WMO 代码。
function mapWwoCodeToWmoCode(rawCode?: string) {
    const code = Number.parseInt(rawCode ?? '', 10);

    if (code === 113) return 0;

    if (code === 116) return 2;

    if (code === 119 || code === 122) return 3;

    if (code === 143 || code === 248 || code === 260) return 45;

    if (code === 200 || code === 386 || code === 389 || code === 392 || code === 395) return 95;

    if (
        [
            179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368,
            371, 374, 377,
        ].includes(code)
    ) {
        return 71;
    }

    if (code >= 176) return 61;

    return 2;
}

// 将国内常见风力等级（如 "1-3"、"4级"）换算为大致公里/小时风速。
function parseWindPowerToKmh(windPower?: string) {
    if (!windPower) return 8;

    const match = /\d+/.exec(windPower);

    if (!match) return 8;

    const level = Number.parseInt(match[0], 10);
    const beaufortKmh = [1, 4, 9, 16, 24, 34, 44, 56, 68, 81];

    return beaufortKmh[Math.min(Math.max(level, 0), beaufortKmh.length - 1)];
}

async function fetchReverseGeocode(latitude: number, longitude: number, signal: AbortSignal) {
    try {
        const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');

        // 语言必须写 zh-Hans，直接用 zh 会返回繁体地名。
        url.search = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            localityLanguage: 'zh-Hans',
        }).toString();

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal,
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as ReverseGeocodeResponse;
        const city = payload.city || payload.principalSubdivision || '';
        const district = payload.locality || '';

        return { city, district };
    } catch {
        return null;
    }
}

async function fetchIpLocation(signal: AbortSignal) {
    const response = await fetch('https://uapis.cn/api/v1/network/myip', {
        headers: { Accept: 'application/json' },
        signal,
    });

    if (!response.ok) {
        throw new Error('网络位置服务暂时不可用，请稍后重试。');
    }

    const payload = (await response.json()) as UapisIpResponse;
    const parts = (payload.region || '')
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

    // region 形如 "中国 湖北 武汉"，取最后一级城市名。
    const city = parts[parts.length - 1] || '';

    return {
        city,
        latitude: Number.isFinite(payload.latitude) ? Number(payload.latitude) : 0,
        longitude: Number.isFinite(payload.longitude) ? Number(payload.longitude) : 0,
    };
}

async function fetchUapisWeather(cityQuery: string, signal: AbortSignal) {
    try {
        const url = new URL('https://uapis.cn/api/v1/misc/weather');

        url.search = new URLSearchParams({
            city: cityQuery,
            extended: 'true',
        }).toString();

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal,
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as UapisWeatherResponse;

        if (!payload.weather || !Number.isFinite(payload.temperature)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

async function fetchWttrFallback(latitude: number, longitude: number, signal: AbortSignal) {
    const response = await fetch(
        `https://wttr.in/${latitude.toFixed(3)},${longitude.toFixed(3)}?format=j1&lang=zh-cn`,
        {
            headers: { Accept: 'application/json' },
            signal,
        },
    );

    if (!response.ok) {
        throw new Error('天气服务暂时不可用，请稍后重试。');
    }

    const payload = (await response.json()) as WttrResponse;
    const current = payload.current_condition?.[0];

    if (!current || !current.temp_C) {
        throw new Error('没有获取到天气数据，请稍后重试。');
    }

    const weatherCode = mapWwoCodeToWmoCode(current.weatherCode);
    const [description, symbol] = weatherCodes[weatherCode] ?? weatherFallback;

    return {
        weatherCode,
        temperature: Math.round(Number(current.temp_C)),
        feelsLike: Math.round(Number(current.FeelsLikeC ?? current.temp_C)),
        humidity: Math.round(Number(current.humidity ?? 50)),
        windSpeed: Math.round(Number(current.windspeedKmph ?? 8)),
        description,
        symbol,
    };
}

// 天气默认只显示占位，用户主动点击才会查询，支持中国大陆直连与定位失败自动降级。
export function useWeather() {
    const mounted = useRef(false);
    const requestController = useRef<AbortController | null>(null);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
            requestController.current?.abort();
        };
    }, []);

    const [weather, setWeather] = useState<WeatherState>({
        reading: null,
        status: idleStatus,
        isLoading: false,
        hasError: false,
    });

    const load = useCallback(async () => {
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;

        setWeather((previous) => ({
            ...previous,
            isLoading: true,
            hasError: false,
            status: '正在获取当前位置与实况天气…',
        }));

        try {
            let latitude = 0;
            let longitude = 0;
            let city = '';
            let district = '';
            let sourceNote = '';

            // 1. 优先尝试浏览器定位；若失败/无权限/超时则自动降级到国内 IP 定位。
            try {
                const position = await getPosition();

                if (!mounted.current || controller.signal.aborted) return;

                ({ latitude, longitude } = position.coords);

                const geo = await fetchReverseGeocode(latitude, longitude, controller.signal);

                if (geo) {
                    ({ city, district } = geo);
                }
            } catch {
                if (!mounted.current || controller.signal.aborted) return;

                const ipLoc = await fetchIpLocation(controller.signal);

                if (!mounted.current || controller.signal.aborted) return;

                ({ city, latitude, longitude } = ipLoc);
                sourceNote = ' · 基于网络位置';
            }

            // 2. 优先使用国内直连 uapis.cn 查询（先精确到区，未命中再回退城市名）。
            let uapisData: UapisWeatherResponse | null = null;

            if (district) {
                uapisData = await fetchUapisWeather(district, controller.signal);
            }

            if (!uapisData && city && city !== district) {
                uapisData = await fetchUapisWeather(city, controller.signal);
            }

            if (!mounted.current || controller.signal.aborted) return;

            const timeLabel = updatedFormatter.format(new Date());

            if (uapisData && uapisData.weather && Number.isFinite(uapisData.temperature)) {
                const weatherCode = mapChineseWeatherToWmoCode(uapisData.weather);
                const [, symbol] = weatherCodes[weatherCode] ?? weatherFallback;
                const resolvedCity = uapisData.city || city;
                const resolvedDistrict = uapisData.district || district;

                setWeather({
                    isLoading: false,
                    hasError: false,
                    status: `更新于 ${timeLabel} · 国内实况源${sourceNote}`,
                    reading: {
                        weatherCode,
                        temperature: Math.round(Number(uapisData.temperature)),
                        symbol,
                        description: uapisData.weather,
                        feelsLike: Math.round(
                            Number(uapisData.feels_like ?? uapisData.temperature),
                        ),
                        humidity: Math.round(Number(uapisData.humidity ?? 50)),
                        windSpeed: parseWindPowerToKmh(uapisData.wind_power),
                        location: buildLocationLabel(resolvedCity, resolvedDistrict),
                        coordinates: formatCoordinates(latitude, longitude),
                    },
                });

                return;
            }

            // 3. 若处于海外或国内源未命中，则按经纬度无缝兜底到 wttr.in。
            if (!latitude && !longitude) {
                throw new Error('未能识别当前城市，请稍后重试。');
            }

            const fallback = await fetchWttrFallback(latitude, longitude, controller.signal);

            if (!mounted.current || controller.signal.aborted) return;

            setWeather({
                isLoading: false,
                hasError: false,
                status: `更新于 ${timeLabel} · wttr.in${sourceNote}`,
                reading: {
                    weatherCode: fallback.weatherCode,
                    temperature: fallback.temperature,
                    symbol: fallback.symbol,
                    description: fallback.description,
                    feelsLike: fallback.feelsLike,
                    humidity: fallback.humidity,
                    windSpeed: fallback.windSpeed,
                    location: buildLocationLabel(city, district),
                    coordinates: formatCoordinates(latitude, longitude),
                },
            });
        } catch (error) {
            if (!mounted.current || controller.signal.aborted) return;

            setWeather((previous) => ({
                ...previous,
                isLoading: false,
                hasError: true,
                status: error instanceof Error ? error.message : '获取失败，请稍后重试。',
            }));
        }
    }, []);

    return { ...weather, load };
}
