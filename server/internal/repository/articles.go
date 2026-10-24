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
func (repo *ArticlesRepo) FindFoldersByID(c context.Context, public_id string) ([]model.FolderBrief, error) {
	var folders []model.FolderBrief

	// 如果前端传了 root 作为 id，则查找所有 parent_id 为 NULL 的文件夹
	if public_id == "root" {
		err := repo.db.Model(model.Folders{}).
			Select("public_id", "name", "parent_id").
			Where("parent_id IS NULL").
			Find(&folders).Error
		if err != nil {
			return nil, apperr.MySQLError
		}

		return folders, nil
	}

	// 查找之前需要先将传入的public_id转换为外键id，这里用一条简单查询，不用JOIN
	var parent_id uint64
	err := repo.db.Model(model.Folders{}).
		Select("id").
		Where("public_id = ?", public_id).
		Find(&parent_id).Error
	if err != nil {
		return nil, err
	}

	// 否则查找对应 parent_id 的文件夹
	err = repo.db.Model(model.Folders{}).
		Select("public_id", "name", "parent_id").
		Where("parent_id = ?", parent_id).
		Find(&folders).Error
	if err != nil {
		return nil, apperr.MySQLError
	}

	return folders, nil
}

func (repo *ArticlesRepo) FindArticlesByID(c context.Context, public_id string, without_draft bool) ([]model.ArticlesBrief, error) {
	var articles []model.ArticlesBrief

	query := repo.db.WithContext(c).
		Model(&model.Articles{}).
		Select("public_id", "title", "folder_id")

	if public_id == "root" {
		// root：查找 folder_id 为 NULL 的文章
		query = query.Where("folder_id IS NULL")
	} else {
		// 先把 public_id 转成外键 id
		var folder_id uint64
		err := repo.db.WithContext(c).
			Model(&model.Folders{}).
			Select("id").
			Where("public_id = ?", public_id).
			Take(&folder_id).Error
		if err != nil {
			return nil, apperr.MySQLError
		}

		query = query.Where("folder_id = ?", folder_id)
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
func (repo *ArticlesRepo) FindArticleContentByID(c context.Context, public_id string) (model.ArticlesDetail, error) {
	var aricle model.ArticlesDetail

	err := repo.db.Model(model.Articles{}).Where("public_id = ?", public_id).Take(&aricle).Error
	if err != nil {
		return model.ArticlesDetail{}, err
	}

	return aricle, nil
}

// 根据 id 查找文章预览内容
func (repo *ArticlesRepo) FindArticlePreviewByID(c context.Context, public_id string) (model.ArticlesPreview, error) {
	var aricle model.ArticlesPreview

	err := repo.db.Model(model.Articles{}).Where("public_id = ?", public_id).Take(&aricle).Error
	if err != nil {
		return model.ArticlesPreview{}, err
	}

	return aricle, nil
}
