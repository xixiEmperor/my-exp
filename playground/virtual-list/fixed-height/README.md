# 定高虚拟列表

独立 React 单页，10,000 条数据，行高 40px，视口高 400px，前后各保留 5 行缓冲。点击顶部和底部按钮可以验证两端边界，页面显示实际渲染行数。

在仓库根目录用 CMD 启动：

```bat
cd playground\virtual-list\fixed-height\web
pnpm install
pnpm dev
```

访问 http://127.0.0.1:5174 。需要 Node.js 20.19 及以上的 20.x，或 22.12 及以上版本，pnpm 10.17.1。

```bat
rem 检查类型并构建单页，输出位于 web/dist。
pnpm build
rem 本地查看构建结果。
pnpm preview
```

核心实现在 web/src/App.tsx。完整高度占位元素生成滚动条，scrollTop 除以行高得到数据下标，只把可见区和缓冲区的数据渲染成 DOM，再把这些行移动到原本应处的位置。

行的边框和内边距计入固定高度，不能让内容撑高。这个示例只处理定高数据，源码没有主站组件、路由或后端依赖。构建使用相对资源路径，可以直接放到 CDN 目录中由 iframe 加载。
