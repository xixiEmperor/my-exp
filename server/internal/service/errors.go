package service

import "errors"

var (
	ErrInvalidDirectoryID = errors.New("目录标识不能为空")
	ErrInvalidResourceID  = errors.New("资源标识不能为空")
	ErrInvalidName        = errors.New("名称不能为空或过长")
	ErrNotPublished       = errors.New("本文仍未发布")

	// 重命名时资源可能已经被删除，单独给出可用于映射 404 的业务错误。
	ErrArticleNotFound = errors.New("文章不存在")
	ErrFolderNotFound  = errors.New("文件夹不存在")

	ErrCodeActive  = errors.New("当前用户的验证码尚未过期")
	ErrInvalidCode = errors.New("验证码已过期或不存在")
	ErrWrongCode   = errors.New("验证码有误")
	ErrRateLimit   = errors.New("验证过于频繁")
)
