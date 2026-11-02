export type NodeType = 'folder' | 'article';

export interface TreeNode {
    /** 文件夹或文章id */
    id: string;
    /** 节点类型：文件夹 或 文章 */
    type: NodeType;
    /** 名称 */
    name: string;
    /** 所属文件夹id */
    parentId: string | null;
}

// 混合节点只用于前端展示，不作为资源接口响应。
export type TreeNodes = TreeNode[];
