package service

import "errors"

var (
	ErrInvalidDirectoryID = errors.New("目录标识不能为空")
	ErrNotPublished       = errors.New("本文仍未发布")

	ErrCodeActive  = errors.New("当前用户的验证码尚未过期")
	ErrInvalidCode = errors.New("验证码已过期或不存在")
	ErrWrongCode   = errors.New("验证码有误")
	ErrRateLimit   = errors.New("验证过于频繁")
)
