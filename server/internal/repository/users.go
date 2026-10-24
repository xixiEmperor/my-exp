package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"zhiye/server/internal/model"

	"github.com/go-sql-driver/mysql"
	"gorm.io/gorm"
)

// 声明一个Users表相关的结构体，后续在上面挂载Users相关的数据库操作方法
type UsersRepo struct {
	db *gorm.DB
}

// 创建一个 user 数据库实例
func NewUsersRepo(db *gorm.DB) *UsersRepo {
	return &UsersRepo{db: db}
}

// 根据 openid 查找用户 id，用于 jwt 载荷
// 返回完整用户，调用方既能取 ID 签发令牌，也能复用昵称等资料。
func (u *UsersRepo) FindUserByOpenID(ctx context.Context, openid string) (*model.Users, error) {
	// WithContext 让数据库查询响应请求取消；仅接收标准库类型，不依赖 Gin。
	var user model.Users
	err := u.db.WithContext(ctx).Where("openid = ?", openid).Take(&user).Error
	if err != nil {
		// 保留原始错误，调用方才能区分记录不存在与数据库故障。
		return nil, fmt.Errorf("根据 openid 查询用户: %w", err)
	}
	return &user, nil
}

// 根据 id 查找用户信息
// 返回完整用户，调用方既能取 ID 签发令牌，也能复用昵称等资料。
func (u *UsersRepo) FindUserByID(ctx context.Context, id uint64) (*model.Users, error) {
	// WithContext 让数据库查询响应请求取消；仅接收标准库类型，不依赖 Gin。
	var user model.Users
	err := u.db.WithContext(ctx).Where("id = ?", id).Take(&user).Error
	if err != nil {
		// 保留原始错误，调用方才能区分记录不存在与数据库故障。
		return nil, fmt.Errorf("根据 id 查询用户: %w", err)
	}
	return &user, nil
}

// 创建一个新用户
func (u *UsersRepo) CreateUser(ctx context.Context, openid, name string) (*model.Users, error) {
	now := time.Now()

	user := model.Users{
		OpenID: openid,
		Name:   name,
		// 显式设置角色，避免 GORM 写入空字符串覆盖数据库默认值。
		Role:         "user",
		LastActiveAt: &now,
	}

	// openid 的唯一索引负责防止并发请求创建重复用户。
	// 冲突时不覆盖已有资料，随后统一查询最终的用户 ID。
	// 现在仅在唯一索引冲突时查询已有用户，并返回完整资料。
	// 正常插入时 GORM 会回填自增 ID 和 CreatedAt，可直接复用当前结构体。
	res := u.db.WithContext(ctx).Create(&user)
	if res.Error != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(res.Error, &mysqlErr) && mysqlErr.Number == 1062 {
			// 并发请求可能已经创建了同一 openid，必须读取实际保存的资料。
			return u.FindUserByOpenID(ctx, openid)
		}
		return nil, fmt.Errorf("创建用户: %w", res.Error)
	}
	return &user, nil
}
