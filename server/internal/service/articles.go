package service

import (
	"context"

	"zhiye/server/internal/apperr"
	cons "zhiye/server/internal/constant"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/utils"

	gonanoid "github.com/matoous/go-nanoid/v2"
)

type ArticlesService struct {
	artiRepo *repository.ArticlesRepo
	userRepo *repository.UsersRepo
}

func NewArticlesService(artiRepo *repository.ArticlesRepo, userRepo *repository.UsersRepo) *ArticlesService {
	return &ArticlesService{
		artiRepo: artiRepo,
		userRepo: userRepo,
	}
}

// 查找文件夹的所有子节点，需要处理管理员，游客登录两种情况，区分文章是否为草稿状态
func (s *ArticlesService) FindNodes(c context.Context, id string) (dto.GetFolderNodesResp, error) {
	// 初始化结果数组
	var nodes dto.GetFolderNodesResp

	// 先找文件夹节点
	folders, err := s.artiRepo.FindFoldersByID(c, id)
	if err != nil {
		return nil, err
	}

	// 构造并追加进结果数组
	for _, val := range folders {
		node := dto.FolderNodes{
			ID:       val.ID,
			Name:     val.Name,
			Type:     "folder",
			ParentID: val.ParentID,
		}
		nodes = append(nodes, node)
	}

	// 再找文章节点
	// 找之前需要判断用户角色，先从上下文中获取中间件设置的user_id，用于查询用户身份
	user_id, ok := c.Value(cons.CtxUserID).(uint64)
	user, err := s.userRepo.FindUserByID(c, user_id)
	if err != nil {
		return nil, err
	}

	// 如果未登录或用户角色不为管理员，则不返回草稿文章
	articles, err := s.artiRepo.FindArticlesByID(c, id, !ok || user.Role != "admin")
	if err != nil {
		return nil, err
	}

	// 构造并追加进结果数组
	for _, val := range articles {
		node := dto.FolderNodes{
			ID:       val.ID,
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
	_, ok := c.Value(cons.CtxUserID).(uint64)

	// 如果 context 中没有 user_id，说明没登录，则需要返回 preview 部分
	if !ok {
		preview, err := s.artiRepo.FindArticlePreviewByID(c, article_id)
		if err != nil {
			return model.ArticlesPreview{}, err
		}

		// 游客只有预览内容，这里统一塞进 content 字段，前端不用区分两种返回结构
		content := ""
		if preview.Preview != nil {
			content = *preview.Preview
		}

		return model.ArticlesDetail{
			ArticlesBasis: preview.ArticlesBasis,
			Content:       content,
		}, nil
	}

	detail, err := s.artiRepo.FindArticleContentByID(c, article_id)
	if err != nil {
		return model.ArticlesDetail{}, err
	}
	return detail, nil
}

// 创建文章
func (s *ArticlesService) CreateArticle(c context.Context, folder_id string) (model.Articles, error) {
	// 为新文章生成21位nanoid
	id, err := gonanoid.New()
	if err != nil {
		return model.Articles{}, err
	}

	// 检查同一目录下的所有文章，草稿也需要参与名称去重。
	articles, err := s.artiRepo.FindArticlesByID(c, folder_id, false)
	if err != nil {
		return model.Articles{}, err
	}
	names := make([]string, 0, len(articles))
	for _, article := range articles {
		names = append(names, article.Title)
	}
	title := utils.UniqueName("新建文件", names)

	// 根目录在数据库中使用 NULL，与查询同级文章时的规则保持一致。
	var parentID *string
	if folder_id != "root" {
		parentID = &folder_id
	}

	// 创建文章实体
	newArticle := model.Articles{
		ArticlesBasis: model.ArticlesBasis{
			ID:       id,
			FolderID: parentID,
			Status:   "draft",
			Title:    title,
		},
	}

	err = s.artiRepo.CreateArticle(c, &newArticle)
	if err != nil {
		return model.Articles{}, apperr.MySQLError
	}
	return newArticle, nil
}

// 创建文件夹
func (s *ArticlesService) CreateFolder(c context.Context, folder_id string) (dto.FolderNodes, error) {
	// 为文件夹生成与文章一致的 NanoID 主键。
	id, err := gonanoid.New()
	if err != nil {
		return dto.FolderNodes{}, err
	}

	// 只检查同一父目录下的文件夹名称，复用统一的编号规则。
	folders, err := s.artiRepo.FindFoldersByID(c, folder_id)
	if err != nil {
		return dto.FolderNodes{}, err
	}
	names := make([]string, 0, len(folders))
	for _, folder := range folders {
		names = append(names, folder.Name)
	}

	// 根目录使用 NULL，其他目录直接保存父文件夹的 NanoID。
	var parentID *string
	if folder_id != "root" {
		parentID = &folder_id
	}

	name := utils.UniqueName("新建文件夹", names)
	newFolder := model.Folders{
		ID:       id,
		Name:     name,
		ParentID: parentID,
	}
	if err := s.artiRepo.CreateFolder(c, &newFolder); err != nil {
		return dto.FolderNodes{}, apperr.MySQLError
	}
	return dto.FolderNodes{
		ID:       id,
		Name:     name,
		Type:     "folder",
		ParentID: &folder_id,
	}, nil
}
