package repository

import (
	"context"
	"errors"
	"fmt"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/model"

	"gorm.io/gorm"
)

// FoldersRepo 只管理现有 folders 表，共用程序入口提供的数据库连接。
type FoldersRepo struct {
	db *gorm.DB
}

// NewFoldersRepo 在现有 repository 目录内建立文件夹仓库实例。
func NewFoldersRepo(db *gorm.DB) *FoldersRepo {
	return &FoldersRepo{db: db}
}

// 从表里根据id查找所有文件夹
func (repo *FoldersRepo) FindFoldersByParentID(c context.Context, id *string) ([]model.FolderBrief, error) {
	// 初始化空切片，让空目录仍然得到数组结果。
	folders := make([]model.FolderBrief, 0)
	query := repo.db.WithContext(c).Model(model.Folders{}).Select("id", "name", "parent_id")

	// 如果前端传了 root 作为 id，则查找所有 parent_id 为 NULL 的文件夹
	if id == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		// 查找之前需要先将传入的public_id转换为外键id，这里用一条简单查询，不用JOIN
		// 上述旧转换流程已移除，传入的 NanoID 现在就是外键值。
		// 否则查找对应 parent_id 的文件夹
		query = query.Where("parent_id = ?", *id)
	}
	if err := query.Find(&folders).Error; err != nil {
		return nil, apperr.MySQLError
	}
	return folders, nil
}

// 根据父文件夹 id 创建文件夹
func (repo *FoldersRepo) CreateFolder(c context.Context, folder *model.Folders) error {
	// 将请求上下文传给数据库，取消请求时可以终止写入。
	return repo.db.WithContext(c).Create(folder).Error
}

// 根据 id 查找单个文件夹，重命名时需要它的父目录来判断同级重名
func (repo *FoldersRepo) FindFolderByID(c context.Context, id string) (model.Folders, error) {
	var folder model.Folders

	err := repo.db.WithContext(c).Where("id = ?", id).Take(&folder).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return model.Folders{}, ErrFolderNotFound
	}
	if err != nil {
		return model.Folders{}, fmt.Errorf("查询文件夹: %w", err)
	}

	return folder, nil
}

// 重命名文件夹名称
func (repo *FoldersRepo) RenameFolder(c context.Context, id string, name string) error {
	result := repo.db.WithContext(c).
		Model(&model.Folders{}).
		Where("id = ?", id).
		Update("name", name)

	if result.Error != nil {
		return fmt.Errorf("重命名文件夹: %w", result.Error)
	}
	// 名称没有变化时 MySQL 返回 0 行，这里再确认文件夹是否仍然存在。
	if result.RowsAffected == 0 {
		var count int64
		if err := repo.db.WithContext(c).
			Model(&model.Folders{}).
			Where("id = ?", id).
			Count(&count).Error; err != nil {
			return fmt.Errorf("确认文件夹是否存在: %w", err)
		}
		if count == 0 {
			return ErrFolderNotFound
		}
	}
	return nil
}
