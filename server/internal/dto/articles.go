package dto

// 新建文章请求体
type CreateArticleReq struct {
	// 所属文件夹的id
	FolderId string
	// 文章标题
	Title string
}

// 新建文件夹请求体
type CreateFolderReq struct {
	// 所属文件夹的id
	ParentId string
	// 文件夹名称
	Name string
}

// 保存文章请求体
type SaveArticleReq struct {
	// 文章标题
	Title string
	// 文章内容
	Content string
	// 文章状态
	Status string
}

// 文件夹子节点类型
type FolderNodes struct {
	// 文件夹或文章id
	Id string `json:"id"`
	// 节点类型：文件夹 或 文章
	Type string `json:"type"`
	// 名称
	Name string `json:"name"`
	// 所属文件夹id
	ParentId *string `json:"parentId"`
}

type GetFolderNodesResp = []FolderNodes
