package model

import "time"

// Users 对应 users 用户表。
type Users struct {
	ID           uint64     `gorm:"column:id;primaryKey"`   // 用户主键
	OpenID       string     `gorm:"column:openid" json:"-"` // 微信 openid，不返回给前端
	Name         string     `gorm:"column:name"`            // 昵称，初始为16位随机字符串
	Role         string     `gorm:"column:role;default:user"`            // 用户角色：admin 或 user
	CreatedAt    time.Time  `gorm:"column:created_at"`      // 创建时间
	LastActiveAt *time.Time `gorm:"column:last_active_at"`  // 最后活跃时间，建议节流更新，nil 表示尚未记录
}
