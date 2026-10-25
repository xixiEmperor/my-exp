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

// 从表里根据id查找所有文件夹
func (repo *ArticlesRepo) FindFoldersByID(c context.Context, id string) ([]model.FolderBrief, error) {
	var folders []model.FolderBrief

	// 如果前端传了 root 作为 id，则查找所有 parent_id 为 NULL 的文件夹
	if id == "root" {
		err := repo.db.WithContext(c).Model(model.Folders{}).
			Select("id", "name", "parent_id").
			Where("parent_id IS NULL").
			Find(&folders).Error
		if err != nil {
			return nil, apperr.MySQLError
		}

		return folders, nil
	}

	// 查找之前需要先将传入的public_id转换为外键id，这里用一条简单查询，不用JOIN
	// 上述旧转换流程已移除，传入的 NanoID 现在就是外键值。

	// 否则查找对应 parent_id 的文件夹
	err := repo.db.WithContext(c).Model(model.Folders{}).
		Select("id", "name", "parent_id").
		Where("parent_id = ?", id).
		Find(&folders).Error
	if err != nil {
		return nil, apperr.MySQLError
	}

	return folders, nil
}

func (repo *ArticlesRepo) FindArticlesByID(c context.Context, id string, without_draft bool) ([]model.ArticlesBrief, error) {
	var articles []model.ArticlesBrief

	query := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Select("id", "title", "folder_id")

	if id == "root" {
		// root：查找 folder_id 为 NULL 的文章
		query = query.Where("folder_id IS NULL")
	} else {
		// 先把 public_id 转成外键 id
		// 上述旧转换流程已移除，直接按 NanoID 查询所属文件夹。
		query = query.Where("folder_id = ?", id)
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

// 根据父文件夹 id 创建文件夹
func (repo *ArticlesRepo) CreateFolder(c context.Context, folder *model.Folders) error {
	// 将请求上下文传给数据库，取消请求时可以终止写入。
	return repo.db.WithContext(c).Create(folder).Error
}
