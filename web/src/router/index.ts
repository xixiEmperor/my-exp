import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import HomeView from '../views/home/HomeView';
import KnowledgeView from '../views/knowledge/KnowledgeView';
import NotFoundView from '../views/not-found/NotFoundView';

// 所有路径集中在这一份配置中，首页、待开发入口和兜底页统一管理。
export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    // 仍然只维护这一份对象配置，通过 App 的 Outlet 展示页面。
    children: [
      { index: true, Component: HomeView },
      { path: 'knowledge', Component: KnowledgeView },
      { path: '*', Component: NotFoundView },
    ],
  },
]);
