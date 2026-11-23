import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';

const HomeView = lazy(() => import('../views/home/HomeView'));
const KnowledgeView = lazy(() => import('../views/knowledge/KnowledgeView'));
const KnowledgeEmpty = lazy(() => import('../views/knowledge/KnowledgeEmpty'));
const KnowledgeArticle = lazy(() => import('../views/knowledge/KnowledgeArticle'));
const PlaygroundView = lazy(() => import('../views/playground/PlaygroundView'));
const NotFoundView = lazy(() => import('../views/not-found/NotFoundView'));

const Prac = lazy(() => import('@/views/Prac'));

const AdminIndex = lazy(() => import('@/views/admin/Index'));
const AdminEmpty = lazy(() => import('@/views/admin/AdminEmpty'));
const AdminArticles = lazy(() => import('@/views/admin/Articles'));
const AdminDemos = lazy(() => import('@/views/admin/Demos/Demos'));

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
            {
                path: 'playground',
                Component: PlaygroundView,
            },
            { path: '*', Component: NotFoundView },

            {
                path: '/prac',
                Component: Prac,
            },
            {
                path: '/admin',
                Component: AdminIndex,
                children: [
                    // 后台首页保留真实的操作说明，避免没有选中文章时整块留白。
                    { index: true, Component: AdminEmpty },
                    { path: 'demos', Component: AdminDemos },
                    { path: 'articles/:id', Component: AdminArticles },
                ],
            },
        ],
    },
]);
