package service

import (
	"errors"
	"fmt"

	"zhiye/server/internal/utils"
)

var (
	// 上传校验错误保留共同类别，同时允许按具体原因进行 errors.Is 判断。
	ErrArticleValidation       = errors.New("文章参数不符合要求")
	ErrArticleInvalidID        = fmt.Errorf("%w: 文章标识不能为空", ErrArticleValidation)
	ErrArticleEmptyImage       = fmt.Errorf("%w: 图片不能为空", ErrArticleValidation)
	ErrArticleImageTooLarge    = fmt.Errorf("%w: 单张图片不能超过 10MB", ErrArticleValidation)
	ErrArticleUnsupportedImage = fmt.Errorf("%w: 只允许 JPEG、PNG、GIF、WebP 图片", ErrArticleValidation)
	ErrArticleCorruptImage     = fmt.Errorf("%w: 图片内容无效", ErrArticleValidation)
	ErrArticleImageOpenFailed  = errors.New("打开上传图片失败")
	ErrArticleImageReadFailed  = errors.New("读取上传图片失败")

	ErrInvalidDirectoryID = errors.New("目录标识不能为空")
	ErrInvalidResourceID  = errors.New("资源标识不能为空")
	ErrInvalidName        = errors.New("名称不能为空或过长")
	ErrNotPublished       = errors.New("本文仍未发布")
	ErrCDNPostFailed      = errors.New("上传图片到 CDN 失败")

	// 重命名时资源可能已经被删除，单独给出可用于映射 404 的业务错误。
	ErrArticleNotFound = errors.New("文章不存在")
	ErrFolderNotFound  = errors.New("文件夹不存在")

	ErrCodeActive  = errors.New("当前用户的验证码尚未过期")
	ErrInvalidCode = errors.New("验证码已过期或不存在")
	ErrWrongCode   = errors.New("验证码有误")
	ErrRateLimit   = errors.New("验证过于频繁")
)

// 工具只返回校验结果，业务层在这里统一赋予错误类别和提示含义。
var articleValidationErrors = map[utils.ArticleValidationIssue]error{
	utils.ArticleInvalidID:        ErrArticleInvalidID,
	utils.ArticleEmptyImage:       ErrArticleEmptyImage,
	utils.ArticleImageTooLarge:    ErrArticleImageTooLarge,
	utils.ArticleUnsupportedImage: ErrArticleUnsupportedImage,
	utils.ArticleCorruptImage:     ErrArticleCorruptImage,
	utils.ArticleImageOpenFailed:  ErrArticleImageOpenFailed,
	utils.ArticleImageReadFailed:  ErrArticleImageReadFailed,
}
