package dto

// CreateFolderReq 只接收文件夹的父目录，不再接收节点类型。
type CreateFolderReq struct {
	// parent_id 使用 root 表示根目录，其他值为真实文件夹 ID。
	ParentID string `json:"parent_id"`
}

// RenameFolderReq 只接收文件夹 id 和新名称。
type RenameFolderReq struct {
	// 文件夹 ID
	ID string `json:"id"`
	// 文件夹新名称
	Name string `json:"name"`
}

// FolderResp 是文件夹创建和子文件夹列表共用的资源响应。
type FolderResp struct {
	// 文件夹主键与名称直接取自实际实体。
	ID   string `json:"id"`
	Name string `json:"name"`
	// 根目录的父节点明确返回 null，不返回虚拟节点 root。
	ParentID *string `json:"parentId"`
}

// GetFolderChildrenResp 只包含文件夹，不混入文章节点。
type GetFolderChildrenResp = []FolderResp
