package repository

import (
	"errors"
	"fmt"

	"zhiye/server/internal/apperr"
)

var (
	ErrArticleNotFound = errors.New("找不到对应id的文章")
	ErrFolderNotFound  = errors.New("找不到对应id的文件夹")
	ErrUserNotFound    = errors.New("找不到对应id的用户")
)

// wrapMySQLError 给存储错误补上操作名和统一哨兵，同时保留底层错误链。
// 调用方仍可用 errors.Is 判断 apperr.MySQLError，日志里也能看到具体原因。
func wrapMySQLError(operation string, err error) error {
	return fmt.Errorf("%s: %w: %w", operation, apperr.MySQLError, err)
}
