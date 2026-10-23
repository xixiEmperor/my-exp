import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomeView from '../views/home/HomeView';
import KnowledgeView from '../views/knowledge/KnowledgeView';
import KnowledgeEmpty from '../views/knowledge/KnowledgeEmpty';
import KnowledgeArticle from '../views/knowledge/KnowledgeArticle';
import NotFoundView from '../views/not-found/NotFoundView';
// import Prac from '@/views/Prac';
import { lazy } from 'react';

const AdminIndex = lazy(() => import('@/views/admin/Index'));
const AdminArticles = lazy(() => import('@/views/admin/Articles'));

// 所有路径集中在这一份配置中，首页、待开发入口和兜底页统一管理。
export const router = createBrowserRouter([
    {
        path: '/',
        Component: App,
        children: [
            { index: true, Component: HomeView },
            {
                // 知识库是一个带侧边目录的布局路由，右侧内容由子路由决定
                path: 'knowledge',
                Component: KnowledgeView,
                children: [
                    // 只停在 /knowledge 时右侧展示空状态
                    { index: true, Component: KnowledgeEmpty },
                    // 前台文章详情，文章 id 走路径参数
                    { path: ':id', Component: KnowledgeArticle },
                ],
            },
            { path: '*', Component: NotFoundView },
            // {
            //     path: '/prac',
            //     Component: Prac,
            // },
            {
                path: '/admin',
                Component: AdminIndex,
                children: [
                    // 文章详情页，文章 id 作为路径参数，页面自己按 id 读缓存或发请求
                    { path: 'articles/:id', Component: AdminArticles },
                ],
            },
        ],
    },
]);
