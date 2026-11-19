package service

import (
	"context"
	"errors"
	"strings"

	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
)

// moveError 统一把移动中的仓库错误转换为业务错误。
func moveError(err error) error {
	switch {
	case errors.Is(err, repository.ErrInvalidMove):
		return ErrInvalidMove
	case errors.Is(err, repository.ErrFolderNotFound):
		return ErrFolderNotFound
	case errors.Is(err, repository.ErrArticleNotFound):
		return ErrArticleNotFound
	default:
		return err
	}
}

// ErrInvalidMove 用于返回非法目录移动的参数错误。
var ErrInvalidMove = errors.New("文件夹不能移入自身或子目录")

// MoveFolder 校验请求后返回实际保存的名称和父目录。
func (s *FoldersService) MoveFolder(c context.Context, id, parentID string) (dto.FolderResp, error) {
	id = strings.TrimSpace(id)
	if id == "" || id == "root" {
		return dto.FolderResp{}, ErrInvalidResourceID
	}

	target, err := normalizeDirectoryID(strings.TrimSpace(parentID))
	if err != nil {
		return dto.FolderResp{}, err
	}

	folder, err := s.folderRepo.MoveFolder(c, id, target)
	if err != nil {
		return dto.FolderResp{}, moveError(err)
	}

	return dto.FolderResp{
		ID:       folder.ID,
		Name:     folder.Name,
		ParentID: folder.ParentID,
	}, nil
}

// MoveArticle 返回移动后的简要信息，供前端同步文章所属目录。
func (s *ArticlesService) MoveArticle(c context.Context, id, folderID string) (model.ArticlesBrief, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return model.ArticlesBrief{}, ErrInvalidResourceID
	}

	target, err := normalizeDirectoryID(strings.TrimSpace(folderID))
	if err != nil {
		return model.ArticlesBrief{}, err
	}

	article, err := s.artiRepo.MoveArticle(c, id, target)
	return article, moveError(err)
}
