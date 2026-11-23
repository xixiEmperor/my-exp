/** demo 发布状态：草稿或已发布 */
export type DemoStatus = 'draft' | 'published';

/** 对应后端 demos 表记录，保留数据库中的 verison 拼写。 */
export interface DemoResource {
    /** 主键 ID（后端自动生成的 21 位 NanoID） */
    id: string;
    /** 稳定资源目录标识，对应本地目录及 R2 路径前缀 demos/<slug>/<verison>/ */
    slug: string;
    /** 前台展示名称，新建时默认与 slug 一致 */
    name: string;
    /** demo 说明，未配置时为 null */
    description: string | null;
    /** 检索标签列表，未配置时为 null */
    tags: string[] | null;
    /** 前台展示状态：draft（草稿）或 published（已发布） */
    status: DemoStatus;
    /** 实现目录名，default 表示场景根目录 */
    implementation: string;
    /** x.x.x 格式的版本号 */
    verison: string;
    /** 以场景目录为根的已上传源码相对路径数组 */
    file_paths: string[];
    /** 相对于所选实现目录的源码排除规则，未设置时为 null */
    exclude_paths: string[] | null;
    /** 创建时间 */
    created_at: string;
}

/** 查询指定 demo 变体目录的请求参数 */
export interface GetDemoVariantsReq {
    /** 本地 demo 目录名称 */
    demo_name: string;
}

/** 查询指定 demo 实现目录版本与源码路径的请求参数 */
export interface GetDemoImplementationReq extends GetDemoVariantsReq {
    /** 所选实现目录（变体）名称 */
    vary_name: string;
}

/** 查询 demos 列表的筛选参数，均为空时返回全部记录 */
export interface GetDemoResourcesReq {
    /** 稳定目录标识，配合 verison 精确查询 */
    slug?: string;
    /** x.x.x 格式的版本号 */
    verison?: string;
}

/** 新增 demo 资源并上传 R2 的请求体 */
export interface CreateDemoResourceReq {
    /** 选定 demo 的目录标识 */
    slug: string;
    /** 实现目录名，default 表示场景根目录 */
    implementation: string;
    /** x.x.x 格式的版本号 */
    verison: string;
    /** 相对于所选实现目录的排除规则列表 */
    exclude_paths?: string[];
}

/** 编辑 demo 展示信息的请求体 */
export interface UpdateDemoResourceReq {
    /** 前台展示名称 */
    name: string;
    /** demo 说明，为空时传 null */
    description: string | null;
    /** 检索标签列表，为空时传 null */
    tags: string[] | null;
    /** 发布状态 */
    status: DemoStatus;
}

/** 本地 demo 目录名称列表响应 */
export type GetDemoNamesResp = string[];

/** 本地实现目录（变体）名称列表响应 */
export type GetDemoVariantsResp = string[];

/** 指定实现目录的当前版本号响应 */
export type GetDemoVersionResp = string;

/** 指定实现目录下的源码相对路径列表响应 */
export type GetDemoSourcePathsResp = string[];

/** 新增 demo 表单字段值，主键 id 由后端自动生成 */
export interface DemoResourceFormValues {
    /** 所选 demo 目录名称 */
    demo: string;
    /** 所选实现目录（变体）名称 */
    implementation: string;
    /** 自动读取的版本号 */
    verison: string;
    /** 自动读取的源码相对路径列表 */
    file_paths: string[];
    /** 手动填写的排除规则（多行文本，每行一条） */
    exclude_paths?: string;
}

/** 编辑 demo 展示信息表单字段值 */
export interface DemoEditFormValues {
    /** 前台展示名称 */
    name: string;
    /** demo 说明 */
    description?: string;
    /** 检索标签数组 */
    tags?: string[];
    /** 发布状态 */
    status: DemoStatus;
}
