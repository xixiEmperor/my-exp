package service

import (
	"context"
	"errors"
	"strings"

	"zhiye/server/internal/repository"
)

var (
	// ErrSortConflict 表示提交的目录子节点集合与服务端当前状态不一致。
	ErrSortConflict = errors.New("目录内容已变化，已为你刷新最新列表")
	// ErrDuplicateSortID 表示同组排序列表中包含重复节点 ID。
	ErrDuplicateSortID = errors.New("排序列表中存在重复节点")
)

// sortError 统一将排序仓库错误转换为业务错误，未知错误保留原始错误链向上返回。
func sortError(err error) error {
	switch {
	case errors.Is(err, repository.ErrFolderNotFound):
		return ErrFolderNotFound
	case errors.Is(err, repository.ErrSortConflict):
		return ErrSortConflict
	default:
		return err
	}
}

// normalizeSortIDs 清洗并校验一组排序 ID：
// 1. 去掉首尾空白，拒绝空 ID；
// 2. 文件夹组不允许出现虚拟根目录标识 root（forbidRoot = true）；
// 3. 拒绝同组内重复 ID，保证后续仓库层的集合比对和 CASE WHEN 映射是一一对应的。
func normalizeSortIDs(ids []string, forbidRoot bool) ([]string, error) {
	// 用于装最终去重后的 id
	cleaned := make([]string, 0, len(ids))

	// 用于记录已遍历的 id，基于此去重
	seen := make(map[string]struct{}, len(ids))

	for _, raw := range ids {
		id := strings.TrimSpace(raw)
		if id == "" || (forbidRoot && id == "root") {
			return nil, ErrInvalidResourceID
		}
		if _, dup := seen[id]; dup {
			return nil, ErrDuplicateSortID
		}
		seen[id] = struct{}{}
		cleaned = append(cleaned, id)
	}
	return cleaned, nil
}

// SortChildren 校验参数后更新单个父目录下文件夹与文章的组内排序。
func (s *FoldersService) SortChildren(
	c context.Context,
	parentID string,
	folderIDs []string,
	articleIDs []string,
) error {
	// 将前端的 root 虚拟目录转换成 nil，其余值视为真实父文件夹 ID。
	target, err := normalizeDirectoryID(strings.TrimSpace(parentID))
	if err != nil {
		return err
	}

	// 分别校验文件夹组和文章组，两组在数据库里各自独立编号。
	cleanFolders, err := normalizeSortIDs(folderIDs, true)
	if err != nil {
		return err
	}
	cleanArticles, err := normalizeSortIDs(articleIDs, false)
	if err != nil {
		return err
	}

	if err := s.folderRepo.SortChildren(c, target, cleanFolders, cleanArticles); err != nil {
		return sortError(err)
	}
	return nil
}
