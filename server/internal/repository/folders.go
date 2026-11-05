package repository

import (
	"context"
	"errors"
	"fmt"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/model"

	"gorm.io/gorm"
)

// FoldersRepo 管理现有 folders 表，共用程序入口提供的数据库连接。
// 级联删除接口因事务需要同时操作 articles 表。
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

// DeleteCascade 级联删除指定文件夹及其全部子文件夹和文章，整体在同一个事务内完成。
// 文章表的删除写在本仓库方法里，是为了把事务细节收在 repository 层，service 只需发起一次调用。
func (repo *FoldersRepo) DeleteCascade(c context.Context, id string) error {
	return repo.db.WithContext(c).Transaction(func(tx *gorm.DB) error {
		// 事务内先确认目标文件夹存在，不存在的删除请求按 ErrFolderNotFound 返回
		var folder model.Folders
		err := tx.Select("id").Where("id = ?", id).Take(&folder).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrFolderNotFound
		}
		if err != nil {
			return fmt.Errorf("查询文件夹: %w", err)
		}

		// 一次性取出全部文件夹的 id 和 parent_id，在内存中收集子孙节点。
		// 避免逐层查询，数据出现循环引用时也不会陷入无限递归。
		var all []model.FolderBrief
		if err := tx.Model(model.Folders{}).Select("id", "parent_id").Find(&all).Error; err != nil {
			return fmt.Errorf("查询文件夹树: %w", err)
		}
		children := make(map[string][]string, len(all))
		for _, f := range all {
			// 只有有父节点的时候，才记录父节点对应的子节点id数组
			// 换句话说，如果没有父节点就不管，因为根目录是没办法删除的，无需将根目录下的文件夹作为子节点看待
			if f.ParentID != nil {
				children[*f.ParentID] = append(children[*f.ParentID], f.ID)
			}
		}

		// 从目标文件夹开始沿 parent 关系向下收集，包含它自己
		ids := []string{id}
		for i := 0; i < len(ids); i++ {
			ids = append(ids, children[ids[i]]...)
		}

		// 先删文章再删文件夹，同一个事务内顺序不影响原子性
		// Articles 带 gorm.DeletedAt，默认 Delete 只会软删除（UPDATE deleted_at），
		// 行还留在表里会触发外键 fk_articles_folder 的 RESTRICT 限制导致 1451 报错，
		// 所以这里用 Unscoped 物理删除，让后续删除文件夹能通过外键校验
		if err := tx.Unscoped().Where("folder_id IN ?", ids).Delete(&model.Articles{}).Error; err != nil {
			return fmt.Errorf("级联删除文章: %w", err)
		}
		if err := tx.Where("id IN ?", ids).Delete(&model.Folders{}).Error; err != nil {
			return fmt.Errorf("级联删除文件夹: %w", err)
		}
		return nil
	})
}
