package repository

import "errors"

var (
	ErrArticleNotFound = errors.New("找不到对应id的文章")
	ErrFolderNotFound  = errors.New("找不到对应id的文件夹")
)
