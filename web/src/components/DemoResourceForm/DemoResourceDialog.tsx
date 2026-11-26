import { useEffect, useRef } from 'react';
import DemoResourceForm from './DemoResourceForm';
import styles from './DemoResourceForm.module.scss';

// 原生 dialog 提供模态焦点与 Esc 关闭，不引入第三方滚动条处理。
export default function DemoResourceDialog({ onClose }: { onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) return;

        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        const previousGutter = root.style.scrollbarGutter;

        // 在隐藏背景滚动条之前保留占位，避免页面宽度改变造成抖动。
        if (window.innerWidth > root.clientWidth) {
            root.style.scrollbarGutter = 'stable';
        }

        root.style.overflow = 'hidden';
        dialog.showModal();

        return () => {
            dialog.close();
            root.style.overflow = previousOverflow;
            root.style.scrollbarGutter = previousGutter;
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="new-demo-heading"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                // 下拉菜单挂在 dialog 内部，点击选项不会误触遮罩关闭。
                if (event.target !== event.currentTarget) return;

                const bounds = event.currentTarget.getBoundingClientRect();

                if (
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom
                ) {
                    onClose();
                }
            }}
        >
            <DemoResourceForm onCancel={onClose} />
        </dialog>
    );
}
