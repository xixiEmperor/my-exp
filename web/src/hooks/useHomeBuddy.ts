import { useCallback, useEffect, useRef, useState } from 'react';
import { buddyLines } from '../constants/homeBuddy';
import { useHomeInteraction } from '../stores/homeInteraction';
import { usePrefersDark } from './usePrefersDark';
import { useUIStore } from '../stores/ui';

const hourFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hourCycle: 'h23',
});

// 台词队列只保存意图和计时器，气泡、表情和图片由组件声明式渲染。
export function useHomeBuddy() {
    const [speech, setSpeech] = useState('嘿，进来坐坐！');
    const [speaking, setSpeaking] = useState(false);
    const [sleeping, setSleeping] = useState(false);
    const [shy, setShy] = useState(false);
    const [waving, setWaving] = useState(false);
    const reaction = useHomeInteraction((state) => state.reaction);
    const spinning = useHomeInteraction((state) => state.spinning);
    const preference = useUIStore((state) => state.theme);
    const prefersDark = usePrefersDark();
    let theme: string = preference;

    if (preference === 'auto') theme = prefersDark ? 'dark' : 'light';

    const accent = useUIStore((state) => state.homeAccent);
    const timers = useRef({ speech: 0, idle: 0, shy: 0, wave: 0 });
    const asleep = useRef(false);
    const currentPriority = useRef(-1);
    const pending = useRef(new Map<string, number>());
    const indexes = useRef<Record<string, number>>({});
    const clicks = useRef<number[]>([]);
    const speak = useCallback(function say(key: string, priority = 2) {
        if (document.hidden || !buddyLines[key]) return;

        // 快速跨过多个板块时只保留最新提示，避免队列之后播报旧区域。
        if (priority === 1) {
            pending.current.forEach((queuedPriority, queuedKey) => {
                if (queuedPriority === 1) pending.current.delete(queuedKey);
            });
        }

        if (priority < currentPriority.current) {
            pending.current.set(key, priority);

            return;
        }

        clearTimeout(timers.current.speech);
        currentPriority.current = priority;
        const index = indexes.current[key] || 0;
        const message = buddyLines[key][index];
        indexes.current[key] = (index + 1) % buddyLines[key].length;
        setSpeech(message);
        setSpeaking(true);
        useHomeInteraction.getState().announce(message);

        timers.current.speech = window.setTimeout(() => {
            setSpeaking(false);
            currentPriority.current = -1;
            const next = [...pending.current.entries()].sort((a, b) => b[1] - a[1])[0];

            if (next) {
                pending.current.delete(next[0]);
                say(next[0], next[1]);
            }
        }, 4500);
    }, []);
    const greet = useCallback(() => {
        asleep.current = false;
        setSleeping(false);
        const now = performance.now();
        clicks.current = clicks.current.filter((time) => now - time <= 2000);
        clicks.current.push(now);

        if (clicks.current.length >= 5) {
            clicks.current = [];
            setShy(true);
            setWaving(false);
            speak('shy', 3);
            clearTimeout(timers.current.shy);
            timers.current.shy = window.setTimeout(() => setShy(false), 3000);
        } else {
            speak('greeting', 3);
            setWaving(true);
            clearTimeout(timers.current.wave);
            timers.current.wave = window.setTimeout(() => setWaving(false), 1500);
        }
    }, [speak]);

    useEffect(() => useHomeInteraction.getState().registerAction('buddy', greet), [greet]);

    useEffect(() => {
        speak(reaction.key, reaction.priority);
    }, [reaction, speak]);

    useEffect(() => {
        if (spinning) speak('dizzy');
    }, [spinning, speak]);

    const previousTheme = useRef(theme);
    const previousAccent = useRef(accent);

    useEffect(() => {
        if (previousTheme.current !== theme) speak(theme === 'dark' ? 'dark' : 'light');

        previousTheme.current = theme;
    }, [theme, speak]);

    useEffect(() => {
        if (previousAccent.current !== accent) speak(accent);

        previousAccent.current = accent;
    }, [accent, speak]);

    useEffect(() => {
        const originalTitle = document.title;
        let lastInput = -500;

        function recordInput() {
            const now = performance.now();

            if (now - lastInput < 500) return;

            lastInput = now;
            clearTimeout(timers.current.idle);

            timers.current.idle = window.setTimeout(() => {
                if (document.hidden) return;

                asleep.current = true;
                setSleeping(true);
                speak('sleep', 0);
            }, 30000);

            if (!asleep.current) return;

            asleep.current = false;
            setSleeping(false);
            pending.current.delete('sleep');
            const hour = Number(hourFormat.format(new Date()));
            let key =
                ['sunny', 'cloudy', 'rainy', 'snowy'][useHomeInteraction.getState().weatherIndex] ||
                'main';

            if (hour >= 23 || hour < 5) key = 'night';
            else if (hour < 10) key = 'morning';

            speak(key);
        }

        function visibility() {
            document.title = document.hidden ? '回来坐坐 ✳' : originalTitle;
            clearTimeout(timers.current.idle);

            if (document.hidden) {
                clearTimeout(timers.current.speech);
                pending.current.clear();
                currentPriority.current = -1;
                setSpeaking(false);
            } else {
                lastInput = -500;
                recordInput();
            }
        }

        document.addEventListener('pointermove', recordInput, { passive: true });
        document.addEventListener('scroll', recordInput, { passive: true });
        document.addEventListener('keydown', recordInput);
        document.addEventListener('visibilitychange', visibility);
        recordInput();
        const savedTimers = timers.current;
        const queue = pending.current;

        return () => {
            Object.values(savedTimers).forEach(clearTimeout);
            queue.clear();
            document.removeEventListener('pointermove', recordInput);
            document.removeEventListener('scroll', recordInput);
            document.removeEventListener('keydown', recordInput);
            document.removeEventListener('visibilitychange', visibility);

            if (document.title === '回来坐坐 ✳') document.title = originalTitle;
        };
    }, [speak]);

    return { speech, speaking, sleeping, shy, waving, dizzy: spinning, greet };
}
