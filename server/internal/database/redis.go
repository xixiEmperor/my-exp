package database

import "github.com/redis/go-redis/v9"

// NewRedisClient 创建连接池；实际连通性由入口通过 Ping 检查。
func NewRedisClient(addr, password string) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0, // 使用默认DB
	})
}
