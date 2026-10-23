import EmptyState from '@/components/EmptyState/EmptyState';
import styles from './KnowledgeEmpty.module.scss';

// 知识库默认页。还没有选中文章时，右侧只保留一个空状态，引导用户从左侧目录入口进入。
export default function KnowledgeEmpty() {
    return (
        <div className={styles.page}>
            <EmptyState
                icon="book"
                title="从左侧挑一篇开始读"
                description="目录里的文章点开之后，正文会显示在这块区域。"
            />
        </div>
    );
}
