package model

import (
	"time"

	"gorm.io/gorm"
)

// Articles 对应 articles 文章表。
type Articles struct {
	ID             uint64         `gorm:"column:id;primaryKey"`                   // 文章主键
	Title          string         `gorm:"column:title"`                           // 标题
	Content        string         `gorm:"column:content"`                         // 正文
	Preview        *string        `gorm:"column:preview"`                         // 游客可读的预览部分，nil 表示未设置
	Status         string         `gorm:"column:status"`                          // 文章状态：draft 为草稿，published 为已发布
	FolderID       *uint64        `gorm:"column:folder_id"`                       // 所属文件夹 id，nil 表示根目录
	Slug           *string        `gorm:"column:slug"`                            // 友好 URL，nil 表示未设置
	CreatedAt      time.Time      `gorm:"column:created_at"`                      // 创建时间
	PublishedAt    *time.Time     `gorm:"column:published_at"`                    // 发布时间，nil 表示尚未发布
	LastModifiedAt time.Time      `gorm:"column:last_modified_at;autoUpdateTime"` // 最后修改时间，GORM 更新时自动维护
	DeletedAt      gorm.DeletedAt `gorm:"column:deleted_at"`                      // 软删除标记，NULL 表示未删除，GORM 默认查询排除已删除文章
}
