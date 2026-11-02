import type { TreeNode } from './article-tree';

/** 未缓存 | 加载中 | 加载完成（包括空文件夹） | 加载失败 */
export type FolderStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface Folder {
    /** 文件夹 id */
    id: string;
    /** 文件夹名称 */
    folderName: string;
    /** 文件夹所属文件夹 id */
    parentId: string | null;
    /** 文件夹下子节点，这里不直接存Folder或Article，而是根据子节点的type和id从zustand里面现查，简化数据模型 */
    children: Array<TreeNode>;
    /** 文件夹状态 */
    status: FolderStatus;
}

// 文件夹资源响应不包含展示类型。
export interface FolderResp {
    id: string;
    name: string;
    parentId: string | null;
}

export interface CreateFolderReq {
    parent_id: string;
}

export type GetFolderChildrenResp = FolderResp[];
