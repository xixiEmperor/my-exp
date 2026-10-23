/** 未缓存 | 加载中 | 加载完成（包括空文件夹） | 加载失败 */
export type FolderStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type NodeType = 'folder' | 'article';

export interface FolderNode {
    /** 文件夹或文章id */
    id: string;
    /** 节点类型：文件夹 或 文章 */
    type: NodeType;
    /** 名称 */
    name: string;
    /** 所属文件夹id */
    parentId: string | null;
}

export interface Folder {
    /** 文件夹 id */
    id: string;
    /** 文件夹名称 */
    folderName: string;
    /** 文件夹所属文件夹 id */
    parentId: string | null;
    /** 文件夹下子节点，这里不直接存Folder或Article，而是根据子节点的type和id从zustand里面现查，简化数据模型 */
    children: Array<FolderNode>;
    /** 文件夹状态 */
    status: FolderStatus;
}

export interface Article {
    /** 文章 id */
    public_id: string;
    /** 文章标题 */
    title: string;
    /** 文章内容 */
    content: string;
    /** 文章状态 */
    status: 'published' | 'draft';
    /** 浏览量 */
    views: number;
    /** 文件路径 */
    slug: string;
    /** 文章所属文件夹 id */
    folder_id: string | null;
    /** 文章创建时间 */
    created_at: Date;
    /** 文章最后更新时间 */
    last_modified_at: Date;
    /** 文章发布时间 */
    published_at: Date;
    /** 删除时间 */
    deleted_at: Date;
}

export type GetFolderChildrenResp = Array<FolderNode>;

export type GetArticleDetailResp = Article;
