package model

import (
	"time"

	"gorm.io/gorm"
)

// Articles 对应 articles 文章表。
type Articles struct {
	ID      uint64  `gorm:"column:id;primaryKey"` // 文章主键
	Content string  `gorm:"column:content"`       // 正文
	Preview *string `gorm:"column:preview"`       // 游客可读的预览部分，nil 表示未设置
	ArticlesBasis
}

type ArticlesBrief struct {
	PublicID string  `gorm:"column:public_id"`
	Title    string  `gorm:"column:title"`     // 标题
	FolderID *uint64 `gorm:"column:folder_id"` // 所属文件夹 id，nil 表示根目录
}

type ArticlesBasis struct {
	PublicID       string         `gorm:"column:public_id"`                       // 文章真正的ID（nanoid）
	Title          string         `gorm:"column:title"`                           // 标题
	Status         string         `gorm:"column:status"`                          // 文章状态：draft 为草稿，published 为已发布
	FolderID       *uint64        `gorm:"column:folder_id"`                       // 所属文件夹 id，nil 表示根目录
	Views          uint64         `gorm:"column:views"`                           // 文章浏览量
	Slug           *string        `gorm:"column:slug"`                            // 友好 URL，nil 表示未设置
	CreatedAt      time.Time      `gorm:"column:created_at"`                      // 创建时间
	PublishedAt    *time.Time     `gorm:"column:published_at"`                    // 发布时间，nil 表示尚未发布
	LastModifiedAt time.Time      `gorm:"column:last_modified_at;autoUpdateTime"` // 最后修改时间，GORM 更新时自动维护
	DeletedAt      gorm.DeletedAt `gorm:"column:deleted_at"`                      // 软删除标记，NULL 表示未删除，GORM 默认查询排除已删除文章
}

type ArticlesDetail struct {
	ArticlesBasis
	Content string `gorm:"column:content"` // 正文
}

type ArticlesPreview struct {
	ArticlesBasis
	Preview *string `gorm:"column:preview"` // 游客可读的预览部分，nil 表示未设置
}

// 这一段叫做密封接口，本质上是在实现 TS 中的联合类型
// isArticleContent() 只是个桥梁，通过这个方法把 ArticleContent 和我要的类型结合起来，他自己什么都不需要做
// 按照接口实现的定义，只要我在 ArticlesPreview 和 ArticlesDetail 两个结构体上实现了桥梁方法，就算是实现了这个接口。
// 那么我们在返回的时候，由于 ArticlesPreview 和 ArticlesDetail 两个结构体都挂载了 isArticleContent，满足ArticleContent，那返回哪个就都不会触发类型检查报错
type ArticleContent interface {
	isArticleContent()
}

func (ArticlesPreview) isArticleContent() {}
func (ArticlesDetail) isArticleContent()  {}
