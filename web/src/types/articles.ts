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

// 目录列表只包含文章简要字段。
export type ArticleBrief = Pick<Article, 'id' | 'title' | 'folder_id'>;

/** 修改文章内容请求体 */
export type UpdateArticleReq = FormData;

/** 重命名文章请求体，返回结构相同 */
export type RenameArticleReq = Pick<Article, 'id' | 'title'>;

export interface CreateArticleReq {
    folder_id: string;
}

export type GetArticlesByFolderIDResp = ArticleBrief[];

export type GetArticleDetailResp = Article;
