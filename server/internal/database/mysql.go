package database

import (
	"fmt"
	"time"

	"zhiye/server/internal/logger"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// NewMySQLClient 只负责连接数据库，连接信息和慢查询阈值由入口传入。
func NewMySQLClient(dsn string, slowQueryThreshold time.Duration) (*gorm.DB, error) {
	// 所有数据库诊断进入统一日志，只记录超过阈值的慢查询。
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{Logger: logger.NewGORM(slowQueryThreshold)})
	if err != nil {
		// 把失败原因交给调用方，数据库包不决定整个进程是否退出。
		return nil, fmt.Errorf("连接 MySQL: %w", err)
	}

	return db, nil
}
