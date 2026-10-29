package repository

import (
	"context"

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
