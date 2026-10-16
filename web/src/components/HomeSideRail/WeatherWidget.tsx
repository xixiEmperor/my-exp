import RailWidget from './RailWidget';
import SiteIcon from '../SiteIcon/SiteIcon';
import { useWeather } from '../../hooks/useWeather';
import type { RevealDelay } from './HomeSideRail';
import styles from './HomeSideRail.module.scss';

interface Props {
    delay?: RevealDelay;
}

// 按钮文案有三种状态，用函数表达比嵌套三元更好读。
function getButtonLabel(isLoading: boolean, hasReading: boolean) {
    if (isLoading) {
        return '正在获取天气…';
    }

    if (hasReading) {
        return '重新获取天气 ↻';
    }

    return '获取本地天气 ↗';
}

// 天气卡片默认只显示占位，用户点击后才申请定位并请求接口。
export default function WeatherWidget({ delay }: Props) {
    const { reading, status, isLoading, load } = useWeather();

    // 地名反查失败时留空，这一行整个不出现。
    const placeLabel = reading ? reading.location : '';

    return (
        <RailWidget delay={delay}>
            <div className={styles['widget-title']}>
                <span>当地天气</span>
                <SiteIcon name="cloud" />
            </div>
            <div className={styles['weather-temp']}>
                <span className={styles['weather-symbol']}>{reading ? reading.symbol : '☀'}</span>
                <span>{reading ? `${reading.temperature}°` : '--°'}</span>
            </div>
            <div className={styles['weather-desc']}>
                {reading ? reading.description : '天气小组件待启动'}
            </div>
            {placeLabel && (
                <div className={styles['weather-place']}>
                    <SiteIcon name="pin" />
                    {placeLabel}
                </div>
            )}
            <div className={styles['weather-details']}>
                <div className={styles['weather-detail']}>
                    <span>体感温度</span>
                    <strong>{reading ? `${reading.feelsLike}°C` : '--'}</strong>
                </div>
                <div className={styles['weather-detail']}>
                    <span>湿度</span>
                    <strong>{reading ? `${reading.humidity}%` : '--'}</strong>
                </div>
                <div className={styles['weather-detail']}>
                    <span>风速</span>
                    <strong>{reading ? `${reading.windSpeed} km/h` : '--'}</strong>
                </div>
                {/* 把浏览器给的坐标亮出来，定位不准时能立刻分清是哪一端的问题。 */}
                <div className={styles['weather-detail']}>
                    <span>定位坐标</span>
                    <strong>{reading ? reading.coordinates : '--'}</strong>
                </div>
            </div>
            <button
                className={styles['weather-btn']}
                type="button"
                disabled={isLoading}
                onClick={load}
            >
                {getButtonLabel(isLoading, Boolean(reading))}
            </button>
            <div className={styles['weather-status']} aria-live="polite">
                {status}
            </div>
        </RailWidget>
    );
}
