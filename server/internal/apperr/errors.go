package apperr

import "errors"

// 这里只放基础设施错误，业务错误统一放在 service 包，
// 由 service 在理解存储层结果之后决定用哪个。
var (
	RedisError = errors.New("Redis 内部错误")
	MySQLError = errors.New("MySQL 内部错误")
)