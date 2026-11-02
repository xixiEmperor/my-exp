package dto

import "zhiye/server/internal/model"

// CreateArticleReq 只接收文章所属目录，不接收节点类型。
type CreateArticleReq struct {
	// 所属文件夹的id
	FolderID string `json:"folder_id"`
}

// 保存文章请求体
type UpdateArticleReq struct {
	// 文章标题
	ID string `json:"id"`
	// 文章内容
	Content string `json:"content"`
	// 文章状态
	Status string `json:"status"`
}

// GetArticlesByFolderIDResp 只包含文章简要信息。
type GetArticlesByFolderIDResp = []model.ArticlesBrief
