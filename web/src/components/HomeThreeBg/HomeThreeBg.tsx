import { useEffect, useRef, useState } from 'react';
import { mountHomeThreeBg } from '../../utils/homeThreeBg';
import { useUIStore } from '../../stores/ui';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { usePrefersDark } from '../../hooks/usePrefersDark';
import styles from './HomeThreeBg.module.scss';

// 首页全屏 Three.js 三维气象背景层，自动同步明暗主题、强调色、雕塑旋转与实时天气。
export default function HomeThreeBg() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ReturnType<typeof mountHomeThreeBg>>(null);
    const [supported, setSupported] = useState(true);

    const themePref = useUIStore((state) => state.theme);
    const accent = useUIStore((state) => state.homeAccent);
    const prefersDark = usePrefersDark();
    const resolvedTheme =
        themePref === 'dark' || (themePref === 'auto' && prefersDark) ? 'dark' : 'light';

    const spinning = useHomeInteraction((state) => state.spinning);
    const weatherIndex = useHomeInteraction((state) => state.weatherIndex);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const initialTheme =
            useUIStore.getState().theme === 'dark' ||
            (useUIStore.getState().theme === 'auto' &&
                globalThis.matchMedia('(prefers-color-scheme: dark)').matches)
                ? 'dark'
                : 'light';

        const instance = mountHomeThreeBg(canvas, {
            preset: 'matrix-field',
            intensity: 'balanced',
            accent: useUIStore.getState().homeAccent,
            theme: initialTheme,
            spinning: useHomeInteraction.getState().spinning,
            weatherIndex: useHomeInteraction.getState().weatherIndex,
        });

        if (!instance) {
            setSupported(false);

            return;
        }

        engineRef.current = instance;

        return () => {
            instance.dispose();
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        engineRef.current?.updateState({
            preset: 'matrix-field',
            intensity: 'balanced',
            accent,
            theme: resolvedTheme,
            spinning,
            weatherIndex,
        });
    }, [accent, resolvedTheme, spinning, weatherIndex]);

    if (!supported) {
        return null;
    }

    return (
        <div className={styles.canvasWrap} aria-hidden="true">
            <canvas ref={canvasRef} className={styles.canvas} />
        </div>
    );
}
