import { useState, type ReactNode } from 'react';
import styles from './ArticleTree.module.scss';
import TreeRow from './TreeRow';
import type { FolderNode as FolderNodeData } from '@/types/articles';

interface FolderNodeProps {
    /** 文件夹节点数据，只有 id、type、name 这些轻量信息 */
    node: FolderNodeData;
    /** 节点所在层级，从 0 开始，用来计算缩进 */
    level: number;
    /** 子节点渲染函数，由 ArticleTreeNode 提供，只有展开时才会被调用 */
    renderChildren: () => ReactNode;
}

export default function FolderNode({ node, level, renderChildren }: FolderNodeProps) {
    // 展开状态由文件夹自己持有，文章节点完全不用关心
    const [open, setOpen] = useState(false);
    // 展开过一次之后就让子节点一直留在 DOM 里，收起时才能撑住高度做过渡动画
    const [mounted, setMounted] = useState(false);

    const toggle = () => {
        setOpen((prev) => !prev);
        setMounted(true);
    };

    return (
        <>
            <TreeRow level={level} hasArrow open={open} onClick={toggle}>
                {node.name ?? ''}
            </TreeRow>

            {/* 外层 grid 从 0fr 过渡到 1fr，内层负责裁剪，做出高度动画 */}
            <div className={`${styles['tree-children-wrapper']} ${open ? styles.open : ''}`}>
                <ul className={styles['tree-children']} role="group">
                    {/* 第一次展开之前不渲染，也就不会触发 find 请求；之后一直保留 */}
                    {mounted ? renderChildren() : null}
                </ul>
            </div>
        </>
    );
}
