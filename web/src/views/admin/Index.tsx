import { useCallback, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import Sidebar from '@/components/Sidebar/Sidebar';
import ArticleTree from '@/components/ArticleTree/ArticleTree';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import type { FolderNode } from '@/types/articles';

export default function AdminIndex() {
    const root = useArticlesStore((state) => state.folders.root);
    const { find, findArticle } = useArticles();
    const navigate = useNavigate();

    useEffect(() => {
        // 首次进入后台时把根目录的请求发出去，状态停留在 idle 时也能补一次
        if (root.status === 'idle') {
            find('root', root.folderName, null);
        }
    }, [root.status, root.folderName, find]);

    // 派生列表放在 useMemo 里，避免每次渲染都生成新数组
    const rootNodes = useMemo(
        () => (root.status === 'loaded' ? find('root', root.folderName, null) : []),
        [root.status, root.folderName, find],
    );

    // 点击文章先把详情交给 hook 预取，有缓存时这里不会重复发请求
    // 然后跳到编辑页，文章 id 走路径参数，编辑页再按 id 从缓存里取内容
    const handleArticleClick = useCallback(
        (node: FolderNode) => {
            findArticle(node.id);
            navigate(`/admin/articles/${node.id}`);
        },
        [findArticle, navigate],
    );

    return (
        <AuthGuard>
            {/* 上半部分先预留，等后台导航菜单定下来再接；下半部分放文章目录树 */}
            <Sidebar
                bottom={
                    <ArticleTree
                        data={rootNodes}
                        fromAdmin={true}
                        // 文件夹展开时按需加载下一层，结果写回 store 后组件会跟着重渲染
                        onFolderClick={(node) => find(node.id, node.name!, node.parentId)}
                        onArticleClick={handleArticleClick}
                    />
                }
            >
                {/* 右侧内容区交给路由，切换侧边栏选项时只替换这里 */}
                <Outlet />
            </Sidebar>
        </AuthGuard>
    );
}
