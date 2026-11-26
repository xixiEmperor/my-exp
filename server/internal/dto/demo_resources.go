package dto

// CreateDemoResourceReq 用于添加并发布指定 demo 版本的静态资源与源码记录。
type CreateDemoResourceReq struct {
	Slug           string   `json:"slug"`           // demo 稳定目录标识，对应本地 demos/<slug> 或 playground/<slug>
	Implementation string   `json:"implementation"` // 实现目录名，default 表示场景根目录
	Verison        string   `json:"verison"`        // x.x.x 格式的版本号（保留数据库拼写）
	ExcludePaths   []string `json:"exclude_paths"`  // 相对于所选实现目录的源码排除规则
}

// UpdateDemoResourceReq 用于编辑 demo 的前台展示信息。
type UpdateDemoResourceReq struct {
	Name        string   `json:"name"`        // 前台展示名称
	Description *string  `json:"description"` // demo 说明，nil 或空字符串表示清空
	Tags        []string `json:"tags"`        // 检索标签列表
	Status      string   `json:"status"`      // 发布状态：draft（草稿）或 published（已发布）
}
