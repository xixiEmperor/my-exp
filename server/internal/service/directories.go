package service

import (
	"strings"
	"unicode/utf8"
)

// maxResourceNameLength 与数据库名称字段的 VARCHAR(255) 保持一致。
const maxResourceNameLength = 255

// normalizeDirectoryID 只转换请求中的目录标识，不访问任何资源仓库。
func normalizeDirectoryID(id string) (*string, error) {
	// 缺少目录不能默认为根目录，避免把非法请求写到错误的位置。
	if strings.TrimSpace(id) == "" {
		return nil, ErrInvalidDirectoryID
	}
	// root 是前端的虚拟目录，数据库关联字段统一使用 NULL。
	if id == "root" {
		return nil, nil
	}
	return &id, nil
}

// normalizeResourceName 校验并整理文章标题、文件夹名称这类用户输入的名称。
func normalizeResourceName(name string) (string, error) {
	// 前后的空白字符不算名称的一部分，去掉后仍然为空就视为非法。
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "", ErrInvalidName
	}
	// 按字符数判断长度，避免中文名称被字节长度误判。
	if utf8.RuneCountInString(trimmed) > maxResourceNameLength {
		return "", ErrInvalidName
	}
	return trimmed, nil
}
