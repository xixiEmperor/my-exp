import ArticleNode from './ArticleNode';
import FolderNode from './FolderNode';
import type { FolderNode as FolderNodeData } from '@/types/articles';

export interface ArticleTreeNodeProps {
    /** 当前要渲染的节点，只是轻量引用，完整数据存在 zustand 里 */
    node: FolderNodeData;
    /** 节点所在层级，从 0 开始，用来计算缩进 */
    level: number;
    /** 当前文件列表是否是在后台渲染 */
    fromAdmin: boolean;
    /** 文件夹展开时触发，返回该文件夹的子节点 */
    onFolderClick?: (node: FolderNodeData) => Array<FolderNodeData>;
    /** 文章被点击时的回调，会随递归一直往下传 */
    onArticleClick?: (node: FolderNodeData) => void;
}

// 新的数据结构里节点自带 type 字段，直接靠它区分文件夹和文章
export function isFolderNode(node: FolderNodeData): boolean {
    return node.type === 'folder';
}

export default function ArticleTreeNode({
    node,
    level,
    fromAdmin,
    onFolderClick,
    onArticleClick,
}: ArticleTreeNodeProps) {
    // 递归点统一收敛在这里，子节点渲染好之后才交给 FolderNode，
    // 这样 FolderNode 不需要反向 import 本组件，两个文件之间不会形成循环依赖
    return (
        <li role="treeitem">
            {isFolderNode(node) ? (
                <FolderNode
                    node={node}
                    level={level}
                    fromAdmin={fromAdmin}
                    // 用函数延迟到展开时再取子节点，避免一进页面就把整棵树都请求一遍
                    renderChildren={() =>
                        // 回调没传时当作空文件夹处理，避免展开时直接报错
                        (onFolderClick?.(node) ?? []).map((child) => (
                            <ArticleTreeNode
                                key={child.id}
                                node={child}
                                fromAdmin={fromAdmin}
                                level={level + 1}
                                onFolderClick={onFolderClick}
                                onArticleClick={onArticleClick}
                            />
                        ))
                    }
                />
            ) : (
                <ArticleNode
                    node={node}
                    level={level}
                    fromAdmin={fromAdmin}
                    onArticleClick={onArticleClick}
                />
            )}
        </li>
    );
}
