import ArticleTree from '@/components/ArticleTree/ArticleTree';
import type { TreeNode } from '@/types/article-tree';
import { DragDropProvider } from '@dnd-kit/react';
import { useState, useMemo } from 'react';

export default function ArticleManager() {
    // 三个一级文件夹，React 是二级文件夹，每个文件夹都有模拟文章。
    const [mockNodes, setMock] = useState<TreeNode[]>([
        { id: 'mock-frontend', type: 'folder', name: '前端笔记', parentId: null },
        { id: 'mock-backend', type: 'folder', name: '后端笔记', parentId: null },
        { id: 'mock-daily', type: 'folder', name: '日常记录', parentId: null },
        { id: 'mock-react', type: 'folder', name: 'React', parentId: 'mock-frontend' },
        { id: 'mock-css', type: 'article', name: 'CSS 布局整理', parentId: 'mock-frontend' },
        { id: 'mock-hooks', type: 'article', name: 'React Hooks 使用笔记', parentId: 'mock-react' },
        { id: 'mock-state', type: 'article', name: '组件状态管理', parentId: 'mock-react' },
        { id: 'mock-api', type: 'article', name: '接口设计笔记', parentId: 'mock-backend' },
        { id: 'mock-database', type: 'article', name: '数据库查询整理', parentId: 'mock-backend' },
        { id: 'mock-review', type: 'article', name: '本周学习记录', parentId: 'mock-daily' },
    ]);

    // 根列表展示一级文件夹，展开时根据 parentId 查找对应的子节点。
    const mockRootNodes = useMemo(() => mockNodes.filter((node) => node.parentId === null), []);

    // 只渲染本地列表，展开文件夹时直接返回模拟数据。
    return (
        <DragDropProvider
            // onDragOver={(e) => {
            //     console.log(e);
            // }}
            onDragEnd={(e) => {
                const curId = e.operation.source?.id;
                const tarId = e.operation.target?.id;

                console.log(curId);
                console.log(tarId);

                if (curId === tarId) return;

                let cur = mockNodes.find((item) => item.id === curId);

                if (!cur) return;

                cur.parentId = tarId as string;
                setMock((p) => {
                    return p.map((item) => {
                        if (item.id === curId) return cur;
                        return item;
                    });
                });
                console.log(cur);
            }}
        >
            <ArticleTree
                data={mockRootNodes}
                onFolderClick={(node) => mockNodes.filter((child) => child.parentId === node.id)}
                fromAdmin={true}
            />
        </DragDropProvider>
    );
}
