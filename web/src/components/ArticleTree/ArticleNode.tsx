import TreeRow from './TreeRow';
import type { FolderNode } from '@/types/articles';

interface ArticleNodeProps {
    /** 文章节点数据，只有 id、type、name 这些轻量信息 */
    node: FolderNode;
    /** 节点所在层级，从 0 开始，用来计算缩进 */
    level: number;
    /** 当前文件列表是否是在后台渲染 */
    fromAdmin: boolean;
    /** 点击这一行时触发 */
    onArticleClick?: (node: FolderNode) => void;
}

export default function ArticleNode({ node, level, fromAdmin, onArticleClick }: ArticleNodeProps) {
    // 文件行没有展开逻辑，只负责把点击事件带着节点数据交出去
    return (
        <TreeRow fromAdmin={fromAdmin} level={level} onClick={() => onArticleClick?.(node)}>
            {node.name ?? ''}
        </TreeRow>
    );
}
