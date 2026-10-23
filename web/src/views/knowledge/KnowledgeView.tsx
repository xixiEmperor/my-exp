import { useCallback, useEffect, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar/Sidebar';
import ArticleTree from '@/components/ArticleTree/ArticleTree';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import type { FolderNode } from '@/types/articles';

// 知识库前台布局：左侧是文章目录树，右侧交给子路由渲染空状态或文章详情。
export default function KnowledgeView() {
    const root = useArticlesStore((state) => state.folders.root);

    // 目录和详情都复用已有的状态管理与 hook，这里只负责把两者串起来
    const { find, findArticle } = useArticles();
    const navigate = useNavigate();

    useEffect(() => {
        // 首次进入知识库时把根目录的请求发出去，状态停留在 idle 时也能补一次
        if (root.status === 'idle') {
            find('root', root.folderName, null);
        }
    }, [root.status, root.folderName, find]);

    // 派生列表放在 useMemo 里，避免每次渲染都生成新数组
    const rootNodes = useMemo(
        () => (root.status === 'loaded' ? find('root', root.folderName, null) : []),
        [root.status, root.folderName, find],
    );

    // 点击文章先让 hook 预取详情，有缓存时不会重复发请求，再跳到前台详情路由
    const handleArticleClick = useCallback(
        (node: FolderNode) => {
            findArticle(node.id);
            navigate(`/knowledge/${node.id}`);
        },
        [findArticle, navigate],
    );

    return (
        <Sidebar
            bottom={
                <ArticleTree
                    data={rootNodes}
                    onFolderClick={(node) => find(node.id, node.name!, node.parentId)}
                    onArticleClick={handleArticleClick}
                />
            }
        >
            {/* 右侧内容区交给路由，/knowledge 显示空状态，/knowledge/:id 显示文章详情 */}
            <Outlet />
        </Sidebar>
    );
}
