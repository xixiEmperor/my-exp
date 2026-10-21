package service

import "zhiye/server/internal/repository"

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

func (s *ArticlesService) FindNodes(id string) ([]Node, error) {
	// 初始化结果数组
	var nodes []Node

	// 先找文件夹节点
	folders, err := s.repo.FindFoldersByID(id)
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
	articles, err := s.repo.FindArticlesByID(id)
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
