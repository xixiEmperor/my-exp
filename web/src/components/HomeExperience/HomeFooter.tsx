import { useEffect, useState } from 'react';
import HomeCommands from './HomeCommands';

const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

// 时钟只在首页挂载，离开页面或隐藏标签页时停止计时。
export default function HomeFooter() {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        let timer = 0;
        const update = () => setTime(new Date());
        const visibility = () => {
            window.clearInterval(timer);

            if (!document.hidden) {
                update();
                timer = window.setInterval(update, 1000);
            }
        };

        visibility();
        document.addEventListener('visibilitychange', visibility);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, []);

    return (
        <footer className="site-footer shell">
            <a className="footer-brand" href="#main">
                xixiEmperor<span className="blue">.</span>
            </a>
            <span>一个小站，慢慢打磨。</span>
            <div className="footer-time">
                <i aria-hidden="true" />
                <span>中国标准时间</span>
                <time dateTime={time.toISOString()}>{formatter.format(time)}</time>
            </div>
            <HomeCommands />
            <a className="back-top" href="#main">
                回到顶部 ↑
            </a>
        </footer>
    );
}
