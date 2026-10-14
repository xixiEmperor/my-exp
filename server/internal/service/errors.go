package service

import "errors"

var (
	// 业务错误与业务服务放在一起，调用方使用 errors.Is 判断。
	ErrCodeActive  = errors.New("当前用户的验证码尚未过期")
	ErrInvalidCode = errors.New("验证码已过期或不存在")
	// ErrWrongCode 表示验证码存在但填错了，还允许继续尝试。
	ErrWrongCode = errors.New("验证码有误")
	// ErrRateLimit 表示同一个验证码失败次数用尽，不再接受尝试。
	ErrRateLimit = errors.New("验证过于频繁")
)
