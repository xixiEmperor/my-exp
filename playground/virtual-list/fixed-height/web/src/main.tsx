import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 单页独立挂载，不依赖主站路由、状态或样式。
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
