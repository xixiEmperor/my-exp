import { useCallback, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import Sidebar from '@/components/Sidebar/Sidebar';
import ArticleTree from '@/components/ArticleTree/ArticleTree';
import { useArticles } from '@/hooks/useArticles';
import { useArticleTree } from '@/hooks/useArticleTree';
import { useArticlesStore } from '@/stores/articles';
import type { TreeNode } from '@/types/article-tree';
import styles from './Admin.module.scss';

export default function AdminIndex() {
    const root = useArticlesStore((state) => state.folders.root);
    const { find, folderChildrenRequest } = useArticleTree();
    const { findArticle } = useArticles();
    const navigate = useNavigate();

    useEffect(() => {
        // 首次进入后台时把根目录的请求发出去，状态停留在 idle 时也能补一次
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

    // 点击文章先把详情交给 hook 预取，有缓存时这里不会重复发请求
    // 然后跳到编辑页，文章 id 走路径参数，编辑页再按 id 从缓存里取内容
    const handleArticleClick = useCallback(
        (node: TreeNode) => {
            findArticle(node.id);
            navigate(`/admin/articles/${node.id}`);
        },
        [findArticle, navigate],
    );

    return (
        <AuthGuard>
            {/* 上半部分先预留，等后台导航菜单定下来再接；下半部分放文章目录树 */}
            <Sidebar
                className={styles.layout}
                top={
                    <div className={styles.heading}>
                        {/* 工作区标识只负责区分编辑与阅读，不引入新的业务状态。 */}
                        <span aria-hidden="true">✎</span>
                        <div>
                            <h2>文章管理</h2>
                            <p>整理目录，编辑文章。</p>
                        </div>
                    </div>
                }
                bottom={
                    <>
                        {/* 根目录失败时允许手动重试，保留已有节点。 */}
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
                            fromAdmin={true}
                            onFolderClick={(node) => find(node.id, node.name!, node.parentId)}
                            onArticleClick={handleArticleClick}
                        />
                    </>
                }
            >
                {/* 右侧内容区交给路由，切换侧边栏选项时只替换这里 */}
                <Outlet />
            </Sidebar>
        </AuthGuard>
    );
}
