export interface Folder {
    /** 文件夹 id */
    id: string;
    /** 文件夹名称 */
    folderName: string;
    /** 文件夹所属文件夹 id */
    parentId: string | null;
    /** 文件夹下子节点 */
    children: Array<Folder | Article>;
}

export interface Article {
    /** 文章 id */
    id: string;
    /** 文章标题 */
    title: string;
    /** 文章内容 */
    content: string;
    /** 文章状态 */
    status: 'published' | 'draft';
    /** 浏览量 */
    views: number;
    /** 文章所属文件夹 id */
    parentId: string | null;
    /** 文章创建时间 */
    createdAt: Date;
    /** 文章最后更新时间 */
    lastModifiedAt: Date;
}
