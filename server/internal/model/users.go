package model

import "time"

type Users struct {
	ID        uint32    `gorm:"column:id;primaryKey"`
	Name      string    `gorm:"column:name"`
	OpenID    string    `gorm:"column:open_id"`
	Role      string    `gorm:"column:role"`
	CreatedAt time.Time `gorm:"column:created_at"`
	LastActiveAt time.Time `gorm:"colume:last_active_at"`
}