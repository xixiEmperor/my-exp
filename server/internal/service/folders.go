package service

import (
	"context"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/dto"
	"zhiye/server/internal/model"
	"zhiye/server/internal/repository"
	"zhiye/server/internal/utils"

	gonanoid "github.com/matoous/go-nanoid/v2"
)

// FoldersService 只依赖文件夹仓库，不调用文章模块。
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
