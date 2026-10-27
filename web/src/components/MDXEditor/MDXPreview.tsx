import { useEffect, useRef } from 'react';
import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MarkdownToc from '../MarkdownToc/MarkdownToc';
import SiteIcon from '../SiteIcon/SiteIcon';
import style from './MDXPreview.module.scss';

interface Props {
    // 预览页是否打开
    open: boolean;
    // 要渲染的 markdown 文本。父组件传的是延迟值，输入时预览可以慢半拍
    content: string;
    // 关闭预览，遮罩点击、关闭按钮和 Esc 都走这里
    onClose: () => void;
}

/** 编辑器里的文章预览页。遮罩弹层、目录跳转和滚动锁定都收在组件内部 */
export default function MDXPreview({ open, content, onClose }: Props) {
    const bodyRef = useRef<HTMLDivElement>(null); // 预览正文的滚动容器，点目录时需要把对应标题滚到可视区

    // 预览打开时锁住页面滚动，同时支持 Esc 关闭
    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    // 关着的时候不渲染任何节点，弹层样式也就不会影响页面
    if (!open) {
        return null;
    }

    // 目录的锚点跳转走这里。预览页自己的滚动容器不是窗口，默认的 hash 跳转不生效
    const handleJump = (id: string) => {
        const target = bodyRef.current?.querySelector(`#${CSS.escape(id)}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div
            className={style.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="文章预览"
            onClick={(event) => {
                // 只有点在遮罩本身才关闭，点弹层内容不关
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={style.modal}>
                <header className={style.modalHead}>
                    <span className={style.modalTitle}>文章预览</span>
                    <button
                        type="button"
                        className={style.closeButton}
                        onClick={onClose}
                        aria-label="关闭预览"
                        autoFocus
                    >
                        <SiteIcon name="close" />
                    </button>
                </header>

                <div className={style.modalBody} ref={bodyRef}>
                    <article className={style.article}>
                        {/* 和前台文章详情页共用同一套阅读排版 */}
                        <div className="reader-prose">
                            <MarkdownReadonly content={content} />
                        </div>
                    </article>

                    <MarkdownToc content={content} onJump={handleJump} />
                </div>
            </div>
        </div>
    );
}
