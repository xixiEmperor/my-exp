package database

import (
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// NewMySQLClient 只负责连接数据库，连接信息由入口传入。
func NewMySQLClient(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		// 把失败原因交给调用方，数据库包不决定整个进程是否退出。
		return nil, fmt.Errorf("连接 MySQL: %w", err)
	}

	return db, nil
}
