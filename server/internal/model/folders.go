package model

import "time"

// Folders 对应 folders 文件夹表。
type Folders struct {
	ID        uint64    `gorm:"column:id;primaryKey"` // 文件夹主键
	Name      string    `gorm:"column:name"`          // 文件夹名称
	PublicID  string    `gorm:"column:public_id"`     // 文件夹真正的ID（nanoid）
	ParentID  *uint64   `gorm:"column:parent_id"`     // 父文件夹 id，nil 表示根目录
	SortOrder int32     `gorm:"column:sort_order"`    // 手动排序
	CreatedAt time.Time `gorm:"column:created_at"`    // 创建时间
}

type FolderBrief struct {
	PublicID string  `gorm:"column:public_id"`
	Name     string  `gorm:"column:name"`
	ParentID *uint64 `gorm:"column:parent_id"`
}
