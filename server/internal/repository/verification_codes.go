package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// ConsumeStatus 描述一次验证码消费在存储层看到的结果。
type ConsumeStatus int

const (
	// ConsumeMissing 表示键不存在，验证码从未生成或已经过期。
	ConsumeMissing ConsumeStatus = iota
	// ConsumeMatched 表示验证码一致，本次调用已经把它删除。
	ConsumeMatched
	// ConsumeMismatched 表示验证码不一致，失败次数已经累加。
	ConsumeMismatched
)

// ConsumeResult 是一次消费的存储层事实，不含限流阈值之类的业务规则。
type ConsumeResult struct {
	Status  ConsumeStatus
	Openid  string
	Attempt int
}

// VerificationCodes 管理验证码的两个索引，service 不需要了解 Redis 命令。
// 这里只回答"存了什么、取到了什么"，验证码对不对、算不算超限由 service 判断。
type VerificationCodes struct {
	client *redis.Client
}

func NewVerificationCodes(client *redis.Client) *VerificationCodes {
	return &VerificationCodes{client: client}
}

// loginKey 统一拼接键名，避免调用方各自拼前缀导致键对不上。
func loginKey(loginId string) string {
	return "login:" + loginId
}

// saveScript 在一次往返里完成"已存在就放弃，不存在才写入并设过期"。
// 拆成 Exists 再 HSet 会留下窗口，两个并发请求可能都判定不存在然后各写一份。
var saveScript = redis.NewScript(`
if redis.call('EXISTS', KEYS[1]) == 1 then
	return 0
end
redis.call('HSET', KEYS[1], 'code', ARGV[1], 'openid', ARGV[2], 'attempt', 0)
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`)

// SaveIfAbsent 只在 loginId 还没有有效验证码时写入，返回是否写入成功。
func (r *VerificationCodes) SaveIfAbsent(ctx context.Context, loginId, openid, code string, ttl time.Duration) (bool, error) {
	// 用毫秒让有效期保持原样，避免取整时被截短。
	millis := ttl.Milliseconds()

	n, err := saveScript.Run(ctx, r.client, []string{loginKey(loginId)}, code, openid, millis).Int()
	if err != nil {
		return false, err
	}

	return n == 1, nil
}

// consumeScript 原子地取出并处理验证码。
// 命中就删除键并交出 openid，不命中就累加失败次数并交回累加后的值。
// 比对和计数放在同一个脚本里，保证两个并发请求不会都读到同一个 attempt。
var consumeScript = redis.NewScript(`
local data = redis.call('HGETALL', KEYS[1])
if #data == 0 then
	return {0}
end

local code = ''
local openid = ''
local attempt = 0
for i = 1, #data, 2 do
	local field = data[i]
	if field == 'code' then
		code = data[i + 1]
	elseif field == 'openid' then
		openid = data[i + 1]
	elseif field == 'attempt' then
		attempt = tonumber(data[i + 1])
	end
end

if code == ARGV[1] then
	redis.call('DEL', KEYS[1])
	return {1, openid, attempt}
end

local current = redis.call('HINCRBY', KEYS[1], 'attempt', 1)
return {2, '', current}
`)

// Consume 校验并消费验证码，只返回存储层事实，怎么提示用户由 service 决定。
func (r *VerificationCodes) Consume(ctx context.Context, loginId, code string) (ConsumeResult, error) {
	values, err := consumeScript.Run(ctx, r.client, []string{loginKey(loginId)}, code).Slice()
	if err != nil {
		return ConsumeResult{}, err
	}

	// Lua 返回的数值经过 go-redis 转换后是 int64。
	status, _ := values[0].(int64)
	switch status {
	case 0:
		return ConsumeResult{Status: ConsumeMissing}, nil
	case 1:
		openid, _ := values[1].(string)
		return ConsumeResult{Status: ConsumeMatched, Openid: openid}, nil
	default:
		attempt, _ := values[2].(int64)
		return ConsumeResult{Status: ConsumeMismatched, Attempt: int(attempt)}, nil
	}
}
