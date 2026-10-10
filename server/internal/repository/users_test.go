package repository

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	driver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestCreateUser(t *testing.T) {
	for _, conflict := range []bool{false, true} {
		name := "正常插入不再查询"
		if conflict {
			name = "并发冲突返回已保存的资料"
		}
		t.Run(name, func(t *testing.T) {
			// 模拟 SQL 返回结果，不连接本地 MySQL，也不会创建真实用户。
			sqlDB, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { sqlDB.Close() })
			db, err := gorm.Open(mysql.New(mysql.Config{Conn: sqlDB, SkipInitializeWithVersion: true}), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}
			mock.ExpectBegin()
			insert := mock.ExpectExec("INSERT INTO `users`")
			wantName, wantRole := "新昵称", "user"
			if conflict {
				insert.WillReturnError(&driver.MySQLError{Number: 1062, Message: "duplicate openid"})
				mock.ExpectRollback()
				wantName, wantRole = "已有昵称", "admin"
				// 已有记录可能被用户编辑过，不能用本次构造的默认资料代替。
				mock.ExpectQuery("SELECT .* FROM `users`").WithArgs("openid-1", 1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "openid", "name", "role", "created_at"}).
						AddRow(42, "openid-1", wantName, wantRole, time.Now()))
			} else {
				insert.WillReturnResult(sqlmock.NewResult(42, 1))
				mock.ExpectCommit()
				// 不安排 SELECT，出现多余查询时测试会失败。
			}
			user, err := NewUsersRepo(db).CreateUser(context.Background(), "openid-1", "新昵称")
			if err != nil {
				t.Fatal(err)
			}
			if user.ID != 42 || user.OpenID != "openid-1" || user.Name != wantName || user.Role != wantRole || user.CreatedAt.IsZero() {
				t.Fatalf("返回的用户资料不正确: %+v", user)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
