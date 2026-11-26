package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"zhiye/server/internal/apperr"
	"zhiye/server/internal/model"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newTestDemoResourcesRepo(t *testing.T) (*DemoResourcesRepo, sqlmock.Sqlmock) {
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

	return NewDemoResourcesRepo(db), mock
}

func TestCreateDemoResource(t *testing.T) {
	repo, mock := newTestDemoResourcesRepo(t)
	now := time.Now()
	resource := &model.DemoResources{
		ID:             "res123456789012345678",
		Slug:           "virtual-list",
		Name:           "virtual-list",
		Description:    nil,
		Tags:           nil,
		Status:         "draft",
		Implementation: "default",
		Verison:        "1.0.0",
		FilePaths:      []string{"src/index.tsx"},
		ExcludePaths:   []string{"dist/"},
		CreatedAt:      now,
	}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `demos`").
		WithArgs(
			resource.ID,
			resource.Slug,
			resource.Name,
			nil,
			nil,
			resource.Status,
			resource.Implementation,
			resource.Verison,
			`["src/index.tsx"]`,
			`["dist/"]`,
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	if err := repo.CreateDemoResource(context.Background(), resource); err != nil {
		t.Fatalf("CreateDemoResource 失败: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestFindDemoResourceByID(t *testing.T) {
	t.Run("成功", func(t *testing.T) {
		repo, mock := newTestDemoResourcesRepo(t)
		now := time.Now()
		rows := sqlmock.NewRows([]string{
			"id", "slug", "name", "description", "tags", "status",
			"implementation", "verison", "file_paths", "exclude_paths", "created_at",
		}).AddRow(
			"res123456789012345678", "virtual-list", "虚拟列表", nil, `["react"]`, "draft",
			"default", "1.0.0", `["src/index.tsx"]`, nil, now,
		)

		mock.ExpectQuery("SELECT \\* FROM `demos` WHERE id = \\? LIMIT \\?").
			WithArgs("res123456789012345678", 1).
			WillReturnRows(rows)

		got, err := repo.FindDemoResourceByID(context.Background(), "res123456789012345678")
		if err != nil {
			t.Fatalf("FindDemoResourceByID 失败: %v", err)
		}
		if got.Verison != "1.0.0" || got.Name != "虚拟列表" || len(got.FilePaths) != 1 || got.FilePaths[0] != "src/index.tsx" {
			t.Fatalf("查询结果不符合预期: %+v", got)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("不存在", func(t *testing.T) {
		repo, mock := newTestDemoResourcesRepo(t)
		mock.ExpectQuery("SELECT \\* FROM `demos` WHERE id = \\? LIMIT \\?").
			WithArgs("missing", 1).
			WillReturnRows(sqlmock.NewRows([]string{"id"}))

		_, err := repo.FindDemoResourceByID(context.Background(), "missing")
		if !errors.Is(err, ErrDemoResourceNotFound) {
			t.Fatalf("错误 = %v，期望 %v", err, ErrDemoResourceNotFound)
		}
	})
}

func TestFindDemoResourceBySlugAndVerison(t *testing.T) {
	repo, mock := newTestDemoResourcesRepo(t)
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "slug", "name", "description", "tags", "status",
		"implementation", "verison", "file_paths", "exclude_paths", "created_at",
	}).AddRow(
		"res123456789012345678", "virtual-list", "virtual-list", nil, nil, "draft",
		"fixed-height", "1.1.0", `["src/App.tsx"]`, `["web/"]`, now,
	)

	mock.ExpectQuery("SELECT \\* FROM `demos` WHERE slug = \\? AND verison = \\? LIMIT \\?").
		WithArgs("virtual-list", "1.1.0", 1).
		WillReturnRows(rows)

	got, err := repo.FindDemoResourceBySlugAndVerison(context.Background(), "virtual-list", "1.1.0")
	if err != nil {
		t.Fatalf("FindDemoResourceBySlugAndVerison 失败: %v", err)
	}
	if got.Implementation != "fixed-height" || len(got.ExcludePaths) != 1 || got.ExcludePaths[0] != "web/" {
		t.Fatalf("查询结果不符合预期: %+v", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestFindAllDemoResources(t *testing.T) {
	repo, mock := newTestDemoResourcesRepo(t)
	mock.ExpectQuery("SELECT \\* FROM `demos` ORDER BY created_at DESC").
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	got, err := repo.FindAllDemoResources(context.Background())
	if err != nil {
		t.Fatalf("FindAllDemoResources 失败: %v", err)
	}
	if got == nil || len(got) != 0 {
		t.Fatalf("期望返回非 nil 空切片，实际为: %#v", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestDeleteDemoResourceByID(t *testing.T) {
	dbErr := errors.New("数据库不可用")
	for _, tt := range []struct {
		name string
		rows int64
		err  error
		want error
	}{
		{name: "成功", rows: 1},
		{name: "不存在", rows: 0, want: ErrDemoResourceNotFound},
		{name: "数据库失败", err: dbErr, want: apperr.MySQLError},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo, mock := newTestDemoResourcesRepo(t)
			mock.ExpectBegin()
			exec := mock.ExpectExec("DELETE FROM `demos` WHERE id = \\?").WithArgs("res1")
			if tt.err != nil {
				exec.WillReturnError(tt.err)
				mock.ExpectRollback()
			} else {
				exec.WillReturnResult(sqlmock.NewResult(0, tt.rows))
				mock.ExpectCommit()
			}

			err := repo.DeleteDemoResourceByID(context.Background(), "res1")
			if !errors.Is(err, tt.want) {
				t.Fatalf("错误 = %v，期望 %v", err, tt.want)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
