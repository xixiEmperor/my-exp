import { useEffect, useState } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { useHomeBuddy } from '../../hooks/useHomeBuddy';
import { useHomeVisibility, useHomeReading } from '../../hooks/useHomeExperience';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { useUIStore } from '../../stores/ui';
import { usePrefersDark } from '../../hooks/usePrefersDark';
import WeatherArt from './WeatherArt';
import normalImage from '../../assets/home/buddy-chef.png';
import sleepImage from '../../assets/home/buddy-chef-sleep.png';
import dizzyImage from '../../assets/home/buddy-chef-dizzy.png';

function weatherKind(code?: number) {
    if (code === undefined) return 'unknown';

    if (code === 0) return 'sun';

    if (code === 1 || code === 2) return 'partly';

    if (code === 45 || code === 48) return 'fog';

    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';

    if (code >= 95) return 'storm';

    return code >= 51 ? 'rain' : 'cloud';
}

function buddyWeather(code: number) {
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 3;

    if (code >= 51) return 2;

    return code <= 1 ? 0 : 1;
}

export function HomeWeatherHanger() {
    const { reading, status, isLoading, hasError, load } = useWeather();
    const code = reading?.weatherCode;
    const visibility = useHomeVisibility<HTMLElement>();
    const pageState = useHomeReading();
    useEffect(() => useHomeInteraction.getState().registerAction('weather', load), [load]);

    useEffect(() => {
        if (code === undefined) return;

        // 实况图形与小伙伴共用天气状态，未定位时不预设晴天。
        useHomeInteraction.getState().setWeatherIndex(buddyWeather(code));

        useHomeInteraction
            .getState()
            .react(['sunny', 'cloudy', 'rainy', 'snowy'][buddyWeather(code)]);
    }, [code]);

    useEffect(() => {
        if (!hasError) return;

        useHomeInteraction.getState().announce(status);
    }, [hasError, status]);

    let action = '获取 ↗';

    if (isLoading) action = '查询中';
    else if (hasError) action = '重试 ↻';
    else if (reading) action = '刷新 ↻';

    return (
        <aside
            ref={visibility.ref}
            className={`weather-dock shell${pageState.reading ? ' is-reading' : ''}${pageState.hidden ? ' is-page-hidden' : ''}${visibility.visible ? ' is-in-view' : ''}${isLoading ? ' is-loading' : ''}`}
            data-weather-dock
            data-weather-kind={weatherKind(code)}
            data-loop
            aria-label="当地天气"
        >
            <button
                type="button"
                className="weather-widget"
                id="weather-toggle"
                disabled={isLoading}
                aria-busy={isLoading}
                onClick={load}
                aria-label={
                    reading
                        ? `${reading.location || reading.coordinates}，${reading.description}，${reading.temperature}摄氏度，点击刷新天气`
                        : '获取当前位置的天气'
                }
            >
                {/* 矢量原稿由项目提供，服务数据只选择图形，不参与 HTML 渲染。 */}
                <span className="weather-art" aria-hidden="true">
                    <WeatherArt />
                </span>
                <span className="weather-widget-copy">
                    <span className="weather-location">
                        {reading ? reading.location || reading.coordinates : '当前位置 · 尚未定位'}
                    </span>
                    <span className="weather-reading">
                        <span>{reading ? reading.description : '看看当地天气'}</span>
                        <span>{reading ? `${reading.temperature}°C` : ''}</span>
                    </span>
                </span>
                <small>{action}</small>
            </button>
            <p className="weather-status">{status}</p>
        </aside>
    );
}

export function HomeBuddyHanger() {
    const state = useHomeBuddy();
    const weatherIndex = useHomeInteraction((ui) => ui.weatherIndex);
    const pageState = useHomeReading();
    const visibility = useHomeVisibility<HTMLDivElement>();
    const theme = useUIStore((ui) => ui.theme);
    const prefersDark = usePrefersDark();
    const lampOn = theme === 'dark' || (theme === 'auto' && prefersDark);
    const [imageFailed, setImageFailed] = useState(false);
    const expressions = [
        state.sleeping && 'is-sleeping',
        state.shy && 'is-shy',
        state.waving && 'is-waving',
        state.dizzy && 'is-dizzy',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={visibility.ref}
            className={`buddy-corner ${expressions}${pageState.reading ? ' is-reading' : ''}${pageState.hidden ? ' is-page-hidden' : ''}${state.speaking ? ' is-speaking' : ''}${visibility.visible ? ' is-in-view' : ''}${lampOn ? ' is-lamp-on' : ''}`}
            data-weather={weatherIndex >= 0 ? weatherIndex : undefined}
            data-buddy-tag
            data-loop
        >
            <p id="buddy-speech" data-buddy-speech aria-live="off">
                {state.speech}
            </p>
            <button
                className={`buddy ${imageFailed ? '' : 'is-chef'} ${expressions}`}
                onClick={state.greet}
                id="buddy"
                data-buddy-body
                data-cursor="点我"
                aria-label="和小伙伴打个招呼"
            >
                <span className="chef-art" aria-hidden="true">
                    <img
                        className="chef-image chef-image-normal"
                        data-chef-image
                        onError={() => setImageFailed(true)}
                        src={normalImage}
                        width={90}
                        height={78}
                        alt=""
                        draggable={false}
                    />
                    <img
                        className="chef-image chef-image-sleep"
                        data-chef-image
                        onError={() => setImageFailed(true)}
                        src={sleepImage}
                        width={90}
                        height={78}
                        alt=""
                        draggable={false}
                    />
                    <img
                        className="chef-image chef-image-dizzy"
                        data-chef-image
                        onError={() => setImageFailed(true)}
                        src={dizzyImage}
                        width={90}
                        height={78}
                        alt=""
                        draggable={false}
                    />
                </span>
                <span className="chef-sleep-symbol" aria-hidden="true">
                    Zzz…
                </span>
                <span className="chef-dizzy-orbit" aria-hidden="true">
                    <i>✳</i>
                    <i>✳</i>
                </span>
                <span className="chef-weather" aria-hidden="true" />
                <span className="buddy-eye" aria-hidden="true">
                    <i />
                </span>
                <span className="buddy-eye" aria-hidden="true">
                    <i />
                </span>
                <span className="buddy-mouth" aria-hidden="true" />
                <span className="buddy-lamp" aria-hidden="true" />
                <span className="buddy-hand" aria-hidden="true">
                    ✋
                </span>
            </button>
        </div>
    );
}
