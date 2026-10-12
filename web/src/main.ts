import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles/global.scss';

// 启动时明确检查挂载容器，避免页面静默空白。
const container = document.getElementById('root');

if (!container) {
  throw new Error('找不到 React 挂载容器 root');
}

// 入口保持 .ts，使用 createElement 挂载唯一的路由实例。
createRoot(container).render(
  createElement(StrictMode, null, createElement(RouterProvider, { router })),
);
