package service

import (
	"context"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
)

type ArticlesService struct {
	repo *repository.ArticlesRepo
}

type Node struct {
	ID       string  `json:"id"`       // 节点 id，文件夹用 public_id，文章也用 public_id
	Name     string  `json:"name"`     // 节点显示名称，文件夹是名字，文章是标题
	Type     string  `json:"type"`     // 节点类型，folder 或 article
	ParentID *uint64 `json:"parentId"` // 所属父节点 id，根目录为 null
}

func NewArticlesService(repo *repository.ArticlesRepo) *ArticlesService {
	return &ArticlesService{
		repo: repo,
	}
}

// 查找文件夹的所有子节点，需要处理管理员，游客登录两种情况，区分文章是否为草稿状态
func (s *ArticlesService) FindNodes(c context.Context, id string) ([]Node, error) {
	// 初始化结果数组
	var nodes []Node

	// 先找文件夹节点
	folders, err := s.repo.FindFoldersByID(c, id)
	if err != nil {
		return nil, err
	}

	// 构造并追加进结果数组
	for _, val := range folders {
		node := Node{
			ID:       val.PublicID,
			Name:     val.Name,
			Type:     "folder",
			ParentID: val.ParentID,
		}
		nodes = append(nodes, node)
	}

	// 再找文章节点
	articles, err := s.repo.FindArticlesByID(c, id)
	if err != nil {
		return nil, err
	}

	// 构造并追加进结果数组
	for _, val := range articles {
		node := Node{
			ID:       val.PublicID,
			Name:     val.Title,
			Type:     "article", // 这里是文章，类型不能写成 folder
			ParentID: val.FolderID,
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

// 根据 id 查找文章相关信息，需要处理登录和未登录两种情况返回的信息
func (s *ArticlesService) FindArticleContent(c context.Context, article_id string) (model.ArticleContent, error) {
	_, ok := c.Value("user_id").(uint64)

	// 如果 context 中没有 user_id，说明没登录，则需要返回 preview 部分
	if !ok {
		preview, err := s.repo.FindArticlePreviewByID(c, article_id)
		if err != nil {
			return model.ArticlesPreview{}, err
		}
		return preview, nil
	}

	detail, err := s.repo.FindArticleContentByID(c, article_id)
	if err != nil {
		return model.ArticlesDetail{}, err
	}
	return detail, nil
}
