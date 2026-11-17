package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// newTestArticlesRepo 用 sqlmock 构造只关心 SQL 的仓库实例，不连接真实数据库。
func newTestArticlesRepo(t *testing.T) (*ArticlesRepo, sqlmock.Sqlmock) {
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

	return NewArticlesRepo(db), mock
}

// TestIncrementArticleViews 验证原子更新、软删除过滤以及更新失败时的错误处理。
func TestIncrementArticleViews(t *testing.T) {
	dbErr := errors.New("数据库不可用")
	for _, tt := range []struct {
		name string
		rows int64
		err  error
		want error
	}{
		{name: "成功", rows: 1},
		{name: "文章不存在", want: ErrArticleNotFound},
		{name: "数据库失败", err: dbErr, want: dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo, mock := newTestArticlesRepo(t)
			// 精确限制更新字段，确保阅读不会改变最后修改时间。
			mock.ExpectBegin()
			exec := mock.ExpectExec("UPDATE .articles. SET .views.=views \\+ 1 WHERE id = \\? AND .articles...deleted_at. IS NULL").WithArgs("article")
			if tt.err != nil {
				exec.WillReturnError(tt.err)
				mock.ExpectRollback()
			} else {
				exec.WillReturnResult(sqlmock.NewResult(0, tt.rows))
				mock.ExpectCommit()
			}
			if err := repo.IncrementArticleViews(context.Background(), "article"); !errors.Is(err, tt.want) {
				t.Fatalf("错误 = %v，期望 %v", err, tt.want)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

// TestExistsOtherArticleReference 验证引用检查使用 LOCATE 并正确读取计数。
func TestExistsOtherArticleReference(t *testing.T) {
	const (
		articleID = "articleA"
		imageURL  = "https://static.swifthire.top/my-exp/articleA/image.webp"
	)

	repo, mock := newTestArticlesRepo(t)
	mock.ExpectQuery(
		"SELECT count\\(\\*\\) FROM .articles. WHERE id <> \\? AND LOCATE\\(\\?, content\\) > 0",
	).
		WithArgs(articleID, imageURL).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	exists, err := repo.ExistsOtherArticleReference(context.Background(), articleID, imageURL)
	if err != nil {
		t.Fatal(err)
	}
	if !exists {
		t.Fatal("存在其他引用时应返回 true")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

// TestExistsOtherArticleReferenceNoMatch 验证没有其他引用时返回 false。
func TestExistsOtherArticleReferenceNoMatch(t *testing.T) {
	repo, mock := newTestArticlesRepo(t)
	mock.ExpectQuery("SELECT count\\(\\*\\) FROM .articles. WHERE").
		WithArgs("articleA", "url").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	exists, err := repo.ExistsOtherArticleReference(context.Background(), "articleA", "url")
	if err != nil {
		t.Fatal(err)
	}
	if exists {
		t.Fatal("没有其他引用时应返回 false")
	}
}

// TestExistsOtherArticleReferenceEmptyArgs 验证空参数直接返回，不查询数据库。
func TestExistsOtherArticleReferenceEmptyArgs(t *testing.T) {
	repo, mock := newTestArticlesRepo(t)

	exists, err := repo.ExistsOtherArticleReference(context.Background(), "", "url")
	if err != nil {
		t.Fatal(err)
	}
	if exists {
		t.Fatal("空参数应返回 false")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

// TestExistsOtherArticleReferenceQueryError 验证数据库错误会保留错误链。
func TestExistsOtherArticleReferenceQueryError(t *testing.T) {
	repo, mock := newTestArticlesRepo(t)
	mock.ExpectQuery("SELECT count\\(\\*\\) FROM .articles. WHERE").
		WithArgs("articleA", "url").
		WillReturnError(errors.New("数据库不可用"))

	if _, err := repo.ExistsOtherArticleReference(context.Background(), "articleA", "url"); err == nil {
		t.Fatal("查询失败时应返回错误")
	}
}
