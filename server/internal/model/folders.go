package model

import "time"

// Folders 对应 folders 文件夹表。
type Folders struct {
	// 文件夹真正的ID（nanoid）
	ID        string    `gorm:"column:id;primaryKey;autoIncrement:false" json:"id"` // 文件夹主键
	Name      string    `gorm:"column:name" json:"name"`                            // 文件夹名称
	ParentID  *string   `gorm:"column:parent_id" json:"parentId"`                   // 父文件夹 id，nil 表示根目录
	SortOrder int32     `gorm:"column:sort_order" json:"sortOrder"`                 // 手动排序
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`                 // 创建时间
}

type FolderBrief struct {
	ID       string  `gorm:"column:id;primaryKey;autoIncrement:false"` // NanoID 主键
	Name     string  `gorm:"column:name"`
	ParentID *string `gorm:"column:parent_id"` // 父节点直接使用 NanoID，根目录为空
}
