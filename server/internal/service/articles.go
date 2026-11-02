package service

import (
	"context"
	"strings"

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
}

func NewArticlesService(artiRepo *repository.ArticlesRepo) *ArticlesService {
	return &ArticlesService{
		artiRepo: artiRepo,
	}
}

// GetArticlesByFolderID 只查询文章，草稿权限由业务层决定。
func (s *ArticlesService) GetArticlesByFolderID(c context.Context, id string) (dto.GetArticlesByFolderIDResp, error) {
	parentID, err := normalizeDirectoryID(id)
	if err != nil {
		return nil, err
	}
	// 找之前需要判断用户角色，直接从上下文中获取用户信息
	userInfo, ok := c.Value(cons.CtxUserInfo).(*model.Users)
	// 如果未登录或用户角色不为管理员，则不返回草稿文章
	withoutDraft := !ok || userInfo == nil || userInfo.Role != "admin"
	return s.artiRepo.FindArticlesByFolderID(c, parentID, withoutDraft)
}

// 根据 id 查找文章相关信息，需要处理登录和未登录两种情况返回的信息
func (s *ArticlesService) FindArticleContent(c context.Context, article_id string) (model.ArticleContent, error) {
	_, ok := c.Value(cons.CtxUserInfo).(*model.Users)

	// 如果 context 中没有 user_info，说明没登录，则需要返回 preview 部分
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
	// 根目录在数据库中使用 NULL，与查询同级文章时的规则保持一致。
	// 创建前先校验目录，根目录只在这里转换成空关联。
	parentID, err := normalizeDirectoryID(folder_id)
	if err != nil {
		return model.Articles{}, err
	}
	// 为新文章生成21位nanoid
	id, err := gonanoid.New()
	if err != nil {
		return model.Articles{}, err
	}

	// 检查同一目录下的所有文章，草稿也需要参与名称去重。
	articles, err := s.artiRepo.FindArticlesByFolderID(c, parentID, false)
	if err != nil {
		return model.Articles{}, err
	}
	names := make([]string, 0, len(articles))
	for _, article := range articles {
		names = append(names, article.Title)
	}
	title := utils.UniqueName("新建文件", names)

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

// 更新文章内容
func (s *ArticlesService) UpdateArticle(c context.Context, article_id, content, status string) error {
	// 先根据 preview 分割符分割出两部分
	res := strings.Split(content, cons.SplitFlag)

	// 这里直接拼接就可以得到完整的正文
	content = strings.Join(res, "")

	// 构造要更新的内容的结构体
	options := repository.ArticleUpdate{
		Status:  &status,
		Preview: &res[0],
		Content: &content,
	}

	err := s.artiRepo.UpdateArticle(c, article_id, options)
	if err != nil {
		return err
	}
	return nil
}
