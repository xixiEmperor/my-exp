package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// VerificationCodes 管理验证码的两个索引，service 不需要了解 Redis 命令。
type VerificationCodes struct {
	client *redis.Client
}

func NewVerificationCodes(client *redis.Client) *VerificationCodes {
	return &VerificationCodes{client: client}
}

// Lua 脚本让检查与写入一次完成，避免并发请求只写成功一个索引。
// 返回 1 表示成功，0 表示用户已有验证码，-1 表示随机验证码碰撞。
var saveCode = redis.NewScript(`
-- 先检查用户索引，防止同一用户同时获得多个验证码。
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
-- 不覆盖其他用户的验证码，调用方遇到碰撞后重新生成。
if redis.call('EXISTS', KEYS[2]) == 1 then return -1 end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'PX', ARGV[3])
return 1
`)

func (r *VerificationCodes) Save(ctx context.Context, openid, code string, ttl time.Duration) (int, error) {
	// 业务前缀避免 openid、验证码与其他功能使用相同 Redis 键名。
	return saveCode.Run(ctx, r.client, []string{
		"auth:openid:" + openid, "auth:code:" + code,
	}, code, openid, ttl.Milliseconds()).Int()
}

// 在同一个原子操作内消费验证码并删除用户索引，防止重复使用。
var consumeCode = redis.NewScript(`
local openid = redis.call('GET', KEYS[1])
if not openid then return false end
redis.call('DEL', KEYS[1])
-- 只删除仍指向当前验证码的用户索引，避免误删更新后的记录。
local userkey = 'auth:openid:' .. openid
if redis.call('GET', userkey) == ARGV[1] then
    redis.call('DEL', userkey)
end
return openid
`)

func (r *VerificationCodes) Consume(ctx context.Context, code string) (string, error) {
	// 此处使用项目当前的单机 Redis，脚本没有按 Redis Cluster 设计。
	return consumeCode.Run(ctx, r.client, []string{"auth:code:" + code}, code).Text()
}
