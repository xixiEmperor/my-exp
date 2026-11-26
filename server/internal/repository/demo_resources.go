package repository

import (
	"context"
	"errors"

	"zhiye/server/internal/model"

	"gorm.io/gorm"
)

// DemoResourcesRepo 管理 demos 表的增删改查操作。
type DemoResourcesRepo struct {
	db *gorm.DB
}

// NewDemoResourcesRepo 创建 demo 仓库实例。
func NewDemoResourcesRepo(db *gorm.DB) *DemoResourcesRepo {
	return &DemoResourcesRepo{db: db}
}

// CreateDemoResource 新增一条 demo 记录。
func (repo *DemoResourcesRepo) CreateDemoResource(c context.Context, resource *model.DemoResources) error {
	if err := repo.db.WithContext(c).Create(resource).Error; err != nil {
		return wrapMySQLError("创建demo资源", err)
	}
	return nil
}

// FindDemoResourceByID 根据主键 id 查询单条 demo 记录。
func (repo *DemoResourcesRepo) FindDemoResourceByID(c context.Context, id string) (model.DemoResources, error) {
	var resource model.DemoResources
	err := repo.db.WithContext(c).Where("id = ?", id).Take(&resource).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return model.DemoResources{}, ErrDemoResourceNotFound
	}
	if err != nil {
		return model.DemoResources{}, wrapMySQLError("查询demo资源", err)
	}
	return resource, nil
}

// FindDemoResourceBySlugAndVerison 根据 slug 和 verison 查询唯一版本记录。
func (repo *DemoResourcesRepo) FindDemoResourceBySlugAndVerison(
	c context.Context,
	slug, verison string,
) (model.DemoResources, error) {
	var resource model.DemoResources
	err := repo.db.WithContext(c).Where("slug = ? AND verison = ?", slug, verison).Take(&resource).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return model.DemoResources{}, ErrDemoResourceNotFound
	}
	if err != nil {
		return model.DemoResources{}, wrapMySQLError("按版本查询demo资源", err)
	}
	return resource, nil
}

// FindAllDemoResources 查询 demos 表中全部记录，按创建时间倒序排列。
func (repo *DemoResourcesRepo) FindAllDemoResources(c context.Context) ([]model.DemoResources, error) {
	resources := make([]model.DemoResources, 0)
	err := repo.db.WithContext(c).
		Order("created_at DESC").
		Find(&resources).Error
	if err != nil {
		return nil, wrapMySQLError("查询全部demo资源列表", err)
	}
	return resources, nil
}

// UpdateDemoResourceInfo 更新 demo 的展示信息（name、description、tags、status）。
func (repo *DemoResourcesRepo) UpdateDemoResourceInfo(
	c context.Context,
	id string,
	name string,
	description *string,
	tags []string,
	status string,
) (model.DemoResources, error) {
	result := repo.db.WithContext(c).
		Model(&model.DemoResources{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"name":        name,
			"description": description,
			"tags":        tags,
			"status":      status,
		})
	if result.Error != nil {
		return model.DemoResources{}, wrapMySQLError("更新demo信息", result.Error)
	}
	return repo.FindDemoResourceByID(c, id)
}

// DeleteDemoResourceByID 根据主键 id 删除单条 demo 记录。
func (repo *DemoResourcesRepo) DeleteDemoResourceByID(c context.Context, id string) error {
	result := repo.db.WithContext(c).Where("id = ?", id).Delete(&model.DemoResources{})
	if result.Error != nil {
		return wrapMySQLError("删除demo资源", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrDemoResourceNotFound
	}
	return nil
}
