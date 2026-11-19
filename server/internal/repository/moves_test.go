package repository

import (
	"context"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"testing"
)

// TestMoveFolder 验证循环拦截、目标不存在、同目录和根目录重名移动。
func TestMoveFolder(t *testing.T) {
	rootTarget := "target"
	for _, tt := range []struct {
		name   string
		target *string
		want   error
		update bool
	}{
		{name: "移入自身", target: stringPointer("source"), want: ErrInvalidMove},
		{name: "移入子目录", target: &rootTarget, want: ErrInvalidMove},
		{name: "目标不存在", target: stringPointer("missing"), want: ErrFolderNotFound},
		{name: "当前目录"},
		{name: "移动根目录并编号", update: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			articleRepo, mock := newTestArticlesRepo(t)
			repo := NewFoldersRepo(articleRepo.db)
			mock.ExpectBegin()
			rows := sqlmock.NewRows([]string{"id", "name", "parent_id"}).
				AddRow("source", "资料", nil).AddRow("target", "子目录", "source")
			if tt.update {
				rows = sqlmock.NewRows([]string{"id", "name", "parent_id"}).
					AddRow("source", "资料", "target").AddRow("target", "目标", nil).AddRow("other", "资料", nil)
			}
			mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").WillReturnRows(rows)
			if tt.update {
				// 根目录必须写入 NULL，且名称在更新时一起保存。
				mock.ExpectExec("UPDATE .folders. SET .name.=\\?,.parent_id.=\\? WHERE id = \\?").
					WithArgs("资料（1）", nil, "source").WillReturnResult(sqlmock.NewResult(0, 1))
			}
			if tt.want != nil {
				mock.ExpectRollback()
			} else {
				mock.ExpectCommit()
			}
			moved, err := repo.MoveFolder(context.Background(), "source", tt.target)
			if !errors.Is(err, tt.want) {
				t.Fatalf("错误 = %v，期望 %v", err, tt.want)
			}
			if tt.update && (moved.ParentID != nil || moved.Name != "资料（1）") {
				t.Fatalf("移动响应不正确：%+v", moved)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

// stringPointer 为测试构造目录标识。
func stringPointer(value string) *string { return &value }

// TestMoveArticleRoot 验证文章仓库接收根目录并保留软删除过滤。
func TestMoveArticleRoot(t *testing.T) {
	repo, mock := newTestArticlesRepo(t)
	mock.ExpectBegin()
	mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).AddRow("folder", "目录", nil))
	mock.ExpectQuery("SELECT .* FROM .articles. WHERE .* FOR UPDATE").WithArgs("article", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "folder_id"}).AddRow("article", "文章", "folder"))
	mock.ExpectQuery("SELECT .title. FROM .articles. WHERE id <> \\? AND folder_id IS NULL AND .articles...deleted_at. IS NULL").
		WithArgs("article").WillReturnRows(sqlmock.NewRows([]string{"title"}))
	mock.ExpectExec("UPDATE .articles. SET .* WHERE id = \\? AND .articles...deleted_at. IS NULL").
		WithArgs(nil, "文章", sqlmock.AnyArg(), "article").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	moved, err := repo.MoveArticle(context.Background(), "article", nil)
	if err != nil {
		t.Fatal(err)
	}
	if moved.FolderID != nil {
		t.Fatal("根目录应返回 nil")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
