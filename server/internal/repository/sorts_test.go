package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestSortChildren(t *testing.T) {
	t.Run("根目录正常排序", func(t *testing.T) {
		articleRepo, mock := newTestArticlesRepo(t)
		repo := NewFoldersRepo(articleRepo.db)

		mock.ExpectBegin()
		mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
				AddRow("f1", "目录1", nil).
				AddRow("f2", "目录2", nil).
				AddRow("child", "子目录", "f1"))
		mock.ExpectQuery("SELECT .id. FROM .articles. WHERE folder_id IS NULL AND .articles...deleted_at. IS NULL ORDER BY id FOR UPDATE").
			WillReturnRows(sqlmock.NewRows([]string{"id"}).
				AddRow("a1").
				AddRow("a2"))
		mock.ExpectExec("UPDATE .folders. SET .sort_order.=CASE id WHEN \\? THEN \\? WHEN \\? THEN \\? END WHERE id IN \\(\\?,\\?\\)").
			WithArgs("f2", 0, "f1", 1, "f2", "f1").
			WillReturnResult(sqlmock.NewResult(0, 2))
		mock.ExpectExec("UPDATE .articles. SET .sort_order.=CASE id WHEN \\? THEN \\? WHEN \\? THEN \\? END WHERE id IN \\(\\?,\\?\\) AND .articles...deleted_at. IS NULL").
			WithArgs("a2", 0, "a1", 1, "a2", "a1").
			WillReturnResult(sqlmock.NewResult(0, 2))
		mock.ExpectCommit()

		if err := repo.SortChildren(context.Background(), nil, []string{"f2", "f1"}, []string{"a2", "a1"}); err != nil {
			t.Fatalf("期望排序成功，实际错误 = %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("子目录不存在返回 ErrFolderNotFound", func(t *testing.T) {
		articleRepo, mock := newTestArticlesRepo(t)
		repo := NewFoldersRepo(articleRepo.db)

		mock.ExpectBegin()
		mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
				AddRow("f1", "目录1", nil))
		mock.ExpectRollback()

		err := repo.SortChildren(context.Background(), stringPointer("missing"), []string{}, []string{})
		if !errors.Is(err, ErrFolderNotFound) {
			t.Fatalf("错误 = %v，期望 ErrFolderNotFound", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("文件夹集合不一致返回 ErrSortConflict", func(t *testing.T) {
		articleRepo, mock := newTestArticlesRepo(t)
		repo := NewFoldersRepo(articleRepo.db)

		mock.ExpectBegin()
		mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
				AddRow("f1", "目录1", nil).
				AddRow("f2", "目录2", nil))
		mock.ExpectRollback()

		err := repo.SortChildren(context.Background(), nil, []string{"f1"}, []string{})
		if !errors.Is(err, ErrSortConflict) {
			t.Fatalf("错误 = %v，期望 ErrSortConflict", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("文章集合不一致返回 ErrSortConflict", func(t *testing.T) {
		articleRepo, mock := newTestArticlesRepo(t)
		repo := NewFoldersRepo(articleRepo.db)

		mock.ExpectBegin()
		mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
			WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
				AddRow("parent", "父目录", nil))
		mock.ExpectQuery("SELECT .id. FROM .articles. WHERE folder_id = \\? AND .articles...deleted_at. IS NULL ORDER BY id FOR UPDATE").
			WithArgs("parent").
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("a1").AddRow("a2"))
		mock.ExpectRollback()

		err := repo.SortChildren(context.Background(), stringPointer("parent"), []string{}, []string{"a1", "a3"})
		if !errors.Is(err, ErrSortConflict) {
			t.Fatalf("错误 = %v，期望 ErrSortConflict", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
	})
}
