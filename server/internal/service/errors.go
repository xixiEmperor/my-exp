package service

import "errors"

var (
	// 业务错误与业务服务放在一起，调用方使用 errors.Is 判断。
	ErrCodeActive  = errors.New("当前用户的验证码尚未过期")
	ErrInvalidCode = errors.New("验证码已过期或不存在")
)
