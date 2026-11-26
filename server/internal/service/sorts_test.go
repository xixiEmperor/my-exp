package service

import (
	"context"
	"errors"
	"testing"

	"zhiye/server/internal/repository"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newTestFoldersService(t *testing.T) (*FoldersService, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	db, err := gorm.Open(
		mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}),
		&gorm.Config{DisableAutomaticPing: true},
	)
	if err != nil {
		t.Fatal(err)
	}

	return NewFoldersService(repository.NewFoldersRepo(db)), mock
}

func TestFoldersServiceSortChildrenValidation(t *testing.T) {
	svc, _ := newTestFoldersService(t)

	tests := []struct {
		name       string
		parentID   string
		folderIDs  []string
		articleIDs []string
		want       error
	}{
		{name: "空父目录", parentID: " ", want: ErrInvalidDirectoryID},
		{name: "空文件夹ID", parentID: "root", folderIDs: []string{""}, want: ErrInvalidResourceID},
		{name: "文件夹ID为root", parentID: "root", folderIDs: []string{"root"}, want: ErrInvalidResourceID},
		{name: "重复文件夹ID", parentID: "root", folderIDs: []string{"f1", "f1"}, want: ErrDuplicateSortID},
		{name: "空文章ID", parentID: "root", articleIDs: []string{"  "}, want: ErrInvalidResourceID},
		{name: "重复文章ID", parentID: "root", articleIDs: []string{"a1", "a1"}, want: ErrDuplicateSortID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := svc.SortChildren(context.Background(), tt.parentID, tt.folderIDs, tt.articleIDs)
			if !errors.Is(err, tt.want) {
				t.Fatalf("错误 = %v，期望 %v", err, tt.want)
			}
		})
	}
}

func TestFoldersServiceSortChildrenConflictMapping(t *testing.T) {
	svc, mock := newTestFoldersService(t)

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT .* FROM .folders. ORDER BY id FOR UPDATE").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "parent_id"}).
			AddRow("f1", "目录1", nil))
	mock.ExpectRollback()

	err := svc.SortChildren(context.Background(), "root", []string{"f1", "f2"}, nil)
	if !errors.Is(err, ErrSortConflict) {
		t.Fatalf("错误 = %v，期望 ErrSortConflict", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
