package repository

import (
	"context"
	"errors"
	"strings"

	"zhiye/server/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrSortConflict 表示提交的子节点集合与数据库当前目录内容不一致。
var ErrSortConflict = errors.New("目录内容已变化，请刷新后重试")

// sameIDSet 比较数据库当前节点集合与前端提交的节点集合是否完全一致（忽略顺序）。
// 只要期间有人新建、删除或移入/移出节点，长度或成员就会不匹配，避免前端用旧列表覆盖新目录。
func sameIDSet(actual, submitted []string) bool {
	if len(actual) != len(submitted) {
		return false
	}

	// 先把数据库里的真实 ID 放进集合，便于 O(1) 校验提交项。
	seen := make(map[string]struct{}, len(actual))
	for _, id := range actual {
		seen[id] = struct{}{}
	}

	// service 层已排除 submitted 内部的重复 ID，这里只要每个提交项都能命中即说明集合一致。
	for _, id := range submitted {
		if _, ok := seen[id]; !ok {
			return false
		}
	}
	return true
}

// buildSortCaseExpr 构造单条 SQL 批量更新用的 `CASE id WHEN ? THEN ? ... END` 表达式。
// 按切片下标 0..n-1 分配 sort_order，避免在循环里逐条发 UPDATE 造成多次数据库往返。
func buildSortCaseExpr(ids []string) (string, []any) {
	var b strings.Builder
	args := make([]any, 0, len(ids)*2)

	b.WriteString("CASE id")
	for idx, id := range ids {
		b.WriteString(" WHEN ? THEN ?")
		args = append(args, id, idx)
	}
	b.WriteString(" END")

	return b.String(), args
}

// SortChildren 在同一事务内核对指定父目录下的子文件夹与文章集合，并按提交顺序批量更新 sort_order。
func (repo *FoldersRepo) SortChildren(
	c context.Context,
	parentID *string,
	folderIDs []string,
	articleIDs []string,
) error {
	return repo.db.WithContext(c).Transaction(func(tx *gorm.DB) error {
		// 1. 复用移动目录的加锁顺序（先按 id 锁住 folders），避免排序与并发移动互相等待导致死锁。
		folders, err := lockMoveFolders(tx)
		if err != nil {
			return wrapMySQLError("查询排序目录", err)
		}

		// 2. 非根目录（parentID != nil）必须真实存在，防止对已删除的目录写入排序。
		if parentID != nil {
			found := false
			for _, f := range folders {
				if f.ID == *parentID {
					found = true
					break
				}
			}
			if !found {
				return ErrFolderNotFound
			}
		}

		// 3. 过滤出该父目录下当前的全部子文件夹，与提交的 folderIDs 做集合核对。
		currentFolderIDs := make([]string, 0)
		for _, f := range folders {
			if sameMoveDirectory(f.ParentID, parentID) {
				currentFolderIDs = append(currentFolderIDs, f.ID)
			}
		}
		if !sameIDSet(currentFolderIDs, folderIDs) {
			return ErrSortConflict
		}

		// 4. 锁住该目录下所有未软删除的文章（GORM 自动附带 deleted_at IS NULL），
		// 按 id 排序加锁保持固定锁序，随后核对文章集合是否完整。
		var currentArticleIDs []string
		articleQuery := tx.Model(&model.Articles{}).
			Order("id").
			Clauses(clause.Locking{Strength: "UPDATE"})
		if parentID == nil {
			articleQuery = articleQuery.Where("folder_id IS NULL")
		} else {
			articleQuery = articleQuery.Where("folder_id = ?", *parentID)
		}
		if err := articleQuery.Pluck("id", &currentArticleIDs).Error; err != nil {
			return wrapMySQLError("查询排序文章", err)
		}
		if !sameIDSet(currentArticleIDs, articleIDs) {
			return ErrSortConflict
		}

		// 5. 批量更新子文件夹的 sort_order；该组为空时直接跳过，避免生成空的 IN () 子句。
		if len(folderIDs) > 0 {
			exprSQL, exprArgs := buildSortCaseExpr(folderIDs)
			if err := tx.Model(&model.Folders{}).
				Where("id IN ?", folderIDs).
				UpdateColumn("sort_order", gorm.Expr(exprSQL, exprArgs...)).
				Error; err != nil {
				return wrapMySQLError("更新文件夹排序", err)
			}
		}

		// 6. 批量更新文章的 sort_order；使用 UpdateColumn 避免 GORM 额外改写其他业务字段。
		if len(articleIDs) > 0 {
			exprSQL, exprArgs := buildSortCaseExpr(articleIDs)
			if err := tx.Model(&model.Articles{}).
				Where("id IN ?", articleIDs).
				UpdateColumn("sort_order", gorm.Expr(exprSQL, exprArgs...)).
				Error; err != nil {
				return wrapMySQLError("更新文章排序", err)
			}
		}

		return nil
	})
}
