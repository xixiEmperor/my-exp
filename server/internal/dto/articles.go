package dto

import (
	"mime/multipart"

	"zhiye/server/internal/model"
)

// CreateArticleReq 只接收文章所属目录，不接收节点类型。
type CreateArticleReq struct {
	// 所属文件夹的id
	FolderID string `json:"folder_id"`
}

// 保存文章请求体
type UpdateArticleReq struct {
	// 文章标题
	ID string `form:"id"`
	// 文章内容
	Content string `form:"content"`
	// 文章状态
	Status string `form:"status"`
	// 不参与自动绑定，手动填充
	Images map[string]*multipart.FileHeader `form:"-"`
}

type RenameArticleReq struct {
	// 文章 ID
	ID string `json:"id"`
	// 文章标题
	Title string `json:"title"`
}

// RenameArticleResp 只返回前端同步目录树需要的字段。
type RenameArticleResp = RenameArticleReq

// GetArticlesByFolderIDResp 只包含文章简要信息。
type GetArticlesByFolderIDResp = []model.ArticlesBrief
