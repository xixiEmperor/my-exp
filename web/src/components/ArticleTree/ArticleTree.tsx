import styles from './ArticleTree.module.scss';
import ArticleTreeNode from './ArticleTreeNode';
import type { FolderNode } from '@/types/articles';

/** 树的根数据，既可以是文件夹也可以是文件，节点里只有 id、type、name */
export type TreeData = Array<FolderNode>;

export interface ArticleTreeProps {
    /** 根层级的节点列表,这里初始数据需要在接入侧调用 find('root') 并传入 */
    data: TreeData;
    /** 当前文件列表是否是在后台渲染 */
    fromAdmin: boolean;
    /** 文件夹展开时触发，由接入侧在里面调用 find(id) 并返回子节点 */
    onFolderClick?: (node: FolderNode) => Array<FolderNode>;
    /** 任意层级的文章被点击时触发 */
    onArticleClick?: (node: FolderNode) => void;
}

export default function ArticleTree({
    data,
    fromAdmin = false,
    onFolderClick,
    onArticleClick,
}: ArticleTreeProps) {
    return (
        <ul className={styles.tree} role="tree">
            {data.map((node) => (
                <ArticleTreeNode
                    key={node.id + node.name}
                    node={node}
                    fromAdmin={fromAdmin}
                    level={0}
                    onFolderClick={onFolderClick}
                    onArticleClick={onArticleClick}
                />
            ))}
        </ul>
    );
}
