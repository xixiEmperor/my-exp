package dto

import "zhiye/server/internal/model"

// CreateArticleReq 只接收文章所属目录，不接收节点类型。
type CreateArticleReq struct {
	// 所属文件夹的id
	FolderID string `json:"folder_id"`
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

// GetArticlesByFolderIDResp 只包含文章简要信息。
type GetArticlesByFolderIDResp = []model.ArticlesBrief
