package repository

import (
	"context"
	"errors"

	"zhiye/server/internal/model"
	"zhiye/server/internal/utils"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrInvalidMove 表示移动会形成目录循环。
var ErrInvalidMove = errors.New("文件夹不能移入自身或子目录")

// lockMoveFolders 按固定顺序锁住目录树，避免并发移动形成循环。
func lockMoveFolders(tx *gorm.DB) ([]model.FolderBrief, error) {
	var folders []model.FolderBrief

	err := tx.Model(&model.Folders{}).
		Select("id", "name", "parent_id").
		Order("id").
		Clauses(clause.Locking{Strength: "UPDATE"}). // 对于其他 Update 类型的操作，都需要等待当前事务释放锁
		Find(&folders).
		Error

	return folders, err
}

// validateMoveTarget 沿目标目录向上检查，同时拒绝已有循环。
func validateMoveTarget(folders []model.FolderBrief, source string, target *string) error {
	// 初始化一个map，作为 每个文件夹id 到 他所在文件夹id 的映射
	parents := make(map[string]*string, len(folders))
	for _, folder := range folders {
		parents[folder.ID] = folder.ParentID
	}

	// 将 target 作为一个自底向上的查找指针往上找，直到变为 nil，说明没有循环引用，则结束查找
	seen := make(map[string]bool)
	for target != nil {
		// 如果源目录是目标目录的父目录 或 该目录已经被找到过了，说明产生了循环，需要返回错误
		if *target == source || seen[*target] {
			return ErrInvalidMove
		}

		// 在初始映射中找到当前指针的父节点，如果找不到且不是nil，说明出现了目标不存在 或 断链的情况
		parent, ok := parents[*target]
		if !ok {
			return ErrFolderNotFound
		}

		// 记录当前指针所指向的节点已经被找到过，并更新指针的指向
		seen[*target] = true
		target = parent
	}

	return nil
}

// sameMoveDirectory 比较数据库中的父目录，nil 表示根目录。
func sameMoveDirectory(a, b *string) bool {
	return a == nil && b == nil || a != nil && b != nil && *a == *b
}

// MoveFolder 在事务内校验目录并更新父目录，子项继续关联原文件夹。
func (repo *FoldersRepo) MoveFolder(c context.Context, id string, target *string) (model.FolderBrief, error) {
	var moved model.FolderBrief

	err := repo.db.WithContext(c).Transaction(func(tx *gorm.DB) error {
		// 1. 查询所有文件夹并上锁
		folders, err := lockMoveFolders(tx)
		if err != nil {
			return wrapMySQLError("查询移动目录", err)
		}

		// 2. 遍历文件夹，找到要移动的那个文件夹
		found := false
		for _, folder := range folders {
			if folder.ID == id {
				moved = folder
				found = true
				break
			}
		}
		// 2.1 如果找不到，就返回找不到文件夹错误
		if !found {
			return ErrFolderNotFound
		}
		// 2.2 如果找到了，但目标文件夹是当前文件夹的子文件夹，也需要报错
		if err := validateMoveTarget(folders, id, target); err != nil {
			return err
		}
		// 2.3 目标目录为当前目录直接返回，避免无效更新和再次编号。
		if sameMoveDirectory(moved.ParentID, target) {
			return nil
		}

		// 3. 收集目标目录下的所有文件夹名称
		names := make([]string, 0)
		for _, folder := range folders {
			if folder.ID != id && sameMoveDirectory(folder.ParentID, target) {
				names = append(names, folder.Name)
			}
		}

		// 4. 对于移动到目标目录的节点需要检查命名，防止目录名重复
		moved.Name = utils.UniqueName(moved.Name, names)

		// 移入目标目录时追加到该目录文件夹组末尾。
		sortOrder, err := nextFolderSortOrder(tx, target)
		if err != nil {
			return err
		}

		// 5. 更新移动目录的父文件夹id和排序号
		moved.ParentID = target
		if err := tx.Model(&model.Folders{}).
			Where("id = ?", id).
			Updates(map[string]any{
				"parent_id":  target,
				"name":       moved.Name,
				"sort_order": sortOrder,
			}).
			Error; err != nil {
			return wrapMySQLError("移动文件夹", err)
		}

		return nil
	})

	return moved, err
}

// MoveArticle 在同一事务内确认目标目录和文章，软删除文章不参与移动。
func (repo *ArticlesRepo) MoveArticle(c context.Context, id string, target *string) (model.ArticlesBrief, error) {
	var moved model.ArticlesBrief

	err := repo.db.WithContext(c).Transaction(func(tx *gorm.DB) error {
		folders, err := lockMoveFolders(tx)
		if err != nil {
			return wrapMySQLError("查询移动目录", err)
		}
		if err := validateMoveTarget(folders, "", target); err != nil {
			return err
		}

		// 找到要移动的文章并上锁
		err = tx.Model(&model.Articles{}).
			Select("id", "title", "folder_id").
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", id).
			Take(&moved).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrArticleNotFound
		}
		if err != nil {
			return wrapMySQLError("查询移动文章", err)
		}
		if sameMoveDirectory(moved.FolderID, target) {
			return nil
		}

		// 同名处理复用现有编号规则，并排除软删除文章。
		var names []string
		query := tx.Model(&model.Articles{}).Where("id <> ?", id)
		if target == nil {
			query = query.Where("folder_id IS NULL")
		} else {
			query = query.Where("folder_id = ?", *target)
		}
		if err := query.Pluck("title", &names).Error; err != nil {
			return wrapMySQLError("查询目标文章标题", err)
		}

		// 对于移动到目标目录的节点需要检查命名，防止目录名重复
		moved.Title = utils.UniqueName(moved.Title, names)

		// 移入目标目录时追加到该目录文章组末尾。
		sortOrder, err := nextArticleSortOrder(tx, target)
		if err != nil {
			return err
		}

		// 更新移动文章的父文件夹id和排序号
		moved.FolderID = target
		if err := tx.Model(&model.Articles{}).
			Where("id = ?", id).
			Updates(map[string]any{
				"folder_id":  target,
				"title":      moved.Title,
				"sort_order": sortOrder,
			}).
			Error; err != nil {
			return wrapMySQLError("移动文章", err)
		}

		return nil
	})

	return moved, err
}
