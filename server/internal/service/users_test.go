package service

import (
	"database/sql/driver"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-sql-driver/mysql"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
	"zhiye/server/internal/repository"
)

// 随机昵称仍需符合现有的 16 位十六进制约定。
type randomUserName struct{}

func (randomUserName) Match(value driver.Value) bool {
	name, ok := value.(string)
	if !ok || len(name) != 16 {
		return false
	}
	_, err := hex.DecodeString(name)
	return err == nil
}

// 使用真实 service 和 repository，通过 SQL 参数验证角色确实写入数据库。
func newTestUsersService(t *testing.T, adminOpenID string) (*UsersService, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{Conn: db, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
	if err != nil {
		t.Fatal(err)
	}
	return NewUsersService(repository.NewUsersRepo(gormDB), adminOpenID), mock
}

// 管理员精确匹配、普通用户、未配置管理员和大小写不同分别验证。
func TestRegistrationRole(t *testing.T) {
	for _, tt := range []struct{ name, admin, openid, role string }{
		{"管理员首次注册", "owner-openid", "owner-openid", "admin"},
		{"普通用户首次注册", "owner-openid", "other-openid", "user"},
		{"未配置管理员", "", "owner-openid", "user"},
		{"大小写不相同", "Owner-openid", "owner-openid", "user"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			svc, mock := newTestUsersService(t, tt.admin)
			mock.ExpectQuery("SELECT .* FROM .users. WHERE openid = \\? LIMIT \\?").WithArgs(tt.openid, 1).
				WillReturnRows(sqlmock.NewRows([]string{"id", "openid", "name", "role"}))
			mock.ExpectBegin()
			mock.ExpectExec("INSERT INTO .users.").WithArgs(tt.openid, randomUserName{}, tt.role, sqlmock.AnyArg(), sqlmock.AnyArg()).
				WillReturnResult(sqlmock.NewResult(1, 1))
			mock.ExpectCommit()
			user, err := svc.FindOrCreateUser(t.Context(), tt.openid)
			if err != nil || user == nil || user.Role != tt.role || user.ID != 1 {
				t.Fatalf("注册角色不正确: %+v, %v", user, err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

// 已有用户不重新注册；配置只决定新用户的初始角色。
func TestExistingUserKeepsRole(t *testing.T) {
	svc, mock := newTestUsersService(t, "owner-openid")
	mock.ExpectQuery("SELECT .* FROM .users. WHERE openid = \\? LIMIT \\?").WithArgs("owner-openid", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "openid", "name", "role"}).AddRow(1, "owner-openid", "原昵称", "user"))
	user, err := svc.FindOrCreateUser(t.Context(), "owner-openid")
	if err != nil || user == nil || user.Role != "user" || user.Name != "原昵称" {
		t.Fatalf("已有资料不应被重写: %+v, %v", user, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

// 数据库查询失败不能被当成首次注册，也不能继续创建管理员。
func TestRegistrationLookupFailure(t *testing.T) {
	svc, mock := newTestUsersService(t, "owner-openid")
	failure := errors.New("数据库不可用")
	mock.ExpectQuery("SELECT .* FROM .users.").WillReturnError(failure)
	_, err := svc.FindOrCreateUser(t.Context(), "owner-openid")
	if !errors.Is(err, failure) {
		t.Fatalf("查询异常被丢弃: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

// 并发注册发生唯一索引冲突时，读取已保存的实际资料，不覆盖它。
func TestRegistrationDuplicateReadsSavedRole(t *testing.T) {
	svc, mock := newTestUsersService(t, "owner-openid")
	mock.ExpectQuery("SELECT .* FROM .users.").WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO .users.").WithArgs("owner-openid", randomUserName{}, "admin", sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnError(&mysql.MySQLError{Number: 1062, Message: "duplicate"})
	mock.ExpectRollback()
	mock.ExpectQuery("SELECT .* FROM .users.").WithArgs("owner-openid", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "openid", "name", "role", "created_at"}).AddRow(1, "owner-openid", "已注册昵称", "admin", time.Now()))
	user, err := svc.FindOrCreateUser(t.Context(), "owner-openid")
	if err != nil || user == nil || user.Role != "admin" || user.Name != "已注册昵称" {
		t.Fatalf("并发注册资料不正确: %+v, %v", user, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
