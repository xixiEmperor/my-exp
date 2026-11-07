import EmptyState from '@/components/EmptyState/EmptyState';
import styles from './Admin.module.scss';

// 尚未选择文章时说明已有操作入口，不用空白工作区代替反馈。
export default function AdminEmpty() {
    return (
        <div className={styles.empty}>
            <EmptyState
                icon="file"
                title="从目录选择一篇文章"
                description="在这里编辑原文、预览排版，保存为草稿或发布。"
            />
        </div>
    );
}
