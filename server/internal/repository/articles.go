package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/model"

	"gorm.io/gorm"
)

type ArticleUpdate struct {
	Content     *string
	Preview     *string
	Status      *string
	Slug        *string
	PublishedAt *time.Time
}

type ArticlesRepo struct {
	db *gorm.DB
}

// 创建实例
func NewArticlesRepo(db *gorm.DB) *ArticlesRepo {
	return &ArticlesRepo{
		db: db,
	}
}

// 基于文件夹id查找附属文章列表
func (repo *ArticlesRepo) FindArticlesByFolderID(c context.Context, id *string, without_draft bool) ([]model.ArticlesBrief, error) {
	// 空列表保留数组类型，调用方不需要处理 null。
	articles := make([]model.ArticlesBrief, 0)

	query := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Select("id", "title", "folder_id")

	if id == nil {
		// root：查找 folder_id 为 NULL 的文章
		query = query.Where("folder_id IS NULL")
	} else {
		// 先把 public_id 转成外键 id
		// 上述旧转换流程已移除，直接按 NanoID 查询所属文件夹。
		query = query.Where("folder_id = ?", *id)
	}

	// 不需要草稿时，只查已发布的
	if without_draft {
		query = query.Where("status = ?", "published")
	}

	err := query.Find(&articles).Error
	if err != nil {
		return nil, apperr.MySQLError
	}

	return articles, nil
}

// 根据 id 查找文章所有内容
func (repo *ArticlesRepo) FindArticleContentByID(c context.Context, id string) (model.ArticlesDetail, error) {
	var aricle model.ArticlesDetail

	// 直接查询字符串主键，并让请求取消能够终止数据库操作。
	err := repo.db.WithContext(c).Model(model.Articles{}).Where("id = ?", id).Take(&aricle).Error
	if err != nil {
		return model.ArticlesDetail{}, err
	}

	return aricle, nil
}

// 根据 id 查找文章预览内容
func (repo *ArticlesRepo) FindArticlePreviewByID(c context.Context, id string) (model.ArticlesPreview, error) {
	var aricle model.ArticlesPreview

	// 预览与正文共用同一个 NanoID 主键。
	err := repo.db.WithContext(c).Model(model.Articles{}).Where("id = ?", id).Take(&aricle).Error
	if err != nil {
		return model.ArticlesPreview{}, err
	}

	return aricle, nil
}

// 根据 id 查找文章简要信息，只取重命名需要的字段，不读取正文
func (repo *ArticlesRepo) FindArticleBriefByID(c context.Context, id string) (model.ArticlesBrief, error) {
	var article model.ArticlesBrief

	// 复用软删除条件，已删除的文章按不存在处理。
	err := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Select("id", "title", "folder_id").
		Where("id = ?", id).
		Take(&article).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return model.ArticlesBrief{}, ErrArticleNotFound
	}
	if err != nil {
		// 保留底层错误链，交给上层映射为服务端错误。
		return model.ArticlesBrief{}, fmt.Errorf("查询文章简要信息: %w", err)
	}

	return article, nil
}

// 根据名称查找文章
func (repo *ArticlesRepo) FindArticlesByName(c context.Context, name string) ([]string, error) {
	var names []string

	err := repo.db.WithContext(c).Model(model.Articles{}).Select("title").Where("title LIKE %?%", name).Find(&names).Error
	if err != nil {
		return nil, err
	}

	return names, nil
}

// 根据父文件夹 id 创建文章
func (repo *ArticlesRepo) CreateArticle(c context.Context, article *model.Articles) error {
	return repo.db.WithContext(c).Create(article).Error
}

// 部分更新文章内容
func (repo *ArticlesRepo) UpdateArticle(c context.Context, article_id string, options ArticleUpdate) error {
	fields := map[string]any{}

	if options.Content != nil {
		fields["content"] = *options.Content
	}
	if options.Preview != nil {
		fields["preview"] = *options.Preview
	}
	if options.Status != nil {
		fields["status"] = *options.Status
	}
	if options.Slug != nil {
		fields["slug"] = *options.Slug
	}
	if options.PublishedAt != nil {
		fields["published_at"] = *options.PublishedAt
	}

	if len(fields) == 0 {
		return nil
	}

	result := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Where("id = ?", article_id).
		Updates(fields)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrArticleNotFound
	}
	return nil
}

// 重命名文章标题
func (repo *ArticlesRepo) RenameArticle(c context.Context, article_id string, title string) error {
	result := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Where("id = ?", article_id).
		Update("title", title)

	if result.Error != nil {
		return fmt.Errorf("重命名文章: %w", result.Error)
	}
	// MySQL 在新标题和旧标题相同时返回 0 行，需要再确认记录是否真的存在。
	if result.RowsAffected == 0 {
		var count int64
		if err := repo.db.WithContext(c).
			Model(&model.Articles{}).
			Where("id = ?", article_id).
			Count(&count).Error; err != nil {
			return fmt.Errorf("确认文章是否存在: %w", err)
		}
		if count == 0 {
			return ErrArticleNotFound
		}
	}
	return nil
}

// DeleteArticle 根据 id 删除文章
func (repo *ArticlesRepo) DeleteArticle(c context.Context, id string) error {
	result := repo.db.WithContext(c).Delete(&model.Articles{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrArticleNotFound
	}
	return nil
}
