package repository

import (
	"context"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/model"

	"gorm.io/gorm"
)

type ArticlesRepo struct {
	db *gorm.DB
}

func NewArticlesRepo(db *gorm.DB) *ArticlesRepo {
	return &ArticlesRepo{
		db: db,
	}
}

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
