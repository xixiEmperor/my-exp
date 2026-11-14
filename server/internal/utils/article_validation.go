package utils

import (
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"

	cons "zhiye/server/internal/constant"

	_ "golang.org/x/image/webp"
)

// ArticleValidationIssue 只描述校验结果，业务错误和对外提示由 service 决定。
type ArticleValidationIssue int

const (
	ArticleValid ArticleValidationIssue = iota
	ArticleInvalidID
	ArticleEmptyImage
	ArticleImageTooLarge
	ArticleUnsupportedImage
	ArticleCorruptImage
	ArticleImageOpenFailed
	ArticleImageReadFailed
)

// validateArticleUpdate 在任何上传和写库前检查整批输入，避免部分文件先上传。
// 不访问业务依赖，只返回校验结果和底层读取异常。
func ValidateArticleUpdate(
	id string,
	images map[string]*multipart.FileHeader,
) (ArticleValidationIssue, error) {
	if id == "" {
		return ArticleInvalidID, nil
	}
	for _, header := range images {
		if header == nil || header.Size <= 0 {
			return ArticleEmptyImage, nil
		}
		if header.Size > cons.MaxImageBytes {
			return ArticleImageTooLarge, nil
		}
		file, err := header.Open()
		if err != nil {
			return ArticleImageOpenFailed, err
		}
		_, issue, err := ImageContentType(file)
		file.Close()
		if issue != ArticleValid {
			return issue, err
		}
	}
	return ArticleValid, nil
}

// imageContentType 根据文件签名与可解码的图片头判断类型，不信任文件名或请求 MIME。
// ImageContentType 接收标准读取接口，可供不同上传流程复用。
func ImageContentType(file io.ReadSeeker) (string, ArticleValidationIssue, error) {
	var prefix [512]byte
	n, err := io.ReadFull(file, prefix[:])
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", ArticleImageReadFailed, err
	}
	mime := http.DetectContentType(prefix[:n])
	switch mime {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
	default:
		return "", ArticleUnsupportedImage, nil
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", ArticleImageReadFailed, err
	}
	if _, _, err := image.DecodeConfig(file); err != nil {
		return "", ArticleCorruptImage, err
	}
	// 检查后恢复流位置，后续上传必须包含完整文件内容。
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", ArticleImageReadFailed, err
	}
	return mime, ArticleValid, nil
}
