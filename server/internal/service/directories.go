package service

import "strings"

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
