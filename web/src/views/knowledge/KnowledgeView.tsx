import { useCallback, useEffect, useMemo } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar/Sidebar';
import ArticleTree from '@/components/ArticleTree/ArticleTree';
import { useArticles } from '@/hooks/useArticles';
import { useArticleTree } from '@/hooks/useArticleTree';
import { useArticlesStore } from '@/stores/articles';
import type { TreeNode } from '@/types/article-tree';
import styles from './KnowledgeView.module.scss';

// 知识库前台布局：左侧是文章目录树，右侧交给子路由渲染空状态或文章详情。
export default function KnowledgeView() {
    const root = useArticlesStore((state) => state.folders.root);

    // 目录和详情都复用已有的状态管理与 hook，这里只负责把两者串起来
    const { find, folderChildrenRequest } = useArticleTree();
    const { findArticle } = useArticles();
    const navigate = useNavigate();

    useEffect(() => {
        // 首次进入知识库时把根目录的请求发出去，状态停留在 idle 时也能补一次
        if (root.status === 'idle') {
            find('root', root.folderName, null);
        }
    }, [root.status, root.folderName, find]);

    // 派生列表放在 useMemo 里，避免每次渲染都生成新数组
    const rootNodes = useMemo(
        () => [
            ...root.children.filter((node) => node.type === 'folder'),
            ...root.children.filter((node) => node.type === 'article'),
        ],
        [root.children],
    );

    // 点击文章先让 hook 预取详情，有缓存时不会重复发请求，再跳到前台详情路由
    const handleArticleClick = useCallback(
        (node: TreeNode) => {
            findArticle(node.id);
            navigate(`/knowledge/${node.id}`);
        },
        [findArticle, navigate],
    );

    return (
        <Sidebar
            className={styles.layout}
            top={
                <>
                    {/* 目录标识沿用阅读 demo，让真实文章入口更容易辨认。 */}
                    <Link to="/" className={styles.backLink}>
                        <span aria-hidden="true">←</span> 回到小站
                    </Link>
                    <div className={styles.heading}>
                        <span className={styles.mark} aria-hidden="true">
                            ▤
                        </span>
                        <div>
                            <h2>我的知识库</h2>
                            <p>学一点，做一点，再记下来。</p>
                        </div>
                    </div>
                </>
            }
            bottom={
                <>
                    {root.status === 'error' && (
                        <button
                            onClick={() => {
                                void folderChildrenRequest.run('root');
                            }}
                        >
                            重试加载目录
                        </button>
                    )}
                    <ArticleTree
                        data={rootNodes}
                        onFolderClick={(node) => find(node.id, node.name!, node.parentId)}
                        onArticleClick={handleArticleClick}
                    />
                </>
            }
        >
            {/* 右侧内容区交给路由，/knowledge 显示空状态，/knowledge/:id 显示文章详情 */}
            <Outlet />
        </Sidebar>
    );
}
