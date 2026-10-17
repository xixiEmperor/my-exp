import { useEffect, useId, useRef, type ReactNode } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './ConfirmDialog.module.scss';

export interface ConfirmDialogProps {
    // 由父组件控制开关，和登录面板的用法保持一致。
    open: boolean;
    title: string;
    description?: ReactNode;
    confirmText?: string;
    cancelText?: string;

    // 危险操作把确认按钮换成红色，退出登录、删除这类场景用得上。
    danger?: boolean;

    // 两个回调都可选，不传时点击后只关闭确认框。
    onConfirm?: () => void;
    onCancel?: () => void;

    // 关闭动作统一回调给父组件，由父组件把 open 置为 false。
    onClose: () => void;
}

// 通用确认框。只负责弹层、按钮和关闭行为，
// 具体要确认什么、点完之后做什么，全部由调用方通过参数决定。
export default function ConfirmDialog({
    open,
    title,
    description,
    confirmText = '确认',
    cancelText = '取消',
    danger = false,
    onConfirm,
    onCancel,
    onClose,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    // useId 保证同一页面里多个确认框的标题 id 不会重复。
    const titleId = useId();

    // open 变化时同步原生 dialog 的开关，顺便锁住背景滚动。
    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (open) {
            if (!dialog.open) {
                dialog.showModal();
            }

            // 打开后把焦点放在取消按钮上，误按回车不会直接执行危险操作。
            cancelRef.current?.focus();

            const previous = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = previous;
            };
        }

        if (dialog.open) {
            dialog.close();
        }
    }, [open]);

    // 取消和确认都先跑调用方传进来的回调，再通知父组件关闭。
    // 回调没传时可选链会直接跳过，相当于什么也不做，只关闭确认框。
    const handleCancel = () => {
        onCancel?.();
        onClose();
    };

    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby={titleId}
            onCancel={(event) => {
                // Esc 默认会让浏览器直接关掉 dialog，这里拦下来，
                // 让取消回调和关闭走同一条路径，避免漏掉回调。
                event.preventDefault();
                handleCancel();
            }}
        >
            <div className={styles.header}>
                <h2 id={titleId}>{title}</h2>
                <button type="button" onClick={handleCancel} aria-label="关闭确认框">
                    <SiteIcon name="close" />
                </button>
            </div>
            {description !== undefined && description !== null && (
                <div className={styles.body}>{description}</div>
            )}
            <div className={styles.actions}>
                <button
                    ref={cancelRef}
                    type="button"
                    className={styles.cancel}
                    onClick={handleCancel}
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    className={styles.confirm}
                    data-danger={danger ? '' : undefined}
                    onClick={handleConfirm}
                >
                    {confirmText}
                </button>
            </div>
        </dialog>
    );
}
