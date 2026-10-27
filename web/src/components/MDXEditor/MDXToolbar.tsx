import SiteIcon from '../SiteIcon/SiteIcon';
import style from './MDXToolbar.module.scss';

interface Props {
    // 点预览，打开预览页
    onPreview: () => void;
    // 点保存为草稿
    onSaveDraft: () => void;
    // 点发布为正文
    onPublish: () => void;
}

/** 编辑器头部的状态栏。只负责展示和把点击事件抛给父组件，自身不持有任何状态 */
export default function MDXToolbar({ onPreview, onSaveDraft, onPublish }: Props) {
    return (
        // 这一栏吸顶，往下翻正文时预览和保存仍然点得到
        <div className={style.bar}>
            <div className={style.meta}>
                <span className={style.label}>Markdown 源码</span>
                {/* 本地缓存状态跟着编辑节奏走，用户能随时确认内容有没有落盘 */}
                <span className={style.saveState} aria-live="polite">
                    {}
                </span>
            </div>
            <div className={style.toolbar}>
                <button type="button" className={style.previewButton} onClick={onPreview}>
                    <SiteIcon name="book" />
                    <span>预览</span>
                </button>
                <button type="button" className={style.draftButton} onClick={onSaveDraft}>
                    <SiteIcon name="save" />
                    <span>保存为草稿</span>
                </button>
                <button type="button" className={style.publishButton} onClick={onPublish}>
                    <SiteIcon name="publish" />
                    <span>发布为正文</span>
                </button>
            </div>
        </div>
    );
}
