// 字段名与 demo_resources 一致，保留数据库中的 verison 拼写。
export interface DemoResource {
    id: string;
    demo_entry_id: string;
    implementation: string;
    verison: string;
    r2_prefix: string;
    file_paths: string[];
    exclude_paths: string[] | null;
    created_at: string;
    updated_at: string;
}

// 本地目录查询的参数和响应分别声明，API 不再通过路径联合类型混用。
export interface GetDemoVariantsReq {
    demo_name: string;
}

export interface GetDemoImplementationReq extends GetDemoVariantsReq {
    vary_name: string;
}

export type GetDemoNamesResp = string[];

export type GetDemoVariantsResp = string[];

export type GetDemoVersionResp = string;

export type GetDemoSourcePathsResp = string[];

// 新增表单仅收集本地资源信息，真正上传和入库仍由确认逻辑接入。
export interface DemoResourceFormValues {
    demo: string;
    implementation: string;
    verison: string;
    file_paths: string[];
    exclude_paths?: string;
}
