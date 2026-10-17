import { useEffect, useRef, useState } from 'react';
import SiteIcon, { type IconName } from '../SiteIcon/SiteIcon';
import { useToastStore, type ToastItem, type ToastType } from '../../stores/toast';
import styles from './Toast.module.scss';

// 退场时长要和 scss 里 toast-out 关键帧的时间对齐，否则会提前消失。
const EXIT_MS = 180;

const iconNames: Record<ToastType, IconName> = {
    success: 'success',
    error: 'error',
    warning: 'alert',
    info: 'info',
};

// 单条提示自己管自己的倒计时。到点先标记退场让动画播完，动画结束再从状态里删掉。
function ToastCard({ item }: { item: ToastItem }) {
    const removeToast = useToastStore((state) => state.removeToast);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setClosing(true);
        }, item.duration);

        return () => {
            window.clearTimeout(timer);
        };
    }, [item.duration]);

    useEffect(() => {
        if (!closing) {
            return;
        }

        const timer = window.setTimeout(() => {
            removeToast(item.id);
        }, EXIT_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [closing, item.id, removeToast]);

    const classNames = [styles.card, styles[item.type]];

    if (closing) {
        classNames.push(styles.closing);
    }

    return (
        <div className={classNames.join(' ')} role="alert">
            <SiteIcon name={iconNames[item.type]} />
            <p>{item.content}</p>
        </div>
    );
}

// 提示条容器挂在 Popover 顶层，原生 dialog 打开时也能压在它上面。
// 光靠 z-index 是压不住 dialog 的，dialog 走的是顶层的另一套层叠规则。
export default function Toast() {
    const toasts = useToastStore((state) => state.toasts);
    const viewportRef = useRef<HTMLDivElement>(null);
    const latestId = toasts.length > 0 ? toasts[toasts.length - 1].id : 0;

    useEffect(() => {
        const viewport = viewportRef.current;

        // 浏览器不支持 Popover 时退回普通定位，此时容器一直可见，空列表不占位。
        if (!viewport || typeof viewport.showPopover !== 'function') {
            return;
        }

        if (toasts.length === 0) {
            if (viewport.matches(':popover-open')) {
                viewport.hidePopover();
            }

            return;
        }

        // 每来一条新提示就重新入栈一次。dialog 可能比我们更晚进顶层，
        // 重进之后容器才会排在它后面，否则新提示会被 dialog 的遮罩盖住。
        if (viewport.matches(':popover-open')) {
            viewport.hidePopover();
        }

        viewport.showPopover();
    }, [latestId, toasts.length]);

    return (
        <div ref={viewportRef} className={styles.viewport} popover="manual">
            <div className={styles.list}>
                {toasts.map((item) => (
                    <ToastCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}
