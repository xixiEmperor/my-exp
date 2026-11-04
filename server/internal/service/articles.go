package service

import (
	"context"
	"errors"
	"fmt"
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
	user_info, ok := c.Value(cons.CtxUserInfo).(*model.Users)

	// 如果 context 中没有 user_info，说明没登录，则需要返回 preview 部分
	if !ok {
		preview, err := s.artiRepo.FindArticlePreviewByID(c, article_id)
		if err != nil {
			return model.ArticlesPreview{}, err
		}
		if preview.Status == "draft" {
			return model.ArticlesPreview{}, ErrNotPublished
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

	// 这里查找到带有分隔符的基础内容
	detail, err := s.artiRepo.FindArticleContentByID(c, article_id)
	if err != nil {
		return model.ArticlesDetail{}, err
	}

	// 如果是非管理员，这里需要把分隔符消除后再返回内容
	if user_info.Role != "admin" {
		// 非管理员也无权获取草稿文章
		if detail.Status == "draft" {
			return model.ArticlesPreview{}, ErrNotPublished
		}

		// 直接把分隔符变为空字符串
		detail.Content = strings.ReplaceAll(detail.Content, cons.SplitFlag, "")
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

// 更新文章内容，并返回更新后的文章详情
func (s *ArticlesService) UpdateArticle(c context.Context, article_id, content, status string) (model.ArticlesDetail, error) {
	// 重复分隔符只保留最后一个，和编辑器保持一致。
	if last := strings.LastIndex(content, cons.SplitFlag); last >= 0 {
		content = strings.ReplaceAll(content[:last], cons.SplitFlag, "") + content[last:]
	}
	// 先根据 preview 分割符分割出两部分
	res := strings.Split(content, cons.SplitFlag)

	// 构造要更新的内容的结构体
	options := repository.ArticleUpdate{
		Status:  &status,
		Preview: &res[0],
		Content: &content, // 这里直接存带有分隔符的内容，返回的时候再根据角色决定是否切割
	}

	err := s.artiRepo.UpdateArticle(c, article_id, options)
	if err != nil {
		return model.ArticlesDetail{}, err
	}

	// 这里需要返回带有 ---<cutting>--- 的全文
	article, err := s.artiRepo.FindArticleContentByID(c, article_id)
	if err != nil {
		return model.ArticlesDetail{}, err
	}

	return article, nil
}

// 重命名文章标题，返回实际保存的标题
func (s *ArticlesService) RenameArticle(c context.Context, article_id, title string) (dto.RenameArticleResp, error) {
	// 标识和名称都属于业务参数，放在业务层统一校验。
	articleID := strings.TrimSpace(article_id)
	if articleID == "" {
		return dto.RenameArticleResp{}, ErrInvalidResourceID
	}
	name, err := normalizeResourceName(title)
	if err != nil {
		return dto.RenameArticleResp{}, err
	}

	// 先查到文章所属目录，才能按同级文件做重名检查。
	brief, err := s.artiRepo.FindArticleBriefByID(c, articleID)
	if err != nil {
		if errors.Is(err, repository.ErrArticleNotFound) {
			return dto.RenameArticleResp{}, fmt.Errorf("%w: %s", ErrArticleNotFound, articleID)
		}
		return dto.RenameArticleResp{}, err
	}

	articles, err := s.artiRepo.FindArticlesByFolderID(c, brief.FolderID, false)
	if err != nil {
		return dto.RenameArticleResp{}, err
	}
	// 重名检查要排除文章自己，否则改回原名也会被追加编号。
	names := make([]string, 0, len(articles))
	for _, article := range articles {
		if article.ID != articleID {
			names = append(names, article.Title)
		}
	}
	name = utils.UniqueName(name, names)

	if err := s.artiRepo.RenameArticle(c, articleID, name); err != nil {
		// 查询到更新之间文章可能被删除，这里同样按资源不存在处理。
		if errors.Is(err, repository.ErrArticleNotFound) {
			return dto.RenameArticleResp{}, fmt.Errorf("%w: %s", ErrArticleNotFound, articleID)
		}
		return dto.RenameArticleResp{}, err
	}

	return dto.RenameArticleResp{ID: articleID, Title: name}, nil
}

// DeleteArticle 根据 id 删除文章
func (s *ArticlesService) DeleteArticle(c context.Context, id string) error {
	// 与重命名保持一致，先对传入 id 做基础校验
	id = strings.TrimSpace(id)
	if id == "" {
		return ErrInvalidResourceID
	}

	err := s.artiRepo.DeleteArticle(c, id)
	if errors.Is(err, repository.ErrArticleNotFound) {
		return ErrArticleNotFound
	}
	return err
}
