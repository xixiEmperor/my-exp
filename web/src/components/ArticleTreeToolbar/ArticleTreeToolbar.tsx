import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { useArticleTree } from '@/hooks/useArticleTree';
import styles from './ArticleTreeToolbar.module.scss';

// 根目录工具栏独立于文章树，空目录时也能创建第一篇文章或文件夹。
export default function ArticleTreeToolbar() {
    const { createArticleRequest, createFolderRequest } = useArticleTree();
    const loading = createArticleRequest.loading || createFolderRequest.loading;

    // 根层级统一使用 root，由现有请求方法同步新节点和处理业务错误。
    const handleCreate = async (type: 'article' | 'folder') => {
        if (type === 'article') {
            await createArticleRequest.run('root');
        } else {
            await createFolderRequest.run('root');
        }
    };

    return (
        <div className={styles.toolbar} role="group" aria-label="根目录工具栏" aria-busy={loading}>
            {/* 两个入口始终可见，不依赖树节点的悬停或展开状态。 */}
            <button
                type="button"
                className={styles.action}
                disabled={loading}
                onClick={async () => await handleCreate('article')}
            >
                <SiteIcon name="createFile" size={14} />
                创建文章
            </button>
            <button
                type="button"
                className={styles.action}
                disabled={loading}
                onClick={async () => await handleCreate('folder')}
            >
                <SiteIcon name="createFolder" size={14} />
                创建文件夹
            </button>
        </div>
    );
}
