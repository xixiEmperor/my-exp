package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/utils"

	gonanoid "github.com/matoous/go-nanoid/v2"
)

// FoldersService 只依赖文件夹仓库，级联删除的事务细节在仓库层完成。
type FoldersService struct {
	folderRepo *repository.FoldersRepo
}

// NewFoldersService 装配文件夹自己的业务依赖。
func NewFoldersService(folderRepo *repository.FoldersRepo) *FoldersService {
	return &FoldersService{folderRepo: folderRepo}
}

// GetChildren 查询指定父目录的子文件夹，返回独立的文件夹响应。
func (s *FoldersService) GetChildren(c context.Context, id string) (dto.GetFolderChildrenResp, error) {
	parentID, err := normalizeDirectoryID(id)
	if err != nil {
		return nil, err
	}

	folders, err := s.folderRepo.FindFoldersByParentID(c, parentID)
	if err != nil {
		return nil, err
	}

	// 初始化结果数组
	children := make(dto.GetFolderChildrenResp, 0, len(folders))
	// 构造并追加进结果数组
	for _, folder := range folders {
		children = append(children, dto.FolderResp{
			ID:       folder.ID,
			Name:     folder.Name,
			ParentID: folder.ParentID,
		})
	}
	return children, nil
}

// 创建文件夹
func (s *FoldersService) CreateFolder(c context.Context, parent_id string) (dto.FolderResp, error) {
	// 根目录使用 NULL，其他目录直接保存父文件夹的 NanoID。
	parentID, err := normalizeDirectoryID(parent_id)
	if err != nil {
		return dto.FolderResp{}, err
	}
	// 为文件夹生成与文章一致的 NanoID 主键。
	id, err := gonanoid.New()
	if err != nil {
		return dto.FolderResp{}, err
	}

	// 只检查同一父目录下的文件夹名称，复用统一的编号规则。
	folders, err := s.folderRepo.FindFoldersByParentID(c, parentID)
	if err != nil {
		return dto.FolderResp{}, err
	}

	names := make([]string, 0, len(folders))
	for _, folder := range folders {
		names = append(names, folder.Name)
	}

	name := utils.UniqueName("新建文件夹", names)
	newFolder := model.Folders{
		ID:       id,
		Name:     name,
		ParentID: parentID,
	}

	if err := s.folderRepo.CreateFolder(c, &newFolder); err != nil {
		return dto.FolderResp{}, apperr.MySQLError
	}
	// 响应使用实际保存的父目录，保持数据库和接口结果一致。
	return dto.FolderResp{
		ID:       newFolder.ID,
		Name:     newFolder.Name,
		ParentID: newFolder.ParentID,
	}, nil
}

// 重命名文件夹，返回实际保存后的文件夹信息
func (s *FoldersService) RenameFolder(c context.Context, folder_id, name string) (dto.FolderResp, error) {
	// 依旧先对文件夹 ID 和新标题做校验
	folderID := strings.TrimSpace(folder_id)
	if folderID == "" {
		return dto.FolderResp{}, ErrInvalidResourceID
	}
	newName, err := normalizeResourceName(name)
	if err != nil {
		return dto.FolderResp{}, err
	}

	// 先查出文件夹本身，重点是要拿到它所在的父目录。
	folder, err := s.folderRepo.FindFolderByID(c, folderID)
	if err != nil {
		if errors.Is(err, repository.ErrFolderNotFound) {
			return dto.FolderResp{}, fmt.Errorf("%w: %s", ErrFolderNotFound, folderID)
		}
		return dto.FolderResp{}, err
	}

	// 同级文件夹的名称参与重名检查，同样排除文件夹自己。
	siblings, err := s.folderRepo.FindFoldersByParentID(c, folder.ParentID)
	if err != nil {
		return dto.FolderResp{}, err
	}
	names := make([]string, 0, len(siblings))
	for _, sibling := range siblings {
		if sibling.ID != folderID {
			names = append(names, sibling.Name)
		}
	}
	newName = utils.UniqueName(newName, names)

	if err := s.folderRepo.RenameFolder(c, folderID, newName); err != nil {
		// 查询和更新之间文件夹被删除时，按资源不存在处理。
		if errors.Is(err, repository.ErrFolderNotFound) {
			return dto.FolderResp{}, fmt.Errorf("%w: %s", ErrFolderNotFound, folderID)
		}
		return dto.FolderResp{}, err
	}

	return dto.FolderResp{
		ID:       folderID,
		Name:     newName,
		ParentID: folder.ParentID,
	}, nil
}

// DeleteFolder 删除文件夹及其全部子项，级联和事务由仓库层的 DeleteCascade 完成。
func (s *FoldersService) DeleteFolder(c context.Context, folderID string) error {
	// 与重命名保持一致，先对传入 id 做基础校验
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		return ErrInvalidResourceID
	}

	if err := s.folderRepo.DeleteCascade(c, folderID); err != nil {
		if errors.Is(err, repository.ErrFolderNotFound) {
			return fmt.Errorf("%w: %s", ErrFolderNotFound, folderID)
		}
		return err
	}
	return nil
}
