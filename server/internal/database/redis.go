package database

import "github.com/redis/go-redis/v9"

func NewRedisClient() *redis.Client {
	return redis.NewClient(&redis.Options{
      Addr:     "127.0.0.1:6379",
      Password: "",
      DB:       0, // 使用默认DB
   })
}