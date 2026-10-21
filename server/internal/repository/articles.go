package repository

import (
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
func (repo *ArticlesRepo) FindFoldersByID(public_id string) ([]model.FolderBrief, error) {
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

// 根据 id 查找所有文章
func (repo *ArticlesRepo) FindArticlesByID(public_id string) ([]model.ArticlesBrief, error) {
	var aricles []model.ArticlesBrief

	// 如果前端传了 root 作为 id，则查找所有 parent_id 为 NULL 的文件夹
	if public_id == "root" {
		err := repo.db.Model(model.Articles{}).
			Select("public_id", "title", "folder_id").
			Where("folder_id IS NULL").
			Find(&aricles).Error

		if err != nil {
			return nil, apperr.MySQLError
		}

		return aricles, nil
	}

	// 查找之前需要先将传入的public_id转换为外键id，这里用一条简单查询，不用JOIN
	var folder_id uint64
	err := repo.db.Model(model.Folders{}).
		Select("id").
		Where("public_id = ?", public_id).
		Find(&folder_id).Error
	if err != nil {
		return nil, err
	}

	// 否则查找对应 parent_id 的文件夹
	err = repo.db.Model(model.Articles{}).
		Select("public_id", "title", "folder_id").
		Where("folder_id = ?", folder_id).
		Find(&aricles).Error

	if err != nil {
		return nil, apperr.MySQLError
	}

	return aricles, nil
}
