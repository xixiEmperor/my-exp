// import { useState } from 'react';
// import ArticleTree from '@/components/ArticleTree/ArticleTree';
// import { useArticles } from '@/hooks/useArticles';
// import { useArticlesStore } from '@/stores/articles';
// import type { Folder, FolderNode } from '@/types/articles';

// /** 构造 mock 的文件夹骨架，用工厂函数返回新对象，避免 immer 冻结后影响复用 */
// const createMockFolders = (): Record<string, Folder> => ({
//     root: {
//         id: 'root',
//         folderName: '全部文章',
//         parentId: null,
//         children: [],
//         status: 'loaded',
//     },
//     'folder-tech': {
//         id: 'folder-tech',
//         folderName: '技术笔记',
//         parentId: 'root',
//         children: [],
//         status: 'loaded',
//     },
//     'folder-front': {
//         id: 'folder-front',
//         folderName: '前端',
//         parentId: 'folder-tech',
//         children: [],
//         status: 'loaded',
//     },
//     'folder-back': {
//         id: 'folder-back',
//         folderName: '后端',
//         parentId: 'folder-tech',
//         children: [],
//         status: 'loaded',
//     },
//     'folder-life': {
//         id: 'folder-life',
//         folderName: '生活随笔',
//         parentId: 'root',
//         children: [],
//         status: 'loaded',
//     },
// });

// /** 每个文件夹下挂哪些子节点，key 是父文件夹 id */
// const MOCK_CHILDREN: Record<string, FolderNode[]> = {
//     root: [
//         { id: 'folder-tech', type: 'folder', name: '技术笔记', parentId: 'root' },
//         { id: 'folder-life', type: 'folder', name: '生活随笔', parentId: 'root' },
//         { id: 'article-reading', type: 'article', name: '读书笔记', parentId: 'root' },
//     ],
//     'folder-tech': [
//         { id: 'folder-front', type: 'folder', name: '前端', parentId: 'folder-tech' },
//         { id: 'folder-back', type: 'folder', name: '后端', parentId: 'folder-tech' },
//     ],
//     'folder-front': [
//         {
//             id: 'article-react',
//             type: 'article',
//             name: 'React 状态管理 6666666666666666666666666666666',
//             parentId: 'folder-front',
//         },
//         { id: 'article-css', type: 'article', name: 'CSS 布局技巧', parentId: 'folder-front' },
//     ],
//     'folder-back': [
//         { id: 'article-go', type: 'article', name: 'Go 并发模型', parentId: 'folder-back' },
//     ],
//     'folder-life': [
//         { id: 'article-hiking', type: 'article', name: '周末爬山', parentId: 'folder-life' },
//     ],
// };

// /** 把 mock 数据写进 zustand，appendFolderNodes 要求目标文件夹已经存在 */
// function seedMockData() {
//     const store = useArticlesStore.getState();

//     // 已经初始化过就直接返回，避免热更新或重复进入页面时重复追加
//     if (store.folders.root) {
//         return;
//     }

//     useArticlesStore.setState({ folders: createMockFolders() });

//     for (const [folderId, nodes] of Object.entries(MOCK_CHILDREN)) {
//         store.appendFolderNodes(folderId, nodes);
//     }
// }

// // 在模块加载时就塞好数据，保证首次渲染调用 find('root') 能直接命中缓存
// seedMockData();

// export default function Prac() {
//     const { find } = useArticles();
//     /** 当前点击的文章名称，只是用来看交互效果 */
//     const [selected, setSelected] = useState('');

//     return (
//         <div style={{ width: 320, padding: 24 }}>
//             <h3>文章目录</h3>
//             <ArticleTree
//                 // 根节点列表直接从缓存里取，文件夹在前、文章在后
//                 data={find('root')}
//                 // 展开文件夹时继续从缓存里取下一层子节点
//                 onFolderClick={(node) => find(node.id)}
//                 onArticleClick={(node) => setSelected(node.name ?? '')}
//             />
//             <p>{selected ? `当前选中：${selected}` : '点击文章试试'}</p>
//         </div>
//     );
// }
