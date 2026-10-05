package errType

import "errors"

var (
	CodeIsNotExpire = errors.New("code is not expire")
	CodeIsNotExists = errors.New("验证码已过期或不存在")
	CodeIsWrong = errors.New("验证码错误")
)