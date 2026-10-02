package repository

import (
	"gorm.io/gorm"
)

// 声明一个Users表相关的结构体，后续在上面挂载Users相关的数据库操作方法
type UsersRepo struct {
	db *gorm.DB
}

// 返回
func NewUsersRepo(db *gorm.DB) *UsersRepo {
	return &UsersRepo{db: db}
}