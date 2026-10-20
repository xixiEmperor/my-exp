import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import Sidebar from '@/components/Sidebar/Sidebar';
import ArticleTree from '@/components/ArticleTree/ArticleTree';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';

export default function AdminIndex() {
    const { find } = useArticles();
    // 只订阅根文件夹的状态，等它加载完成后再把数据喂给文章树
    const rootStatus = useArticlesStore((state) => state.folders.root?.status);

    useEffect(() => {
        // 首次进入后台时把根目录的请求发出去，状态停留在 idle 时也能补一次
        if (rootStatus === 'idle') {
            find('root');
        }
    }, [rootStatus, find]);

    // 根目录加载完成前先给空数组，树组件会自己把空列表渲染成空白
    const rootNodes = rootStatus === 'loaded' ? find('root') : [];

    // 文章点击暂时留空，等文章编辑页的路由定下来再在这里做跳转
    const handleArticleClick = () => {};

    return (
        <AuthGuard>
            {/* 上半部分先预留，等后台导航菜单定下来再接；下半部分放文章目录树 */}
            <Sidebar
                bottom={
                    <ArticleTree
                        data={rootNodes}
                        // 文件夹展开时按需加载下一层，结果写回 store 后组件会跟着重渲染
                        onFolderClick={(node) => find(node.id)}
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
