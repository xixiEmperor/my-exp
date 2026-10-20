import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomeView from '../views/home/HomeView';
import KnowledgeView from '../views/knowledge/KnowledgeView';
import NotFoundView from '../views/not-found/NotFoundView';
import Prac from '@/views/Prac';
import { lazy } from 'react';

const AdminIndex = lazy(() => import('@/views/admin/Index'));

// 所有路径集中在这一份配置中，首页、待开发入口和兜底页统一管理。
export const router = createBrowserRouter([
    {
        path: '/',
        Component: App,
        children: [
            { index: true, Component: HomeView },
            { path: 'knowledge', Component: KnowledgeView },
            { path: '*', Component: NotFoundView },
            {
                path: '/prac',
                Component: Prac,
            },
            {
                path: '/admin',
                Component: AdminIndex,
                children: [],
            },
        ],
    },
]);
