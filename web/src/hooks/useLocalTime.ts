import { useEffect, useState } from 'react';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
});

export interface LocalTime {
    time: string;
    date: string;
    zone: string;
}

// 本地时间每秒刷新一次。只读浏览器时区，不申请定位，也不发任何请求。
export function useLocalTime(): LocalTime {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    return {
        time: timeFormatter.format(now),
        date: dateFormatter.format(now),
        zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL TIME',
    };
}
