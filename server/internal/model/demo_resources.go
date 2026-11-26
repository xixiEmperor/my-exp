package model

import "time"

// DemoResources 对应 demos 表，保存 demo 展示信息与已上传的源码/构建版本。
// verison 保留数据库中的指定拼写。
type DemoResources struct {
	ID             string    `gorm:"column:id;primaryKey;autoIncrement:false" json:"id"`             // NanoID 主键
	Slug           string    `gorm:"column:slug"                              json:"slug"`           // 稳定资源目录标识
	Name           string    `gorm:"column:name"                              json:"name"`           // 展示名称，默认与目录名一致
	Description    *string   `gorm:"column:description"                       json:"description"`    // demo 说明
	Tags           []string  `gorm:"column:tags;serializer:json"              json:"tags"`           // 检索标签
	Status         string    `gorm:"column:status"                            json:"status"`         // 状态：draft 或 published
	Implementation string    `gorm:"column:implementation"                    json:"implementation"` // 实现目录，default 表示场景根
	Verison        string    `gorm:"column:verison"                           json:"verison"`        // x.x.x 格式的版本
	FilePaths      []string  `gorm:"column:file_paths;serializer:json"        json:"file_paths"`     // 以 demos/slug 为根的源码相对路径数组
	ExcludePaths   []string  `gorm:"column:exclude_paths;serializer:json"     json:"exclude_paths"`  // 相对于所选实现目录的排除规则，nil 表示未设置
	CreatedAt      time.Time `gorm:"column:created_at"                        json:"created_at"`     // 创建时间
}

// TableName 指定 DemoResources 对应的数据库表名。
func (DemoResources) TableName() string {
	return "demos"
}
